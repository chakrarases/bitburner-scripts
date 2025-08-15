import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatDuration2, formatNumber, formatNumberShort, getErrorInfo, tail
} from './helpers.js'

class autoPrice {
	constructor(pDivision, pCity, pMaterial, pPrice = 0, pSetting = false) {
		this.division = pDivision;
		this.city = pCity;
		this.material = pMaterial;
		this.price = pPrice;
		this.setting = pSetting;
	}
}

const autoPricesByKey = {};

//const cities = ["Sector-12", "Aevum", "Volhaven"];
//const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo"];
const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
const corpIndustryNames = ["Spring Water"
	, "Water Utilities"
	, "Agriculture"
	, "Fishing"
	, "Mining"
	, "Refinery"
	, "Restaurant"
	, "Tobacco"
	, "Chemical"
	, "Pharmaceutical"
	, "Computer Hardware"
	, "Robotics"
	, "Software"
	, "Healthcare"
	, "Real Estate"
];

const argsSchema = [ // The set of all command line arguments
	['sellshare-1hr', false], // If true once Cooldown reach zero, sellallshare and re-create corp
];
const persistCorpLog = "log.corporation.txt";

let prevState = null, nextState = null;
let currCorp = null;

let strFName = "";
let options; // The options used at construction time
let resetInfo = (/**@returns{ResetInfo}*/() => undefined)(); // Information about the current bitnode
let bitNodeMults = (/**@returns{BitNodeMultipliers}*/() => undefined)(); // bitNode multipliers that can be automatically determined after SF-5
let dictOwnedSourceFiles = (/**@returns{{[k: number]: number;}}*/() => [])(); // Player owned source files
let unlockedSFs = [], nextBn = 0; // Info for the current bitnode
let homeRam = 0; // Amount of RAM on the home server, last we checked


