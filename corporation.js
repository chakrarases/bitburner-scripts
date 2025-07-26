import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatNumber, getErrorInfo, tail
} from './helpers.js'

//const cities = ["Sector-12", "Aevum", "Volhaven"];
//const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo"];
const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/** @param {NS} ns **/
export async function main(ns) {
	const persistCorpLog = "log.corporation.txt";

	let resetInfo = (/**@returns{ResetInfo}*/() => undefined)(); // Information about the current bitnode
	let bitNodeMults = (/**@returns{BitNodeMultipliers}*/() => undefined)(); // bitNode multipliers that can be automatically determined after SF-5
	let dictOwnedSourceFiles = (/**@returns{{[k: number]: number;}}*/() => [])(); // Player owned source files
	let unlockedSFs = [], nextBn = 0; // Info for the current bitnode
	let homeRam = 0; // Amount of RAM on the home server, last we checked

	/** @param {NS} ns **/
	async function startUp(ns) {
		// Collect and cache some one-time data
		resetInfo = await getNsDataThroughFile(ns, 'ns.getResetInfo()');
		bitNodeMults = await tryGetBitNodeMultipliers(ns);
		dictOwnedSourceFiles = await getActiveSourceFiles(ns, false);
		unlockedSFs = await getActiveSourceFiles(ns, true);
		homeRam = await getNsDataThroughFile(ns, `ns.getServerMaxRam(ns.args[0])`, null, ["home"]);
		//const player = await getPlayerInfo(ns);
	}

	// Replacements for player properties deprecated since 2.3.0
	function getTimeInAug() { return Date.now() - resetInfo.lastAugReset; }
	function getTimeInBitnode() { return Date.now() - resetInfo.lastNodeReset; }

	/** Ram-dodge getting player info.
	 * @param {NS} ns
	 * @returns {Promise<Player>} */
	async function getPlayerInfo(ns) {
		return await getNsDataThroughFile(ns, `ns.getPlayer()`);
	}

	ns.disableLog("disableLog"); ns.disableLog("sleep");

	/** @param {NS} ns **/
	async function main_start(ns) {
		await startUp(ns);
		try {
			if (!(3 in unlockedSFs)) {
				log(ns, `WARNING: This script requires SF3 (corporation) functions to manage the corporation`, true);
				return false;
			}
		} catch (err) {
			if (unlockedSFs[3] || 0 == 3) throw err; // No idea why this failed, treat as temporary and allow auto-retry.
			log(ns, `WARNING: You only have SF3 level ${unlockedSFs[3]}. Without level 3, if buy Werehouse/Office API corp money is not enough `, true);
		}

		while (true) {
			await main_loop(ns);
			await ns.sleep(2 * 1000); //sleep 2 sec
		}
	}

	/** Append the specified text (with timestamp) to a persistent log in the home directory
	 * @param {String} text
	 * @param {NS} ns */
	function persist_log(ns, text) {
		ns.write(persistCorpLog, `${(new Date()).toISOString().substring(0, 19)} ${text}\n`, "a")
	}
	//Debuging and finding the right API
	/** @param {NS} ns **/
	async function main_loop(ns) {
		const player = await getPlayerInfo(ns);
		//log(ns, "");
		//ns.tprint("player.money == " + formatMoney(player.money));
		const useSeedMoney = ns.corporation.canCreateCorporation(false);
		//ns.tprint("useSeedMoney == " + useSeedMoney);
		const useSelfMoney = ns.corporation.canCreateCorporation(true);
		//ns.tprint("useSelfMoney == " + useSelfMoney);
		const hasCorp = ns.corporation.hasCorporation();
		//ns.tprint("hasCorp == " + hasCorp);

		let strFName = "";

		//log(ns, "hasCorp == " + hasCorp);
		if (useSeedMoney == "Success") {
			strFName = "corporation.createCorporation";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, ["Eternity", false]);
			//ns.tprint("Create corp with Seed money => ");
			//log(ns, "Create corp with Seed money => ");
		} else if (useSelfMoney == "Success" && player.money >= 150e9) {
			ns.tprint("Require money == " + formatMoney(150e9));
			//log(ns, "Require money == " + formatMoney(150e9));
			//ns.corporation.createCorporation("Eternity", true);
			strFName = "corporation.createCorporation";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, ["Eternity", true]);
			ns.tprint("Create corp with Self money => ");
			//log(ns, "Create corp with Self money => ");
		} else if (useSelfMoney == "CorporationExists" || useSeedMoney == "CorporationExists") {
			//ns.tprint("CorporationExists => ");
			const corpInfo = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
			//const corpInfo = ns.corporation.getCorporation(); //CorporationInfo
			//ns.tprint("corpInfo.funds          => " + formatMoney(corpInfo.funds));
			//ns.tprint("corpInfo.investorShares => " + corpInfo.investorShares);
			//ns.tprint("corpInfo.divisions      => " + corpInfo.divisions);
			//log(ns, "corpInfo.funds          => " + formatMoney(corpInfo.funds));
			//log(ns, "corpInfo.investorShares => " + formatMoney(corpInfo.investorShares));
			//log(ns, "corpInfo.divisions      => " + corpInfo.divisions);
			if (corpInfo.divisions.length < 1) { //This script control only 1 division
				//if 1st run => start init
				//ns.tprint("Start Init => ");
				const corpConst = ns.corporation.getConstants(); //CorpConstants
				//ns.tprint("corpConst.industryNames => " + corpConst.industryNames);
				//baseProductProfitMult
				//ns.tprint("corpConst.baseProductProfitMult => " + corpConst.baseProductProfitMult);
				//issueNewSharesCooldown
				//ns.tprint("corpConst.issueNewSharesCooldown (cycles) => " + corpConst.issueNewSharesCooldown);
				//ns.tprint("corpConst.issueNewSharesCooldown (ms) => " + corpConst.issueNewSharesCooldown * 1000 / 200);
				//ns.tprint("corpConst.issueNewSharesCooldown (s) => " + corpConst.issueNewSharesCooldown / 200);
				//ns.corporation.expandIndustry(industryType, divisionName);
				//ns.corporation.expandIndustry("");
				//ns.corporation.expandIndustry(ns.args[0])
				//"Agriculture","Agriculture"
				//await runCommand(ns, 'ns.corporation.expandIndustry(ns.args[0],ns.args[1])', null, ["Agriculture", "Agriculture"]);
				strFName = "corporation.expandIndustry";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
					`Temp/${strFName}.arm.txt`, ["Agriculture", "Agriculture"]);
			} else {
				//if 2nd and so on run => re adjust for each stage
				//log(ns, "Re-adjustment Init => ");
				//hasUnlock(upgradeName)
				//Unlock "Smart Supply"
				//ns.corporation.hasUnlock()
				let hasSmartSupply = false;
				//hasSmartSupply = await runCommand(ns, 'ns.corporation.hasUnlock(ns.args[0])',
				// "/Temp/corporation.hasUnlock.arm.js", ["Smart Supply"]);
				hasSmartSupply = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Smart Supply"]);
				//ns.tprint("hasSmartSupply => " + hasSmartSupply);
				if (!hasSmartSupply) {
					//purchaseUnlock(upgradeName)
					strFName = "corporation.purchaseUnlock";
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
						`Temp/${strFName}.arm.txt`, ["Smart Supply"]);
				} else {
					//setSmartSupply = Enabled at Sector-12
					//ns.corporation.setSmartSupply(corpInfo.divisions[0],"Sector-12",true);
					await getNsDataThroughFile(ns, 'ns.corporation.setSmartSupply(ns.args[0],ns.args[1],ns.args[2])||true',
						"Temp/corporation.setSmartSupply.arm.txt", [corpInfo.divisions[0], "Sector-12", true]);
				}

				let hasAPIWH = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Warehouse API"]);
				//log(ns, "hasAPIWH => " + hasAPIWH);
				/* //If we buy API, corp money will not enough to init
				if (!hasAPIWH) {
					//purchaseUnlock(upgradeName)
					await getNsDataThroughFile(ns, 'ns.corporation.purchaseUnlock(ns.args[0])||true',
						"Temp/corporation.purchaseUnlock.arm.txt", ["Warehouse API"]);
				}
				*/
				let hasAPIOF = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Office API"]);
				//log(ns, "hasAPIOF => " + hasAPIOF);

				let cuInvOffer = null;
				strFName = "corporation.getInvestmentOffer"
				cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
				if (cuInvOffer.round == 1) {
					//Smart Storage to Lv2
					await upgradesCorp(ns, "Smart Storage", 2);
				} else if (cuInvOffer.round == 2) {
					//Smart Storage to Lv10
					await upgradesCorp(ns, "Smart Storage", 10);
				}

				//log(ns, "corpInfo.divisions[0] => " + corpInfo.divisions[0]);
				strFName = "corporation.getDivision";
				const divisionInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
					`Temp/${strFName}.arm.txt`, [corpInfo.divisions[0]]); //Division
				//log(ns, "divisionInfo.numAdVerts => " + divisionInfo.numAdVerts);
				//log(ns, "divisionInfo.cities     => " + divisionInfo.cities);
				strFName = "corporation.getHireAdVertCount";
				const numHireAdVertCount = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
					`Temp/${strFName}.arm.txt`, [corpInfo.divisions[0]]); //number
				//log(ns, "numHireAdVertCount => " + numHireAdVertCount);
				if (numHireAdVertCount < 1) {
					strFName = "corporation.hireAdVert";
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
						`Temp/${strFName}.arm.txt`, [corpInfo.divisions[0]]); //number
					//log(ns, "Shoot 1 AdVert => ");
				}
				//ns.tprint("corpInfo.divisions[0].cities[0] => " + corpInfo.divisions[0].cities[0]);
				await initCities(ns, divisionInfo);
				//Warehouse API
				await initWarehouse(ns, divisionInfo);
				//Office API
				await initOffice(ns, divisionInfo);
				await initOfficeParty(ns, divisionInfo);
				//Upgrades following to Lv2 := FocusWires, Neural Accelerators, Speech Processor Implants, Nuoptimal Nootropic Injector Implants
				//await upgradesCorp(ns, upName, up2Lv);
				/*
				await upgradesCorp(ns, "FocusWires", 2);
				await upgradesCorp(ns, "Neural Accelerators", 2);
				await upgradesCorp(ns, "Speech Processor Implants", 2);
				await upgradesCorp(ns, "Nuoptimal Nootropic Injector Implants", 2);
				*/
				await reportProduction(ns, divisionInfo);
				await phaseAdvancing(ns, divisionInfo);
			}
		} else {
			//ns.tprint("Cannot Create corp == ");
			log(ns, "Cannot Create corp == ");
		}

		//let corp = ns.corporation.getCorporation(); //Return CorporationInfo interface
		//https://github.com/bitburner-official/bitburner-src/blob/stable/markdown/bitburner.corporationinfo.md
		//corp.canCreateCorporation(); //not working, this is interface not API
	}
	// Invoke the main function
	await main_start(ns);
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initCities(ns, division) {
	let strFName = "";
	//ns.tprint("division => " + division);
	//ns.tprint("division.name => " + division.name);
	for (const city of cities) {
		if (!division.cities.includes(city)) {
			//ns.corporation.expandCity(division.name, city);
			strFName = "corporation.expandCity"; //
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			//log(ns, "Expand to city == " + city);
		}
		//hasWarehouse(divisionName, city) //not working, every city return true, even 0 WH
		let isHasWH = false;
		strFName = "corporation.hasWarehouse"; //
		isHasWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`/Temp/${strFName}.arm.txt`, [division.name, city]);
		//log(ns, " isHasWH => " + isHasWH + " division: " + division.name + " city: " + city);
		if (isHasWH) {
			//hasWH
			//then upgrade to Lv 3
			let maxWHlv = 3;
			let cuInvOffer = null;
			strFName = "corporation.getInvestmentOffer"
			cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
			if (cuInvOffer.round == 1) {
				maxWHlv = 3;
			} else if (cuInvOffer.round == 2) {
				maxWHlv = 10;
			}
			strFName = "corporation.getWarehouse"; //
			let constWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (constWH.level >= maxWHlv) { //no need to up
				//return;
			} else {
				for (let i = constWH.level; i < maxWHlv; i++) {
					//upgradeWarehouse(upgradeName)
					strFName = "corporation.upgradeWarehouse"; //
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
						`Temp/${strFName}.arm.txt`, [division.name, city]);
				}
			}
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			//log(ns, " division: " + division.name + " constWH.level => " + afterWH.level + " city: " + city);
		} else {
			//not hasWH , purchaseWarehouse(divisionName, city)
			strFName = "corporation.purchaseWarehouse"; //
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
		}
	}
	//ns.tprint("division.cities => " + division.cities);
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initWarehouse(ns, division) {
	let strFName = "";
	let cuInvOffer = null;
	strFName = "corporation.getInvestmentOffer"
	cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	for (const city of cities) {
		//ns.corporation.sellProduct(division.name, "Sector-12", product, "MAX", "MP", true);
		/*
		//sellMaterial(
		divisionName: string,
		city: CityName | `${CityName}`,
		materialName: string,
		amt: string,
		price: string,
		): void;
		*/
		strFName = "corporation.getWarehouse"; //Warehouse
		let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, city]);
		strFName = "corporation.sellMaterial"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", "MP"]);
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", "MP"]);
		if (cuInvOffer.round == 1 && afterWH.level >= 3) {
			await setupMaterial(ns, division, city, "Hardware", 125);
			await setupMaterial(ns, division, city, "AI Cores", 75);
			await setupMaterial(ns, division, city, "Real Estate", 27e3);

		} else if (cuInvOffer.round == 2 && afterWH.level >= 10) {
			await setupMaterial(ns, division, city, "Hardware", 2675);
			await setupMaterial(ns, division, city, "Robots", 96);
			await setupMaterial(ns, division, city, "AI Cores", 2445);
			await setupMaterial(ns, division, city, "Real Estate", 119400);

		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division 
 * @param {string} city
 * @param {string} setCorpMaterialName 
 * @param {number} amount */
async function setupMaterial(ns, division, city, setCorpMaterialName, amount) {
	let strFName = "";
	/*
	//getMaterial(
	divisionName: string, 
	city: CityName | `${CityName}`, 
	materialName: string
	): Material;
	*/
	strFName = "corporation.getMaterial"
	let thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
		`Temp/${strFName}.arm.txt`, [division.name, city, setCorpMaterialName]);
	//log(ns, " " + setCorpMaterialName + " => " + thisMaterial.stored + " @City: " + city);
	if (thisMaterial.stored < amount) {
		/*
		//buyMaterial(
		divisionName: string, 
		city: CityName | `${CityName}`, 
		materialName: string, 
		amt: number): void;
		*/
		strFName = "corporation.buyMaterial"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, setCorpMaterialName, amount / 10]);
	} else {
		strFName = "corporation.buyMaterial"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, setCorpMaterialName, 0]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initOffice(ns, division) {
	let strFName = "";
	let maxOfficelv = 3;
	let cuInvOffer = null;
	strFName = "corporation.getInvestmentOffer"
	cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	if (cuInvOffer.round == 1) {
		maxOfficelv = 3;
	} else if (cuInvOffer.round == 2) {
		maxOfficelv = 9;
	}
	for (const city of cities) {
		strFName = "corporation.getOffice"; //
		let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, city]);
		if (constOffice.size >= maxOfficelv) { //no need to up
			//return;
			//hireEmployee
			for (let i = constOffice.numEmployees; i < maxOfficelv; i++) {
				//ns.corporation.hireEmployee(division.name, city);
				strFName = "corporation.hireEmployee";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])&&true`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
			}
			//setAutoJobAssignment
			//await ns.corporation.setAutoJobAssignment(division.name, city, "Operations", Math.ceil(employees / 5));
			if (cuInvOffer.round == 1) { // 3 Employee
				strFName = "corporation.setAutoJobAssignment";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Operations", 1]);
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Engineer", 1]);
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Business", 1]);
			} else if (cuInvOffer.round == 2) { // 9 Employee
				strFName = "corporation.getOffice"
				let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
				if (constOffice.avgMorale < 95) {
					strFName = "corporation.setAutoJobAssignment";
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Operations", 1]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Engineer", 1]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Business", 1]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Management", 1]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Research & Development", 1]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Intern", 4]);

				} else {
					strFName = "corporation.setAutoJobAssignment";
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Intern", 0]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Operations", 2]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Engineer", 2]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Business", 2]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Management", 1]);
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Research & Development", 2]);

				}
			}
		} else {
			for (let i = constOffice.size; i < maxOfficelv; i++) {
				//ns.corporation.upgradeOfficeSize(division.name, city, 3);
				strFName = "corporation.upgradeOfficeSize";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, 1]);
			}
		}
		strFName = "corporation.getOffice"; //
		constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, city]);
		//log(ns, " division: " + division.name + " constOffice.size => " + constOffice.size + " city: " + city);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initOfficeParty(ns, division) {
	let strFName = "";
	//getOffice(divisionName, city)
	//throwParty(divisionName, city, costPerEmployee)
	//buyTea(divisionName, city)
	for (const city of cities) {
		strFName = "corporation.getOffice"
		let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, city]);
		log(ns, " constOffice.avgMorale => " + formatNumber(constOffice.avgMorale) + " of city => " + city);
		log(ns, " constOffice.avgEnergy => " + formatNumber(constOffice.avgEnergy) + " of city => " + city);
		log(ns, " constOffice.totalExp  => " + formatNumber(constOffice.totalExperience) + " of city => " + city);

		if (constOffice.avgMorale < 95) {
			strFName = "corporation.throwParty"
			let numThrowParty = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
				`Temp/${strFName}.arm.txt`, [division.name, city, 500e3]);
			log(ns, " numThrowParty => " + numThrowParty);
		}
		if (constOffice.avgEnergy < 95) {
			strFName = "corporation.buyTea"
			let numBuyTea = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			log(ns, " numBuyTea => " + numBuyTea);
		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function reportProduction(ns, division) {
	let strFName = "";
	for (const city of cities) {
		strFName = "corporation.getMaterial"
		let thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
			`Temp/${strFName}.arm.txt`, [division.name, city, "Food"]);
		log(ns, " " + " @City= " + city + " Food" + " => " + formatNumber(thisMaterial.stored));
		thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
			`Temp/${strFName}.arm.txt`, [division.name, city, "Plants"]);
		log(ns, " " + " @City= " + city + " Plants" + " => " + formatNumber(thisMaterial.stored));
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function phaseAdvancing(ns, division) {
	let strFName = "";
	/* Idea are
	1. Check the current phase
	2. Check investor money of that phase
		2.1. Check employee moral and energy reach 100
		2.2. Then start keep statistic (maxInvestorMoney) for 10 minutes
	3. Wait until currentInvestorMoney >= (maxInvestorMoney)
	4. Advance to the next phase
	*/
	//ns.corporation
	//.acceptInvestmentOffer()
	//.getInvestmentOffer()
	//.goPublic(numShares)
	//.issueDividends(rate)
	let cuInvOffer = null;
	let numTarget = 150e9;
	strFName = "corporation.getInvestmentOffer"
	cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	if (cuInvOffer.round == 1) numTarget = 150e9;
	if (cuInvOffer.round == 2) numTarget = 5e12;
	//if (cuInvOffer.round == 3) numTarget = 150e9;

	log(ns, " " + "cuInvOffer.funds" + " => " + formatMoney(cuInvOffer.funds) + " target => " + formatMoney(numTarget));
	log(ns, " " + "cuInvOffer.round" + " => " + cuInvOffer.round);
	log(ns, " " + "cuInvOffer.shares" + " => " + formatMoney(cuInvOffer.shares));
	if (cuInvOffer.round == 1 && cuInvOffer.funds > numTarget) {
		strFName = "corporation.acceptInvestmentOffer"
		let boolAccOffer = null;
		boolAccOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
		log(ns, " " + "boolAccOffer" + " => " + boolAccOffer);
		log(ns, " " + "get Offer" + " => " + formatMoney(cuInvOffer.funds));
		log(ns, " " + "get round" + " => " + cuInvOffer.round);
		log(ns, " " + "cuInvOffer.shares" + " => " + formatMoney(cuInvOffer.shares));
	} else if (cuInvOffer.round == 2 && cuInvOffer.funds > numTarget) {
		log(ns, " " + "get Offer" + " => " + formatMoney(cuInvOffer.funds));
		log(ns, " " + "get round" + " => " + cuInvOffer.round);
		log(ns, " " + "cuInvOffer.shares" + " => " + formatMoney(cuInvOffer.shares));
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function hireEmployees(ns, division) {
}

/** 
 * @param {NS} ns
 * @param {String} upName
 * @param {number} upLevel */
async function upgradesCorp(ns, upName, upLevel) {
	//getUpgradeLevel(upgradeName)
	let currLv = await getNsDataThroughFile(ns, 'ns.corporation.getUpgradeLevel(ns.args[0])',
		null, [upName]);
	if (currLv >= upLevel) { //no need to up
		return;
	} else {
		for (let i = currLv; i < upLevel; i++) {
			//levelUpgrade(upgradeName)
			await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])||true',
				"Temp/corporation.levelUpgrade.arm.txt", [upName]);
		}
	}
}
