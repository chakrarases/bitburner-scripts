import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatDuration2, formatNumber, formatNumberShort, getErrorInfo, tail
} from './helpers.js'

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
	['div-n', "dummy"], // Division name
	['div-t', "Agriculture"], // Division Type
	['Op', 1], // EmployeeNum:Operations
	['En', 1], // EmployeeNum:Engineer
	['Bu', 1], // EmployeeNum:Business
	['Ma', 1], // EmployeeNum:Management
	['RD', 0], // EmployeeNum:Research & Development
	['In', 0], // EmployeeNum:Intern
	['Wh', 1], // LevelNum:Warehouse
	['Hw', 0], // Goods:Hardware
	['Rb', 0], // Goods:Robots
	['AI', 0], // Goods:AI Cores
	['RE', 0], // Goods:Real Estate
];

let currCorp = null;

let strFName = "";
let options; // The options used at construction time
let resetInfo = (/**@returns{ResetInfo}*/() => undefined)(); // Information about the current bitnode
let bitNodeMults = (/**@returns{BitNodeMultipliers}*/() => undefined)(); // bitNode multipliers that can be automatically determined after SF-5
let dictOwnedSourceFiles = (/**@returns{{[k: number]: number;}}*/() => [])(); // Player owned source files
let unlockedSFs = [], nextBn = 0; // Info for the current bitnode
let homeRam = 0; // Amount of RAM on the home server, last we checked
let txtDivisName = "";
let txtDivisType = "";
let numOperations = "";
let numEngineer = "";
let numManagement = "";
let numBusiness = "";
let numRnD = "";
let numInturn = "";
let numWarehouseLevel = "";
let numHardware = "";
let numRobots = "";
let numAICore = "";
let numRealEstate = "";

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');
	ns.disableLog("disableLog"); ns.disableLog("sleep");

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
	/** @param {NS} ns **/
	async function main_start(ns) {
		const runOptions = getConfiguration(ns, argsSchema);
		if (!runOptions || await instanceCount(ns) > 1) return; // Prevent multiple instances of this script from being started, even with different args.
		options = runOptions; // We don't set the global "options" until we're sure this is the only running instance

		txtDivisName = options['div-n'];
		txtDivisType = options['div-t'];
		numOperations = options['Op'];
		numEngineer = options['En'];
		numBusiness = options['Bu'];
		numManagement = options['Ma'];
		numRnD = options['RD'];
		numInturn = options['In'];
		numWarehouseLevel = options['Wh'];
		numHardware = options['Hw'];
		numRobots = options['Rb'];
		numAICore = options['AI'];
		numRealEstate = options['RE'];

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

		let numOfficeSize = numOperations
			+ numEngineer
			+ numBusiness
			+ numManagement
			+ numRnD
			+ numInturn
			;

		//Check Division, if null = create new division
		let division = null;
		let corpInfo = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()'); //CorporationInfo
		let isDivExist = false;
		for (const div of corpInfo.divisions) {
			if (txtDivisName == div) isDivExist = true;
		}
		if (!isDivExist) { // Create new division
			//expandIndustry(industryType, divisionName)
			strFName = "corporation.expandIndustry";
			await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
				`Temp/${strFName}.arm.txt`, [txtDivisType, txtDivisName]);
		}
		//Get Division variable
		strFName = "corporation.getDivision";
		division = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
			`Temp/${strFName}.arm.txt`, [txtDivisName]);

		for (const city of cities) { //Start set officeSize
			if (!division.cities.includes(city)) {
				//ns.corporation.expandCity(division.name, city);
				strFName = "corporation.expandCity"; //
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
				//log(ns, "Expand to city == " + city);
			}
			strFName = "corporation.getOffice"; //
			let constOffice = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			let diffOfficeSize = numOfficeSize - constOffice.size;
			if (diffOfficeSize > 0) {
				strFName = "corporation.upgradeOfficeSize";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, diffOfficeSize]);
			}
			for (let i = constOffice.numEmployees; i < numOfficeSize; i++) {
				//ns.corporation.hireEmployee(division.name, city);
				strFName = "corporation.hireEmployee";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])&&true`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
			}
			//Set Employee
			await setEmployee(ns, division, city
				, numOperations
				, numEngineer
				, numBusiness
				, numManagement
				, numRnD
				, numInturn);

			//Set warehouseSize
			let isHasWH = false;
			strFName = "corporation.hasWarehouse"; //
			isHasWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`/Temp/${strFName}.arm.txt`, [division.name, city]);
			if (!isHasWH) { //not hasWH , purchaseWarehouse(divisionName, city)
				strFName = "corporation.purchaseWarehouse"; //
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city]);
			}
			let insWH = null;
			strFName = "corporation.getWarehouse";
			insWH = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
				`Temp/${strFName}.arm.txt`, [division.name, city]);
			//upgradeWarehouse(divisionName, city, amt)
			let diffWarehouseSize = numWarehouseLevel - insWH.level;
			//ns.tprint("difWH:=" + diffWarehouseSize + ",numWH:=" + numWarehouseLevel + ",curWH:=" + insWH.level);
			if (diffWarehouseSize > 0) {
				strFName = "corporation.upgradeWarehouse";
				await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2])||true`,
					`Temp/${strFName}.arm.txt`, [division.name, city, diffWarehouseSize]);
			}
			await setupMaterial(ns, division, city, "Hardware", numHardware);
			await setupMaterial(ns, division, city, "Robots", numRobots);
			await setupMaterial(ns, division, city, "AI Cores", numAICore);
			await setupMaterial(ns, division, city, "Real Estate", numRealEstate);


			await initSellPrice(ns, division, city);
			await turnOnMarketTA12(ns, division, city);
		}
	}


	// Invoke the main function
	await main_start(ns);
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function initSellPrice(ns, division, city) {
	strFName = "corporation.getIndustryData";
	let inCIndData = null;
	inCIndData = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0])`,
		`Temp/${strFName}.arm.txt`, [division.type]);
	for (let i = 0; i < inCIndData.producedMaterials.length; i++) {
		strFName = "corporation.sellMaterial"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3],ns.args[4])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, inCIndData.producedMaterials[i], "MAX", "MP"]);
	}
}

/** 
 * @param {NS} ns
 * @param {Division} division */
async function turnOnMarketTA12(ns, division, city) {
	let txtReName = "Market-TA.II";
	strFName = "corporation.hasResearched";
	let hasMarketT2 = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
		`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
	if (hasMarketT2) {
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
	} else {
		txtReName = "Market-TA.I";
		strFName = "corporation.hasResearched";
		let hasMarketT1 = await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1])`,
			`Temp/${strFName}.arm.txt`, [division.name, txtReName]);
		if (hasMarketT1) {
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
	if (diffAdd > 0) {
		strFName = "corporation.bulkPurchase"
		await getNsDataThroughFile(ns, `ns.${strFName}(ns.args[0],ns.args[1],ns.args[2],ns.args[3])||true`,
			`Temp/${strFName}.arm.txt`, [division.name, city, setCorpMaterialName, diffAdd]);
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