/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

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

	ns.disableLog("disableLog"); ns.disableLog("sleep");

	/** @param {NS} ns **/
	async function main_start(ns) {
		const runOptions = getConfiguration(ns, argsSchema);
		if (!runOptions || await instanceCount(ns) > 1) return; // Prevent multiple instances of this script from being started, even with different args.
		options = runOptions; // We don't set the global "options" until we're sure this is the only running instance

		if (options['sellshare-1hr']) {
			ns.tprint("Corporpation mode: Farm money in 1 hr approx " + formatMoney(1e12));
		} else {
			ns.tprint("Corporpation mode: Normal running to the Moon!");
		}

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
			prevState = await ns.corporation.nextUpdate();
			currCorp = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
			nextState = currCorp.nextState;
			await main_loop(ns);
			//await ns.sleep(2 * 1000); //sleep 2 sec
		}
	}

	//Debuging and finding the right API
	/** @param {NS} ns **/
	async function main_loop(ns) {
		//TODO: Refactory to reduce repeating functions
		const player = await getPlayerInfo(ns);
		//log(ns, "");
		//ns.tprint("player.money == " + formatMoney(player.money));
		const useSeedMoney = ns.corporation.canCreateCorporation(false);
		//ns.tprint("useSeedMoney == " + useSeedMoney);
		const useSelfMoney = ns.corporation.canCreateCorporation(true);
		//ns.tprint("useSelfMoney == " + useSelfMoney);
		const hasCorp = ns.corporation.hasCorporation();
		//ns.tprint("hasCorp == " + hasCorp);

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
			let corpInfo = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
			ns.print(""
				+ " D " + corpInfo.divisions
				+ " L " + corpInfo.divisions.length
			);
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
				//ns.corporation.expandIndustry(industryType, divisionName);
				//ns.corporation.expandIndustry("");
				//ns.corporation.expandIndustry(ns.args[0])
				//"Agriculture","Weed"
				//await runCommand(ns, 'ns.corporation.expandIndustry(ns.args[0],ns.args[1])', null, ["Agriculture", "Agriculture"]);
				strFName = "corporation.expandIndustry";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
					`Temp/${strFName}.arm.txt`, ["Agriculture", "Weed"]);
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
				let hasExport = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Export"]);

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
					await upgradesCorp(ns, "Smart Factories", 2);
				} else if (cuInvOffer.round == 2) {
					//Smart Storage to Lv10
					await upgradesCorp(ns, "Smart Storage", 10);
					await upgradesCorp(ns, "Smart Factories", 10);
				} else if (cuInvOffer.round == 3) {
					await upgradesCorp(ns, "Smart Storage", 20);
					await upgradesCorp(ns, "Smart Factories", 20);
					if (corpInfo.divisions.length < 2) {
						strFName = "corporation.expandIndustry";
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
							`Temp/${strFName}.arm.txt`, ["Chemical", "Fertilizer"]);
					}
				} else if (cuInvOffer.round == 4) {
					await upgradesCorp(ns, "Smart Storage", 40);
					await upgradesCorp(ns, "Smart Factories", 40);
					if (corpInfo.divisions.length < 3 && corpInfo.funds >= 2e12) { //2t money
						strFName = "corporation.expandIndustry";
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
							`Temp/${strFName}.arm.txt`, ["Tobacco", "Cigarette"]);
					}
				} else if (cuInvOffer.round == 5) {
					if (corpInfo.divisions.length < 5 && corpInfo.funds >= 20e12) { //20t money
						strFName = "corporation.expandIndustry";
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
							`Temp/${strFName}.arm.txt`, ["Healthcare", "BDMS"]);
					}
					//corpInfo.divisions[4] == "BDMS"
					if (corpInfo.divisions.length < 6) {
						if (corpInfo.divisions[4] == "BDMS" && corpInfo.funds >= 200e12) { //200t money
							strFName = "corporation.expandIndustry";
							await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
								`Temp/${strFName}.arm.txt`, ["Pharmaceutical", "Para"]);
						}
					}
					if (corpInfo.funds >= 200e12) { //200t
						await upgradesCorp(ns, "Smart Storage", 80);
						await upgradesCorp(ns, "Smart Factories", 80);
					}
					if (corpInfo.funds >= 1e15) { //1q
						await upgradesCorp(ns, "Smart Storage", 120);
						await upgradesCorp(ns, "Smart Factories", 120);
					}
					if (corpInfo.funds >= 10e15) { //10q
						await upgradesCorp(ns, "Smart Storage", 140);
						await upgradesCorp(ns, "Smart Factories", 140);
					}
					if (corpInfo.funds >= 100e15) { //100q
						await upgradesCorp(ns, "Smart Storage", 190);
						await upgradesCorp(ns, "Smart Factories", 190);
					}
				}
				corpInfo = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo

				//log(ns, "corpInfo.divisions[0] => " + corpInfo.divisions[0]);
				strFName = "corporation.getDivision";
				const divisionInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
					`Temp/${strFName}.arm.txt`, [corpInfo.divisions[0]]); //Weed
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
				//Office API

				if (cuInvOffer.round == 1) {
					await initCities(ns, divisionInfo);
					await initOffice(ns, divisionInfo);
					await initOfficeParty(ns, divisionInfo);
					await initSellPrice(ns, divisionInfo);
					//Upgrades following to Lv2 := FocusWires, Neural Accelerators, Speech Processor Implants, Nuoptimal Nootropic Injector Implants
					//await upgradesCorp(ns, upName, up2Lv);
					await upgradesCorp(ns, "FocusWires", 2);
					await upgradesCorp(ns, "Neural Accelerators", 2);
					await upgradesCorp(ns, "Speech Processor Implants", 2);
					await upgradesCorp(ns, "Nuoptimal Nootropic Injector Implants", 2);
					//await upgradesCorp(ns, "DreamSense", 2);
					await buyBoostMaterial(ns, divisionInfo);
					await reportProduction(ns, divisionInfo);
				} else if (cuInvOffer.round == 2) {
					await initCities(ns, divisionInfo);
					await initOffice(ns, divisionInfo);
					await initOfficeParty(ns, divisionInfo);
					await initSellPrice(ns, divisionInfo);
					await buyBoostMaterial(ns, divisionInfo);
					await reportProduction(ns, divisionInfo);
				} else if (cuInvOffer.round == 3) {
					await upgradesCorp(ns, "FocusWires", 20);
					await upgradesCorp(ns, "Neural Accelerators", 20);
					await upgradesCorp(ns, "Speech Processor Implants", 20);
					await upgradesCorp(ns, "Nuoptimal Nootropic Injector Implants", 20);
					await upgradesCorp(ns, "DreamSense", 2);
					strFName = "corporation.getDivision";
					let weedInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
						`Temp/${strFName}.arm.txt`, [corpInfo.divisions[0]]); //Weed
					strFName = "corporation.getDivision";
					let fertInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
						`Temp/${strFName}.arm.txt`, [corpInfo.divisions[1]]); //Fertilizer
					await initCities(ns, weedInfo);
					await initOffice(ns, weedInfo);
					await initOfficeParty(ns, weedInfo);
					await initCities(ns, fertInfo);
					await initOffice(ns, fertInfo);
					await initOfficeParty(ns, fertInfo);
					if (!hasExport) {
						//await initSellPrice(ns, weedInfo);
						//await initSellPrice(ns, fertInfo);
						//purchaseUnlock(upgradeName)
						strFName = "corporation.purchaseUnlock";
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
							`Temp/${strFName}.arm.txt`, ["Export"]);
						ns.write("arm.corp.weed.sync.fert.txt", "none", "w");
					} else {
						if (ns.read("arm.corp.weed.sync.fert.txt") != "sync") {
							await syncWeedFert(ns, weedInfo, fertInfo);
							ns.write("arm.corp.weed.sync.fert.txt", "sync", "w");
						}
					}
					await initSellPrice(ns, weedInfo);
					await initSellPrice(ns, fertInfo);
					await buyBoostMaterial(ns, weedInfo);
					await buyBoostMaterial(ns, fertInfo);
					await reportProduction(ns, weedInfo);
					await reportProduction(ns, fertInfo);
				} else if (cuInvOffer.round >= 4) {
					await upgradesCorp(ns, "DreamSense", 4);
					if (corpInfo.funds >= 2e12) {
						await upgradesCorp(ns, "DreamSense", 10);
						await upgradesCorp(ns, "Project Insight", 40);
					}
					strFName = "corporation.getDivision";
					let weedInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
						`Temp/${strFName}.arm.txt`, [corpInfo.divisions[0]]); //Weed
					strFName = "corporation.getDivision";
					let fertInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
						`Temp/${strFName}.arm.txt`, [corpInfo.divisions[1]]); //Fertilizer
					await initCities(ns, weedInfo);
					await initOffice(ns, weedInfo);
					await initOfficeParty(ns, weedInfo);
					await initCities(ns, fertInfo);
					await initOffice(ns, fertInfo);
					await initOfficeParty(ns, fertInfo);
					if (!hasExport) {
						//await initSellPrice(ns, weedInfo);
						//await initSellPrice(ns, fertInfo);
						//purchaseUnlock(upgradeName)
						strFName = "corporation.purchaseUnlock";
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
							`Temp/${strFName}.arm.txt`, ["Export"]);
						ns.write("arm.corp.weed.sync.fert.txt", "none", "w");
						ns.write("arm.corp.weed.sync.ciga.txt", "none", "w");
					} else {
						if (ns.read("arm.corp.weed.sync.fert.txt") != "sync") {
							await syncWeedFert(ns, weedInfo, fertInfo);
							ns.write("arm.corp.weed.sync.fert.txt", "sync", "w");
						}
					}
					await initSellPrice(ns, weedInfo);
					await initSellPrice(ns, fertInfo);
					await buyBoostMaterial(ns, weedInfo);
					await buyBoostMaterial(ns, fertInfo);
					await doResearch(ns, weedInfo, "Hi-Tech R&D Laboratory");
					await doResearch(ns, weedInfo, "Market-TA.I");
					await doResearch(ns, weedInfo, "Market-TA.II");
					await turnOnMarketTA12(ns, weedInfo);
					await doResearch(ns, fertInfo, "Hi-Tech R&D Laboratory");
					//await doResearch(ns, fertInfo); //no need to research anything, keep RP to boost Quality
					await reportProduction(ns, weedInfo);
					await reportProduction(ns, fertInfo);
					if (corpInfo.divisions[2] == "Cigarette" && corpInfo.funds >= 2e12) { //Require 2t money
						if (corpInfo.funds >= 10e12) { //10t money
							await upgradesCorp(ns, "ABC SalesBots", 110);
							await upgradesCorp(ns, "DreamSense", 40);
						}
						if (corpInfo.funds >= 1e15) { //1q money
							await upgradesCorp(ns, "ABC SalesBots", 160);
							await upgradesCorp(ns, "DreamSense", 60);
						}
						if (corpInfo.funds >= 10e15) { //10q money
							await upgradesCorp(ns, "ABC SalesBots", 180);
							await upgradesCorp(ns, "DreamSense", 80);
						}
						if (corpInfo.funds >= 100e15) { //100q money
							await upgradesCorp(ns, "FocusWires", 190);
							await upgradesCorp(ns, "Neural Accelerators", 190);
							await upgradesCorp(ns, "Speech Processor Implants", 190);
							await upgradesCorp(ns, "Nuoptimal Nootropic Injector Implants", 190);
							await upgradesCorp(ns, "DreamSense", 110);
						}
						//Shady Accounting
						if (corpInfo.funds >= 2e15) { //2q for safety 500t money
							let hasShadyAccounting = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Shady Accounting"]);
							//ns.tprint("hasSmartSupply => " + hasSmartSupply);
							if (!hasShadyAccounting) {
								strFName = "corporation.purchaseUnlock";
								await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
									`Temp/${strFName}.arm.txt`, ["Shady Accounting"]);
							}
						}
						//Government Partnership
						if (corpInfo.funds >= 8e15) { //8q forsafety money
							let hasGovernmentPartnership = await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Government Partnership"]);
							//ns.tprint("hasSmartSupply => " + hasSmartSupply);
							if (!hasGovernmentPartnership) {
								strFName = "corporation.purchaseUnlock";
								await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
									`Temp/${strFName}.arm.txt`, ["Government Partnership"]);
							}
						}

						strFName = "corporation.getDivision";
						let cigaInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
							`Temp/${strFName}.arm.txt`, [corpInfo.divisions[2]]); //Cigarette
						await initCities(ns, cigaInfo);
						await initOffice(ns, cigaInfo);
						await initOfficeParty(ns, cigaInfo);
						if (!hasExport) {
							ns.write("arm.corp.weed.sync.ciga.txt", "none", "w");
						} else {
							if (ns.read("arm.corp.weed.sync.ciga.txt") != "sync") {
								await syncWeedCiga(ns, weedInfo, cigaInfo);
								ns.write("arm.corp.weed.sync.ciga.txt", "sync", "w");
							}
						}
						await initSellPrice(ns, cigaInfo);
						await buyBoostMaterial(ns, cigaInfo);
						await doResearch(ns, cigaInfo, "Hi-Tech R&D Laboratory");
						await doResearch(ns, cigaInfo, "Market-TA.I");
						await doResearch(ns, cigaInfo, "Market-TA.II");
						await doResearch(ns, cigaInfo, "uPgrade: Fulcrum");
						await doResearch(ns, cigaInfo, "uPgrade: Capacity.I");
						await doResearch(ns, cigaInfo, "uPgrade: Capacity.II");
						await doProduct(ns, cigaInfo, "Marlboro"); // Product Name please longer than 4 characters
						await turnOnMarketTA12(ns, cigaInfo);
						await reportProduction(ns, cigaInfo);
					}
					if (corpInfo.divisions[4] == "BDMS" && corpInfo.funds >= 20e12) { //20t money
						await upgradesCorp(ns, "FocusWires", 90);
						await upgradesCorp(ns, "Neural Accelerators", 90);
						await upgradesCorp(ns, "Speech Processor Implants", 90);
						await upgradesCorp(ns, "Nuoptimal Nootropic Injector Implants", 90);
						//ABC SalesBots
						await upgradesCorp(ns, "ABC SalesBots", 110);
						strFName = "corporation.getDivision";
						let bdmsInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
							`Temp/${strFName}.arm.txt`, [corpInfo.divisions[4]]); //BDMS
						await initCities(ns, bdmsInfo);
						await initOffice(ns, bdmsInfo);
						await initOfficeParty(ns, bdmsInfo);

						if (!hasExport) {
							ns.write("arm.corp.weed.sync.bdms.txt", "none", "w");
						} else {
							if (ns.read("arm.corp.weed.sync.bdms.txt") != "sync") {
								await syncWeedBdms(ns, weedInfo, bdmsInfo);
								ns.write("arm.corp.weed.sync.bdms.txt", "sync", "w");
							}
						}

						await initSellPrice(ns, bdmsInfo);
						await buyBoostMaterial(ns, bdmsInfo);
						await doResearch(ns, bdmsInfo, "Hi-Tech R&D Laboratory");
						await doResearch(ns, bdmsInfo, "Market-TA.I");
						await doResearch(ns, bdmsInfo, "Market-TA.II");
						await doResearch(ns, bdmsInfo, "uPgrade: Fulcrum");
						await doResearch(ns, bdmsInfo, "uPgrade: Capacity.I");
						await doResearch(ns, bdmsInfo, "uPgrade: Capacity.II");
						await doProduct(ns, bdmsInfo, "Hospital"); // Product Name please longer than 4 characters
						await turnOnMarketTA12(ns, bdmsInfo);
						await reportProduction(ns, bdmsInfo);
					}
					if (corpInfo.divisions[5] == "Para" && corpInfo.funds >= 200e12) { //200t money
						await upgradesCorp(ns, "FocusWires", 120);
						await upgradesCorp(ns, "Neural Accelerators", 120);
						await upgradesCorp(ns, "Speech Processor Implants", 120);
						await upgradesCorp(ns, "Nuoptimal Nootropic Injector Implants", 120);
						await upgradesCorp(ns, "ABC SalesBots", 120);
						strFName = "corporation.getDivision";
						let bdmsInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
							`Temp/${strFName}.arm.txt`, [corpInfo.divisions[4]]); //BDMS
						strFName = "corporation.getDivision";
						let paraInfo = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
							`Temp/${strFName}.arm.txt`, [corpInfo.divisions[5]]); //Para
						await initCities(ns, paraInfo);
						await initOffice(ns, paraInfo);
						await initOfficeParty(ns, paraInfo);

						if (!hasExport) {
							ns.write("arm.corp.para.sync.bdms.txt", "none", "w");
						} else {
							if (ns.read("arm.corp.para.sync.bdms.txt") != "sync") {
								await syncParaBdms(ns, paraInfo, bdmsInfo);
								ns.write("arm.corp.para.sync.bdms.txt", "sync", "w");
							}
						}

						await initSellPrice(ns, paraInfo);
						await buyBoostMaterial(ns, paraInfo);
						await doResearch(ns, paraInfo, "Hi-Tech R&D Laboratory");
						await reportProduction(ns, paraInfo);
					}
				}
				//Warehouse API
				//await initSellPrice(ns, divisionInfo);
				//await buyBoostMaterial(ns, divisionInfo);
				//await reportProduction(ns, divisionInfo);
				await phaseAdvancing(ns);
				ns.hacknet.spendHashes("Exchange for Corporation Research");

				//Uncomment if you want to see all factors/constant about Corporation/Divisions
				//await printCorpIndustryDataConst(ns, "Agriculture");
				//await printCorpIndustryDataConst(ns, "Chemical");
				//await printCorpIndustryDataConst(ns, "Tobacco");
				//await printCorpIndustryDataConst(ns, "Restaurant");
				//for (const i of corpIndustryNames) {
				//	await printCorpIndustryDataConst(ns, i);
				//}
				//await printConst(ns, divisionInfo);
			}
		} else {
			ns.tprint("== Cannot Create corp ==");
			log(ns, "== Cannot Create corp ==");
			ns.exit();
			//return;
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
	//let strFName = "";
	//ns.tprint("division => " + division);
	//ns.tprint("division.name => " + division.name);
	//for (let divis of divisions) {

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
			} else if (cuInvOffer.round == 3) {
				maxWHlv = 19;
			} else if (cuInvOffer.round >= 4) {
				maxWHlv = 29;
				if (division.name == "BDMS") {
					maxWHlv = 50;
					if (city == "Sector-12") {
						let cc = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
						if (cc.funds >= 1e15) { //1q money
							maxWHlv = 90;
						}
					}
				}
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
	//}
}

/** 
 * @param {NS} ns
 * @param {Division} weedDiv
 * @param {Division} fertDiv */
async function syncWeedFert(ns, weedDiv, fertDiv) {
	//let strFName = "";
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Fert Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, fertDiv.name, city, "Plants", "-IPROD"]);
		//Fert send to Weed Chemicals
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [fertDiv.name, city, weedDiv.name, city, "Chemicals", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, "Chemicals", "imports"]);
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [fertDiv.name, city, "Plants", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} weedDiv
 * @param {Division} cigaDiv */
async function syncWeedCiga(ns, weedDiv, cigaDiv) {
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Ciga Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, cigaDiv.name, city, "Plants", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [cigaDiv.name, city, "Plants", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} weedDiv
 * @param {Division} barbDiv */
async function syncWeedBarb(ns, weedDiv, barbDiv) {
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Ciga Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, barbDiv.name, city, "Food", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [barbDiv.name, city, "Food", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} weedDiv
 * @param {Division} bdmsDiv */
async function syncWeedBdms(ns, weedDiv, bdmsDiv) {
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Ciga Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, bdmsDiv.name, city, "Food", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [bdmsDiv.name, city, "Food", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} paraDiv
 * @param {Division} bdmsDiv */
async function syncParaBdms(ns, paraDiv, bdmsDiv) {
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Ciga Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [paraDiv.name, city, bdmsDiv.name, city, "Drugs", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [bdmsDiv.name, city, "Drugs", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} aquaDiv
 * @param {Division} weedDiv */
async function syncAquaWeed(ns, aquaDiv, weedDiv) {
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Ciga Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [aquaDiv.name, city, weedDiv.name, city, "Water", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, "Water", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} omegDiv
 * @param {Division} weedDiv */
async function syncOmegWeed(ns, omegDiv, weedDiv) {
	for (const city of cities) {
		strFName = "corporation.exportMaterial"
		//exportMaterial(sourceDivision, sourceCity, targetDivision, targetCity, materialName, amt)
		//Weed send to Ciga Plants
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
			`Temp/${strFName}.arm.txt`, [omegDiv.name, city, weedDiv.name, city, "Water", "-IPROD"]);
		//setSmartSupplyOption(divisionName, city, materialName, option)
		strFName = "corporation.setSmartSupplyOption"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [weedDiv.name, city, "Water", "imports"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initSellPrice(ns, division) {
	//TODO: 
	//let strFName = "";
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
		if (division.name == "Weed") { //Agriculture
			let q1Fac = 0.0;
			let q2Fac = 0.0;
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			strFName = "corporation.getMaterial"
			let thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
				`Temp/${strFName}.arm.txt`, [division.name, city, "Food"]);
			//log(ns, " " + " @City= " + city + " Food" + " => " + formatNumber(thisMaterial.stored));
			let nFood = 0;
			nFood = thisMaterial.stored;
			q1Fac = 1 + (thisMaterial.quality / 100);
			q2Fac = 2 + (thisMaterial.quality / 100);
			/*
			if (thisMaterial.stored > 10000) { //reduce price
				strFName = "corporation.sellMaterial"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", "MP*2/3"]);
			} else if (thisMaterial.stored > 1000) {
				strFName = "corporation.sellMaterial"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					//`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", `MP*${q1Fac}`]);
					`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", `MP`]);
			} else { //set to MP*2
				strFName = "corporation.sellMaterial"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", `MP*${q2Fac}`]);
					//`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", "MP*2"]);
			}
			*/
			strFName = "corporation.sellMaterial"
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
				//`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", `MP*${q1Fac}`]);
				//`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", `MP*${q2Fac}`]);
				`Temp/${strFName}.arm.txt`, [division.name, city, "Food", "MAX", "MP"]);
			//await adjPriceBino(ns, division, city, "Food");

			strFName = "corporation.getMaterial"
			thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
				`Temp/${strFName}.arm.txt`, [division.name, city, "Plants"]);
			//log(ns, " " + " @City= " + city + " Plants" + " => " + formatNumber(thisMaterial.stored));
			let nPlant = 0;
			nPlant = thisMaterial.stored;
			q1Fac = 1 + (thisMaterial.quality / 100);
			q2Fac = 2 + (thisMaterial.quality / 100);
			/*
			if (thisMaterial.stored > 10000) { //reduce price
				strFName = "corporation.sellMaterial"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", "MP*2/3"]);
			} else if (thisMaterial.stored > 1000) {
				strFName = "corporation.sellMaterial"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					//`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", `MP*${q1Fac}`]);
					`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", `MP`]);
			} else { //set to MP*2
				strFName = "corporation.sellMaterial"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", `MP*${q2Fac}`]);
					//`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", "MP*2"]);
			}
			*/
			strFName = "corporation.sellMaterial"
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
				//`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", `MP*${q1Fac}`]);
				//`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", `MP*${q2Fac}`]);
				`Temp/${strFName}.arm.txt`, [division.name, city, "Plants", "MAX", "MP"]);
			//await adjPriceBino(ns, division, city, "Plants");

		} else if (division.name == "Fertilizer") { //Chemical
			strFName = "corporation.sellMaterial"
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, city, "Chemicals", "MAX", "MP*2"]);
			//await adjPriceBino(ns, division, city, "Chemicals");
		} else if (division.name == "Para") { //Drugs
			strFName = "corporation.sellMaterial"
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, city, "Drugs", "MAX", "MP*2"]);
		} else if (division.name == "Cigarette" || division.name == "Barbgon" || division.name == "BDMS") { //type: Product
			for (let i = 0; i < division.products.length; i++) {
				strFName = "corporation.getProduct"
				let inProd = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
					`Temp/${strFName}.arm.txt`, [division.name, city, division.products[i]]);
				if (inProd.developmentProgress < 100) continue;
				strFName = "corporation.sellProduct"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4],ns.args[5])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, division.products[i], "MAX", "MP", true]);
			}
		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division
 * @param {string} city
 * @param {string} material */
async function adjPriceBino(ns, division, city, material) {
	if (prevState == "START") {
		const chkKey = `${division.name.slice(0, 4)}-`
			+ `${city.slice(0, 2)}-`
			+ `${material.slice(0, 2)}`;
		const chkAutoPrice = autoPricesByKey[chkKey];
		strFName = "corporation.getMaterial"
		let chkMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
			`Temp/${strFName}.arm.txt`, [division.name, city, material]);
		if (chkAutoPrice) {
			let p_min = autoPricesByKey[chkKey].price / 2;
			let p_max = autoPricesByKey[chkKey].price;
			let p_avg = (p_min + p_max) / 2;
			if (!autoPricesByKey[chkKey].setting) {
				if (chkMaterial.productionAmount <= chkMaterial.actualSellAmount) {
					autoPricesByKey[chkKey].price = autoPricesByKey[chkKey].price * 2;
				} else {
					autoPricesByKey[chkKey].setting = true;
				}
			} else {
				if (chkMaterial.productionAmount <= chkMaterial.actualSellAmount) {
					p_min = p_avg;
				}
				if (chkMaterial.productionAmount > chkMaterial.actualSellAmount) {
					p_max = p_avg;
				}
				if ((p_max - p_min) > 0.5) {
					autoPricesByKey[chkKey].price = p_avg;
				} else {
					autoPricesByKey[chkKey].price = p_min;
				}
			}
			if (autoPricesByKey[chkKey].price < chkMaterial.marketPrice) {
				autoPricesByKey[chkKey].price = chkMaterial.marketPrice;
				autoPricesByKey[chkKey].setting = false;
			}
		} else {
			autoPricesByKey[chkKey] = new autoPrice(division.name, city, material);
			autoPricesByKey[chkKey].price = chkMaterial.marketPrice * 2;
		}
		/*
		ns.print(""
			+ ",chkKey " + chkKey
			+ ",Sell " + pad_str(formatNumberShort(chkMaterial.actualSellAmount, 2, 1), 4)
			+ ",Prod " + pad_str(formatNumberShort(chkMaterial.productionAmount, 2, 1), 4)
			+ ",Price " + pad_str(formatNumberShort(autoPricesByKey[chkKey].price, 2, 1), 4)
		);
		*/
		strFName = "corporation.sellMaterial";
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, material, "MAX", autoPricesByKey[chkKey].price]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division
 * @param {string} txtReName */
async function doResearch(ns, division, txtReName) {
	if (prevState == "START") {
		//let txtReName = ""
		//txtReName = "Hi-Tech R&D Laboratory"
		let numSpareRP = 1e5;
		strFName = "corporation.hasResearched"
		let hasHiTechRnD = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
		/*
		ns.print(""
			+ txtReName + "=" + hasHiTechRnD
		);
		*/
		strFName = "corporation.getResearchCost"
		let costHiTechRnD = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
		/*
		ns.print(""
			+ "cost=" + costHiTechRnD
			+ "div R.Point=" + division.researchPoints
		);
		*/
		if (txtReName == "Hi-Tech R&D Laboratory") numSpareRP = 0;
		if (!hasHiTechRnD && (costHiTechRnD + numSpareRP) <= division.researchPoints) {
			strFName = "corporation.research"
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
			/*
			ns.print(""
				+ "Do Research=" + txtReName
			);
			*/
		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division
 * @param {string} txtProdName */
async function doProduct(ns, division, txtProdName) {
	if (prevState == "SALE") { // Do only in SALE phase
		//let txtProdName = ""
		//txtProdName = "Marlboro"
		//division.maxProducts //Starter = 3, increase to 5
		//division.products <=> string[]
		const nRatio = 0.1;
		let prefix = 1;
		let minRating = 0;
		let mProdName = "";
		let fProdName = prefix + txtProdName
		let corpInfo = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
		let city = "Sector-12"
		if (division.products.length < 1) { // empty, create 1 and return
			//makeProduct(divisionName, city, productName, designInvest, marketingInvest)||true
			prefix = 1; fProdName = prefix + txtProdName;
			if (corpInfo.funds >= 2e9) {
				strFName = "corporation.makeProduct";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, fProdName, 1e9, 1e9]);
			}
			return;
		}
		/*
		ns.print(""
			+ ",ProdLength=" + division.products.length
		);
		*/
		for (let i = 0; i < division.maxProducts; i++) {
			if (i == division.products.length) {
				prefix = i + 1; fProdName = prefix + txtProdName;
				if (corpInfo.funds >= 2e15) {
					strFName = "corporation.makeProduct";
					await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
						`Temp/${strFName}.arm.txt`, [division.name, city, fProdName, corpInfo.funds * nRatio, corpInfo.funds * nRatio]);
				}
				return;
			}
			strFName = "corporation.getProduct"
			let inProd = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
				`Temp/${strFName}.arm.txt`, [division.name, city, division.products[i]]);
			if (inProd.developmentProgress < 100) return;
			if (minRating == 0 || inProd.rating < minRating) {
				minRating = inProd.rating;
				mProdName = inProd.name;
			}
		}
		// If reach here == full maxProducts
		/*
		ns.print(""
			+ ",discontinueProduct=" + mProdName
			+ ",minRating=" + minRating
		);
		*/
		if (corpInfo.funds >= 2e15) {
			//discontinueProduct(divisionName, productName)
			strFName = "corporation.discontinueProduct";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, mProdName]);
			strFName = "corporation.makeProduct";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
				`Temp/${strFName}.arm.txt`, [division.name, city, mProdName, corpInfo.funds * nRatio, corpInfo.funds * nRatio]);
		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function turnOnMarketTA12(ns, division) {
	let txtReName = "";
	if (prevState == "START") {
		txtReName = "Market-TA.II";
		strFName = "corporation.hasResearched";
		let hasMarketT2 = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
		if (hasMarketT2) {
			for (const city of cities) {
				if (!division.makesProducts) {
					strFName = "corporation.getIndustryData";
					let inCIndData = null;
					inCIndData = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
						`Temp/${strFName}.arm.txt`, [division.type]);
					for (let i = 0; i < inCIndData.producedMaterials.length; i++) {
						strFName = "corporation.setMaterialMarketTA2"
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
							`Temp/${strFName}.arm.txt`, [division.name, city, inCIndData.producedMaterials[i], true]);
					}
				} else {
					for (let i = 0; i < division.products.length; i++) {
						strFName = "corporation.getProduct"
						let inProd = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
							`Temp/${strFName}.arm.txt`, [division.name, city, division.products[i]]);
						if (inProd.developmentProgress < 100) continue;
						strFName = "corporation.setProductMarketTA2"
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])||true`,
							`Temp/${strFName}.arm.txt`, [division.name, division.products[i], true]);
						strFName = "corporation.setProductMarketTA1"
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])||true`,
							`Temp/${strFName}.arm.txt`, [division.name, division.products[i], false]);
						//strFName = "corporation.sellProduct"
					}
				}
			}
		} else {
			txtReName = "Market-TA.I";
			strFName = "corporation.hasResearched";
			let hasMarketT1 = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
			if (hasMarketT1) {
				for (const city of cities) {
					if (!division.makesProducts) {
						strFName = "corporation.getIndustryData";
						let inCIndData = null;
						inCIndData = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
							`Temp/${strFName}.arm.txt`, [division.type]);
						for (let i = 0; i < inCIndData.producedMaterials.length; i++) {
							strFName = "corporation.setMaterialMarketTA1"
							await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
								`Temp/${strFName}.arm.txt`, [division.name, city, inCIndData.producedMaterials[i], true]);
						}
					} else {
						for (let i = 0; i < division.products.length; i++) {
							strFName = "corporation.getProduct"
							let inProd = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
								`Temp/${strFName}.arm.txt`, [division.name, city, division.products[i]]);
							if (inProd.developmentProgress < 100) continue;
							strFName = "corporation.setProductMarketTA1"
							await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])||true`,
								`Temp/${strFName}.arm.txt`, [division.name, division.products[i], true]);
						}
					}
				}
			}
		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function buyBoostMaterial(ns, division) {
	//TODO: Refactory to use Class-variable for each division-type
	//let strFName = "";
	let cuInvOffer = null;
	strFName = "corporation.getInvestmentOffer"
	cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	for (const city of cities) {
		if (division.name == "Weed") { //Agriculture
			strFName = "corporation.getOffice"
			let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			strFName = "corporation.getMaterial"
			let thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
				`Temp/${strFName}.arm.txt`, [division.name, city, "Food"]);
			//log(ns, " " + " @City= " + city + " Food" + " => " + formatNumber(thisMaterial.stored));
			let nFood = 0;
			nFood = thisMaterial.stored;
			strFName = "corporation.getMaterial"
			thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
				`Temp/${strFName}.arm.txt`, [division.name, city, "Plants"]);
			//log(ns, " " + " @City= " + city + " Plants" + " => " + formatNumber(thisMaterial.stored));
			let nPlant = 0;
			nPlant = thisMaterial.stored;

			if (cuInvOffer.round == 1 && afterWH.level >= 3 && (constOffice.avgMorale >= 99.5 && constOffice.avgEnergy >= 99.5)) {
				await setupMaterial(ns, division, city, "Hardware", 125);
				await setupMaterial(ns, division, city, "AI Cores", 75);
				await setupMaterial(ns, division, city, "Real Estate", 27000);
			} else if (cuInvOffer.round == 2 && afterWH.level >= 10) {
				await setupMaterial(ns, division, city, "Hardware", 2675);
				await setupMaterial(ns, division, city, "Robots", 96);
				await setupMaterial(ns, division, city, "AI Cores", 2445);
				await setupMaterial(ns, division, city, "Real Estate", 119400);
			} else if (cuInvOffer.round >= 3 && afterWH.level >= 19) {
				if ((nFood <= 100 && nPlant <= 100) || ((afterWH.size - afterWH.sizeUsed) >= 800)) {
					await setupMaterial(ns, division, city, "Hardware", 9300);
					await setupMaterial(ns, division, city, "Robots", 726);
					await setupMaterial(ns, division, city, "AI Cores", 6270);
					await setupMaterial(ns, division, city, "Real Estate", 230400);
				}
			}
		} else if (division.name == "Fertilizer" || division.name == "Para") { //Chemical //Para
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (cuInvOffer.round == 3 && afterWH.level >= 19) {
				await setupMaterial(ns, division, city, "Hardware", 15000);
				await setupMaterial(ns, division, city, "Robots", 1100);
				await setupMaterial(ns, division, city, "AI Cores", 14000);
				await setupMaterial(ns, division, city, "Real Estate", 230400);
			} else if (cuInvOffer.round >= 4 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 30000);
				await setupMaterial(ns, division, city, "Robots", 2000);
				await setupMaterial(ns, division, city, "AI Cores", 30000);
				await setupMaterial(ns, division, city, "Real Estate", 240000);
			}
		} else if (division.name == "Cigarette") { //Tobacco
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (cuInvOffer.round == 4 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 30000);
				await setupMaterial(ns, division, city, "Robots", 10000);
				await setupMaterial(ns, division, city, "AI Cores", 30000);
				await setupMaterial(ns, division, city, "Real Estate", 300000);
			} else if (cuInvOffer.round >= 5 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 30000);
				await setupMaterial(ns, division, city, "Robots", 10000);
				await setupMaterial(ns, division, city, "AI Cores", 30000);
				await setupMaterial(ns, division, city, "Real Estate", 300000);
			}
		} else if (division.name == "Barbgon") { //Restaurant
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (cuInvOffer.round == 4 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 20000);
				await setupMaterial(ns, division, city, "Robots", 12000);
				await setupMaterial(ns, division, city, "AI Cores", 40000);
				await setupMaterial(ns, division, city, "Real Estate", 200000);
			} else if (cuInvOffer.round >= 5 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 20000);
				await setupMaterial(ns, division, city, "Robots", 12000);
				await setupMaterial(ns, division, city, "AI Cores", 40000);
				await setupMaterial(ns, division, city, "Real Estate", 200000);
			}
		} else if (division.name == "BDMS") { //Healthcare
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (cuInvOffer.round == 4 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 30000);
				await setupMaterial(ns, division, city, "Robots", 0);
				await setupMaterial(ns, division, city, "AI Cores", 0);
				await setupMaterial(ns, division, city, "Real Estate", 300000);
			} else if (cuInvOffer.round >= 5 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 30000);
				await setupMaterial(ns, division, city, "Robots", 0);
				await setupMaterial(ns, division, city, "AI Cores", 0);
				await setupMaterial(ns, division, city, "Real Estate", 300000);
			}
		} else if (division.name == "Aqua") { //Spring Water
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (cuInvOffer.round == 4 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 0);
				await setupMaterial(ns, division, city, "Robots", 0);
				await setupMaterial(ns, division, city, "AI Cores", 30000);
				await setupMaterial(ns, division, city, "Real Estate", 300000);
			} else if (cuInvOffer.round >= 5 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 0);
				await setupMaterial(ns, division, city, "Robots", 0);
				await setupMaterial(ns, division, city, "AI Cores", 300000);
				await setupMaterial(ns, division, city, "Real Estate", 3000000);
			}
		} else if (division.name == "Omega") { //Water Utilities
			strFName = "corporation.getWarehouse"; //Warehouse
			let afterWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			if (cuInvOffer.round == 4 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 0);
				await setupMaterial(ns, division, city, "Robots", 10000);
				await setupMaterial(ns, division, city, "AI Cores", 30000);
				await setupMaterial(ns, division, city, "Real Estate", 300000);
			} else if (cuInvOffer.round >= 5 && afterWH.level >= 29) {
				await setupMaterial(ns, division, city, "Hardware", 0);
				await setupMaterial(ns, division, city, "Robots", 10000);
				await setupMaterial(ns, division, city, "AI Cores", 100000);
				await setupMaterial(ns, division, city, "Real Estate", 1000000);
			}
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
	//let strFName = "";
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
	let diffAdd = amount - thisMaterial.stored;
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
			`Temp/${strFName}.arm.txt`, [division.name, city, setCorpMaterialName, diffAdd / 10]);
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
	//let strFName = "";
	let maxOfficelv = 3;
	let cuInvOffer = null;
	strFName = "corporation.getInvestmentOffer"
	cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	if (cuInvOffer.round == 1) {
		maxOfficelv = 3;
	} else if (cuInvOffer.round == 2) {
		maxOfficelv = 9;
	} else if (cuInvOffer.round == 3) {
		maxOfficelv = 18;
	} else if (cuInvOffer.round == 4) {
		maxOfficelv = 27;
	} else if (cuInvOffer.round == 5) {
		maxOfficelv = 45;
		if (division.name == "Cigarette") {
			maxOfficelv = 189; // 9 + 180
			const cc = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
			if (cc.funds >= 10e15) { //10q money
				maxOfficelv = 243; // 9 + 234
			}
		}
		if (division.name == "BDMS") maxOfficelv = 117; // 9 + 108
		const cc = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
		if (cc.funds >= 10e30) {
			maxOfficelv = 2349; // 9 + 2340
		}
		if (cc.funds >= 10e69) {
			maxOfficelv = 4689; // 9 + 4680
		}
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
				await setEmployee(ns, division, city, 1, 1, 1, 0, 0, 0);
			} else if (cuInvOffer.round >= 2) { // 9 Employee
				strFName = "corporation.getOffice"
				let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
				if (constOffice.avgMorale < 95) {
					await setEmployee(ns, division, city, 1, 1, 1, 1, 1, 4);
				} else {
					await setEmployee(ns, division, city, 2, 2, 2, 1, 2, 0);
				}
				if (cuInvOffer.round >= 3) {
					//CheckStorage Full
					let isStoFull = false;
					let insWH = null;
					strFName = "corporation.getWarehouse";
					insWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
						`Temp/${strFName}.arm.txt`, [division.name, city]);
					isStoFull = ((insWH.size - insWH.sizeUsed) <= 1000);
					strFName = "corporation.getMaterial";
					let thisMaterial = null;
					thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Food"]);
					//log(ns, " " + " @City= " + city + " Food" + " => " + formatNumber(thisMaterial.stored));
					let nFood = thisMaterial.stored;
					thisMaterial = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
						`Temp/${strFName}.arm.txt`, [division.name, city, "Plants"]);
					let nPlants = thisMaterial.stored;
					if (division.type == "Agriculture") {
						if (isStoFull) { //Stop produce but still sell
							await setEmployee(ns, division, city, 0, 0, 3, 2, 1 + ((maxOfficelv / 9) - 1) * 9, 3);
							//if (maxOfficelv == 18) await setEmployee(ns, division, city, 0, 0, 3, 2, 10, 3);
							//if (maxOfficelv == 27) await setEmployee(ns, division, city, 0, 0, 3, 2, 19, 3);
						} else { //Start produce
							if (division.researchPoints >= 1e6) {
								await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
							} else {
								await setEmployee(ns, division, city, 3, 2, 2, 2, 0 + ((maxOfficelv / 9) - 1) * 9, 0);
							}
							//if (maxOfficelv == 18) await setEmployee(ns, division, city, 3, 2, 2, 2, 9, 0);
							//if (maxOfficelv == 27) await setEmployee(ns, division, city, 3, 2, 2, 2, 18, 0);
						}
					} else if (division.type == "Chemical" || division.type == "Pharmaceutical" || division.type == "Spring Water" || division.type == "Water Utilities") {
						if (isStoFull) { //Stop produce but R&D
							await setEmployee(ns, division, city, 0, 0, 0, 2, 5 + ((maxOfficelv / 9) - 1) * 9, 2);
						} else { //Start produce but no saleman
							if (division.researchPoints >= 1e6) {
								await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
							} else {
								await setEmployee(ns, division, city, 3, 2, 0, 2, 2 + ((maxOfficelv / 9) - 1) * 9, 0);
							}
						}
					} else if (division.type == "Tobacco") {
						if (isStoFull) { //Stop produce but R&D
							await setEmployee(ns, division, city, 0, 0, 0, 2, 5 + ((maxOfficelv / 9) - 1) * 9, 2);
						} else { //Start produce with saleman
							if (city == "Sector-12") { // should be 27 employee
								await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
							} else {
								await setEmployee(ns, division, city, 3, 2, 1, 2, 1 + ((maxOfficelv / 9) - 1) * 9, 0);
							}
						}
					} else if (division.type == "Restaurant") {
						if (isStoFull) { //Stop produce but R&D
							//await setEmployee(ns, division, city, 0, 0, 0, 2, 5 + ((maxOfficelv / 9) - 1) * 9, 2);
							await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
						} else { //Start produce with saleman
							if (city == "Sector-12") { // should be 27 employee
								await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
							} else {
								await setEmployee(ns, division, city, 3, 2, 1, 2, 1 + ((maxOfficelv / 9) - 1) * 9, 0);
							}
						}
					} else if (division.type == "Healthcare") {
						if (isStoFull) { //Stop produce but R&D
							//await setEmployee(ns, division, city, 0, 0, 0, 2, 5 + ((maxOfficelv / 9) - 1) * 9, 2);
							await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
						} else { //Start produce with saleman
							if (city == "Sector-12") { // should be 27 employee
								await setEmployee(ns, division, city, 3 + Math.floor((maxOfficelv / 9) / 2) * 9, 2 + Math.floor((maxOfficelv / 9) / 2) * 9, 1, 2, 1, 0);
							} else {
								await setEmployee(ns, division, city, 3, 2, 1, 2, 1 + ((maxOfficelv / 9) - 1) * 9, 0);
							}
						}
					}
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
 * @param {Division} division 
 * @param {string} city 
 * @param {number} nOpr
 * @param {number} nEng
 * @param {number} nBus
 * @param {number} nMan
 * @param {number} nRnD
 * @param {number} nInt */
async function setEmployee(ns, division, city, nOpr, nEng, nBus, nMan, nRnD, nInt) {
	//let strFName = "";
	strFName = "corporation.setAutoJobAssignment";
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Operations", 0]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Engineer", 0]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Business", 0]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Management", 0]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Research & Development", 0]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Intern", 0]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Operations", nOpr]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Engineer", nEng]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Business", nBus]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Management", nMan]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Research & Development", nRnD]);
	await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])&&true`,
		`Temp/${strFName}.arm.txt`, [division.name, city, "Intern", nInt]);
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initOfficeParty(ns, division) {
	if (prevState == "START") {
		//let strFName = "";
		//getOffice(divisionName, city)
		//throwParty(divisionName, city, costPerEmployee)
		//buyTea(divisionName, city)
		for (const city of cities) {
			strFName = "corporation.getOffice"
			let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			//log(ns, " constOffice.avgMorale => " + formatNumber(constOffice.avgMorale) + " of city => " + city);
			//log(ns, " constOffice.avgEnergy => " + formatNumber(constOffice.avgEnergy) + " of city => " + city);
			//log(ns, " constOffice.totalExp  => " + formatNumber(constOffice.totalExperience) + " of city => " + city);
			strFName = "corporation.hasResearched"
			let hasGoJuice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, "Go-Juice"]);
			let hasStiMu = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, "Sti.mu"]);

			if (constOffice.avgMorale < (97 + (hasStiMu ? 10 : 0))) {
				strFName = "corporation.throwParty"
				let numThrowParty = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
					`Temp/${strFName}.arm.txt`, [division.name, city, 500e3]);
				log(ns, " "
					+ ",Division=>" + division.name.slice(0, 4)
					+ ",City=>" + city.slice(0, 2)
					+ ",numThrowParty=>" + numThrowParty
				);
			}
			if (constOffice.avgEnergy < (97 + (hasGoJuice ? 10 : 0))) {
				strFName = "corporation.buyTea"
				let numBuyTea = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
				log(ns, " "
					+ ",Division=>" + division.name.slice(0, 4)
					+ ",City=>" + city.slice(0, 2)
					+ ",numBuyTea=>" + numBuyTea
				);
			}
		}
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function reportProduction(ns, division) {
	//let strFName = "";
	let avgMo = 0, avgEn = 0, tolEx = 0, numCity = 0, tolEmp = 0;
	for (const city of cities) {
		strFName = "corporation.getOffice"
		let thisOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, city]);
		numCity++;
		avgMo += thisOffice.avgMorale;
		avgEn += thisOffice.avgEnergy;
		tolEx += thisOffice.totalExperience;
		tolEmp += thisOffice.numEmployees;
	}
	if (numCity > 0) {
		avgMo = avgMo / numCity;
		avgEn = avgEn / numCity;
	}
	ns.print(" "
		+ " == Report of " + division.name.slice(0, 4)
		+ "(" + division.type.slice(0, 4) + ")"
		+ ",Mo=" + formatNumberShort(avgMo, 4, 1)
		+ ",En=" + formatNumberShort(avgEn, 4, 1)
		+ ",Ex=" + formatNumberShort(tolEx / tolEmp, 4, 1)
		+ ",Ml=" + formatNumberShort(division.productionMult, 4, 1)
		+ ",Rp=" + formatNumberShort(division.researchPoints, 4, 1)
	);
	ns.print(" "
		+ "  @     Q Prod stock sell prod   MP  dem  com    Warehouse   Lv %Develop"
	);
	for (const city of cities) {
		if (!division.makesProducts) {
			strFName = "corporation.getWarehouse"
			let inWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			strFName = "corporation.getIndustryData";
			let inCIndData = null;
			inCIndData = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
				`Temp/${strFName}.arm.txt`, [division.type]);

			for (let i = 0; i < inCIndData.producedMaterials.length; i++) {
				strFName = "corporation.getMaterial"
				let inMat = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
					`Temp/${strFName}.arm.txt`, [division.name, city, inCIndData.producedMaterials[i]]);
				const chkKey = `${division.name.slice(0, 4)}-`
					+ `${city.slice(0, 2)}-`
					+ `${inCIndData.producedMaterials[i].slice(0, 2)}`;
				const chkAutoPrice = autoPricesByKey[chkKey];
				let chkPrice = 0;
				if (chkAutoPrice) {
					chkPrice = chkAutoPrice.price
				}
				ns.print(" "
					+ " " + city.slice(0, 2)
					+ " " + pad_str(formatNumberShort(inMat.quality, 3, 1), 5)
					+ " " + pad_str(inCIndData.producedMaterials[i].slice(0, 5), 5)
					+ " " + pad_str(formatNumberShort(inMat.stored, 2, 1), 4)
					+ " " + pad_str(formatNumberShort(inMat.actualSellAmount, 2, 1), 4)
					+ " " + pad_str(formatNumberShort(inMat.productionAmount, 2, 1), 4)
					+ " " + pad_str(formatNumberShort(inMat.marketPrice, 2, 1), 4)
					+ " " + pad_str(formatNumberShort(inMat.demand, 2, 1), 4)
					+ " " + pad_str(formatNumberShort(inMat.competition, 2, 1), 4)
					//+ " " + pad_str(formatNumberShort(inMat.desiredSellAmount, 2, 1), 4) //NaN
					//+ " " + pad_str(formatNumberShort(inMat.desiredSellPrice, 2, 1), 4) //NaN
					//+ " " + pad_str(inMat.exports.division, 8) //Object
					+ " " + pad_str(formatNumberShort(inWH.sizeUsed, 2, 1), 4)
					+ "/" + pad_str(formatNumberShort(inWH.size, 2, 1), 4)
					+ "(" + pad_str(formatNumberShort(inWH.sizeUsed / inWH.size * 100, 2, 1), 2) + ")"
					+ " " + pad_str(formatNumberShort(inWH.level, 2, 1), 3) + ""
					//+ " " + pad_str(formatNumberShort(chkPrice, 2, 1), 4)
				);
			}
		} else {
			if (city == "Sector-12") {
				strFName = "corporation.getWarehouse"
				let inWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
				for (let i = 0; i < division.products.length; i++) {
					strFName = "corporation.getProduct"
					let inProd = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])`,
						`Temp/${strFName}.arm.txt`, [division.name, city, division.products[i]]);
					const chkKey = `${division.name.slice(0, 4)}-`
						+ `${city.slice(0, 2)}-`
						+ `${inProd.name.slice(0, 5)}`;
					const chkAutoPrice = autoPricesByKey[chkKey];
					let chkPrice = 0;
					if (chkAutoPrice) {
						chkPrice = chkAutoPrice.price
					}
					ns.print(" "
						+ " " + city.slice(0, 2)
						+ " " + pad_str(formatNumberShort(inProd.effectiveRating, 3, 1), 5)
						+ " " + pad_str(inProd.name.slice(0, 5), 5)
						+ " " + pad_str(formatNumberShort(inProd.stored, 2, 1), 4)
						+ " " + pad_str(formatNumberShort(inProd.actualSellAmount, 2, 1), 4)
						+ " " + pad_str(formatNumberShort(inProd.productionAmount, 2, 1), 4)
						+ " " + pad_str(formatNumberShort(inProd.productionCost, 2, 1), 4)
						+ " " + pad_str(formatNumberShort(inProd.demand, 2, 1), 4)
						+ " " + pad_str(formatNumberShort(inProd.competition, 2, 1), 4)
						//+ " " + pad_str(formatNumberShort(inMat.desiredSellAmount, 2, 1), 4) //NaN
						//+ " " + pad_str(formatNumberShort(inMat.desiredSellPrice, 2, 1), 4) //NaN
						//+ " " + pad_str(inMat.exports.division, 8) //Object
						+ " " + pad_str(formatNumberShort(inWH.sizeUsed, 2, 1), 4)
						+ "/" + pad_str(formatNumberShort(inWH.size, 2, 1), 4)
						+ "(" + pad_str(formatNumberShort(inWH.sizeUsed / inWH.size * 100, 2, 1), 2) + ")"
						+ " " + pad_str(formatNumberShort(inWH.level, 2, 1), 3) + ""
						+ " " + pad_str(formatNumberShort(inProd.developmentProgress, 4, 1), 4)
						//+ " " + pad_str(formatNumberShort(chkPrice, 2, 1), 4)
					);
				}
			}
		}
	}
}

/** 
 * @param {NS} ns */
async function phaseAdvancing(ns) {
	//let strFName = "";
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
	let numTarget = 130e9;
	strFName = "corporation.getInvestmentOffer"
	cuInvOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	if (cuInvOffer.round == 1) numTarget = 140e9;		//140b
	if (cuInvOffer.round == 2) numTarget = 1.41e12; //1.4t
	if (cuInvOffer.round == 3) numTarget = 11.31e12;// 11t
	if (cuInvOffer.round == 4) numTarget = 1.01e15; //1.0q
	if (cuInvOffer.round == 5) numTarget = 1.01e18; //1.0Q

	log(ns, ""
		+ ",Ro " + cuInvOffer.round
		+ ",Sh " + formatNumberShort(cuInvOffer.shares)
		+ ",Of " + formatMoney(cuInvOffer.funds)
		+ ",Tg " + formatMoney(numTarget)
	);
	//log(ns, " " + "cuInvOffer.funds" + " => " + formatMoney(cuInvOffer.funds) + " target => " + formatMoney(numTarget));
	//log(ns, " " + "cuInvOffer.round" + " => " + cuInvOffer.round);
	//log(ns, " " + "cuInvOffer.shares" + " => " + formatNumberShort(cuInvOffer.shares));
	strFName = "corporation.getCorporation"
	let cc = await getNsDataThroughFile(ns, `ns.${strFName}()`);
	let ownerShares = cc.totalShares - cc.investorShares - cc.issuedShares;
	ns.print(""
		+ ",Va " + pad_str(formatMoney(cc.valuation), 8)
		+ ",SP " + pad_str(formatMoney(cc.sharePrice), 8)
		+ ",Tax " + cc.dividendTax
		+ ",DR " + cc.dividendRate
		+ ",DE " + formatNumberShort(cc.dividendEarnings)
	);
	ns.print(""
		+ ",Fu " + pad_str(formatMoney(cc.funds), 8)
		+ ",Re " + pad_str(formatMoney(cc.revenue), 8)
		+ ",Ex " + pad_str(formatMoney(cc.expenses), 8)
		+ ",Pf " + pad_str(formatMoney(cc.revenue - cc.expenses), 8)
	);
	ns.print(""
		+ "Share "
		+ ",Tt " + formatNumberShort(cc.totalShares)
		+ ",In " + formatNumberShort(cc.investorShares)
		+ ",IS " + formatNumberShort(cc.issuedShares)
		+ ",Ow " + formatNumberShort(ownerShares)
	);
	ns.print(""
		+ ",SS " + formatMoney((ownerShares - 1e6) * cc.sharePrice * 4 / 5)
		+ ",ShSell CD " + formatDuration(cc.shareSaleCooldown * 200)
		+ ",newShr CD " + formatDuration(cc.issueNewSharesCooldown * 200)
	);
	ns.print(""
		+ ",prevState " + pad_str(prevState, 10)
		+ ",nextState " + pad_str(nextState, 10)
	);
	if (cuInvOffer.round == 1 && cuInvOffer.funds > numTarget) {
		strFName = "corporation.acceptInvestmentOffer"
		let boolAccOffer = null;
		boolAccOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
		log(ns, " " + "boolAccOffer" + " => " + boolAccOffer);
		persist_log(ns, ""
			+ "Accept Offer R=" + cuInvOffer.round
			+ " money=" + formatMoney(cuInvOffer.funds)
		);
	} else if (cuInvOffer.round == 2 && cuInvOffer.funds > numTarget) {
		strFName = "corporation.acceptInvestmentOffer"
		let boolAccOffer = null;
		boolAccOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
		log(ns, " " + "boolAccOffer" + " => " + boolAccOffer);
		persist_log(ns, ""
			+ "Accept Offer R=" + cuInvOffer.round
			+ " money=" + formatMoney(cuInvOffer.funds)
		);
	} else if (cuInvOffer.round == 3 && cuInvOffer.funds > numTarget) {
		strFName = "corporation.acceptInvestmentOffer"
		let boolAccOffer = null;
		boolAccOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
		log(ns, " " + "boolAccOffer" + " => " + boolAccOffer);
		persist_log(ns, ""
			+ "Accept Offer R=" + cuInvOffer.round
			+ " money=" + formatMoney(cuInvOffer.funds)
		);
	} else if (cuInvOffer.round == 4 && cuInvOffer.funds > numTarget) {
		strFName = "corporation.acceptInvestmentOffer"
		let boolAccOffer = null;
		boolAccOffer = await getNsDataThroughFile(ns, `ns.${strFName}()`);
		log(ns, " " + "boolAccOffer" + " => " + boolAccOffer);
		persist_log(ns, ""
			+ "Accept Offer R=" + cuInvOffer.round
			+ " money=" + formatMoney(cuInvOffer.funds)
		);
	} else if (cuInvOffer.round == 5) {
		if (prevState == "SALE") {
			if (!cc.public) {
				strFName = "corporation.goPublic"
				let numShare4Pub = 1e9;
				let boolGoPublic = null;
				boolGoPublic = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
					`Temp/${strFName}.arm.txt`, [numShare4Pub]);
				strFName = "corporation.buyBackShares"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
					`Temp/${strFName}.arm.txt`, [numShare4Pub]);
				//issueDividends(rate)
				let numDivRate = 0.10;
				strFName = "corporation.issueDividends"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
					`Temp/${strFName}.arm.txt`, [numDivRate]);
			} else {
				let numDivRate = 0.10;
				strFName = "corporation.issueDividends"
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
					`Temp/${strFName}.arm.txt`, [numDivRate]);
				if (cc.issueNewSharesCooldown <= 0) {
					//issueNewShares(amount)
					let player = await getPlayerInfo(ns);
					let corpMoney = 0;
					strFName = "corporation.issueNewShares"
					corpMoney = await getNsDataThroughFile(ns, `ns.${strFName}()`);
					persist_log(ns, "Corp got money from issueNewShare = " + formatMoney(corpMoney));
					strFName = "corporation.getCorporation"
					cc = await getNsDataThroughFile(ns, `ns.${strFName}()`);
					//cc.numShares = cc.totalShares - cc.investorShares - cc.issuedShares;
					persist_log(ns, ""
						+ "Share "
						+ ",Tt " + formatNumberShort(cc.totalShares)
						+ ",In " + formatNumberShort(cc.investorShares)
						+ ",IS " + formatNumberShort(cc.issuedShares)
						+ ",Ow " + formatNumberShort(cc.numShares)
					);
				}
				if (cc.issuedShares > 0) {
					//buyBackShares(amount)
					//amount = cc.issuedShares
					try {
						let player = await getPlayerInfo(ns);
						strFName = "corporation.buyBackShares"
						await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])||true`,
							`Temp/${strFName}.arm.txt`, [cc.issuedShares]);
					} catch (err) {

					}
				}
			}
		}
	}
	if (options['sellshare-1hr'] && (cc.shareSaleCooldown <= 0)) {
		/*
		1. Go Public 1m share
		2. buy back 1m share if possible
		3. sell all share for player money
		4. re-create corporation
		*/
		if (!cc.public) {
			strFName = "corporation.goPublic"
			let numShare4Pub = 1e6;
			let boolGoPublic = null;
			boolGoPublic = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
				`Temp/${strFName}.arm.txt`, [numShare4Pub]);
			strFName = "corporation.buyBackShares"
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
				`Temp/${strFName}.arm.txt`, [numShare4Pub]);
		}
		strFName = "corporation.getCorporation"
		cc = await getNsDataThroughFile(ns, `ns.${strFName}()`);
		ownerShares = cc.totalShares - cc.investorShares - cc.issuedShares;
		let player = await getPlayerInfo(ns);
		let curMoney = player.money;
		strFName = "corporation.sellShares"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
			`Temp/${strFName}.arm.txt`, [ownerShares - 1e6]);
		player = await getPlayerInfo(ns);
		let difMoney = player.money - curMoney
		persist_log(ns, "Sell Share = " + formatMoney(difMoney));
		if ((3 in unlockedSFs)) {
			strFName = "corporation.createCorporation";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, ["Eternity", false]);
		} else {
			strFName = "corporation.createCorporation";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, ["Eternity", true]);
		}
	}
}

/** 
 * @param {NS} ns
 * @param {CorpIndustryName} industryName */
async function printCorpIndustryDataConst(ns, industryName) {
	//let strFName = "";
	strFName = "corporation.getIndustryData";
	//ns.corporation.getIndustryData();
	let locCorpIndustryData = null;
	locCorpIndustryData = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
		`Temp/${strFName}.arm.txt`, [industryName]);
	ns.print(""
		+ ",Ind=" + industryName
		+ ",Cost=" + formatNumberShort(locCorpIndustryData.startingCost)
		+ ",HWr=" + locCorpIndustryData.hardwareFactor
		+ ",RBo=" + locCorpIndustryData.robotFactor
		+ ",AIc=" + locCorpIndustryData.aiCoreFactor
		+ ",REs=" + locCorpIndustryData.realEstateFactor
		+ ",ADv=" + locCorpIndustryData.advertisingFactor
		+ ",SCi=" + locCorpIndustryData.scienceFactor
		+ ",Mate=" + locCorpIndustryData.requiredMaterials
		+ ",Prod=" + locCorpIndustryData.producedMaterials
	);
}
/** 
 * @param {NS} ns
 * @param {Division} division */
async function printConst(ns, division) {
	const corpConst = ns.corporation.getConstants(); //CorpConstants
	//ns.tprint("corpConst.industryNames => " + corpConst.industryNames);
	//baseProductProfitMult
	//ns.tprint("corpConst.baseProductProfitMult => " + corpConst.baseProductProfitMult);
	//issueNewSharesCooldown
	//ns.tprint("corpConst.issueNewSharesCooldown (cycles) => " + corpConst.issueNewSharesCooldown);
	//ns.tprint("corpConst.issueNewSharesCooldown (ms) => " + corpConst.issueNewSharesCooldown * 1000 / 200);
	//ns.tprint("corpConst.issueNewSharesCooldown (s) => " + corpConst.issueNewSharesCooldown / 200);
	ns.print(""
		+ " DivMax=" + corpConst.dividendMaxRate
		+ " BriThr=" + formatMoney(corpConst.bribeThreshold)
		+ " PrdPrf=" + corpConst.baseProductProfitMult
		+ " EmpRis=" + corpConst.employeeRaiseAmount
		+ " IniSha=" + formatNumberShort(corpConst.initialShares)
		+ " EmpTea=" + formatMoney(corpConst.teaCostPerEmployee)
		+ " ShaPri=" + formatNumberShort(corpConst.sharesPerPriceUpdate)
	);
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

function pad_str(string, len) {
	/*
	Prepends the requested padding to the string.
	*/
	var pad = "                                   "
	return String(pad + string).slice(-len)
}

/** Append the specified text (with timestamp) to a persistent log in the home directory
 * @param {String} text
 * @param {NS} ns */
function persist_log(ns, text) {
	ns.write(persistCorpLog, `${(new Date()).toISOString().substring(0, 19)} ${text}\n`, "a")
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
