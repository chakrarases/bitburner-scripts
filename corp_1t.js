import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatNumber, getErrorInfo, tail
} from './helpers.js'

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("disableLog"); ns.disableLog("sleep");
  log(ns, "Corp: start");

	if (!ns.getPlayer().hasCorporation) {
    log(ns, "Corp: Create corp name = Eterniry");
		await getNsDataThroughFile(ns, 'ns.corporation.createCorporation(ns.args[0])', null, ["Eternity"]);
	}
  //resetInfo = await getNsDataThroughFile(ns, 'ns.getResetInfo()');
	let corp = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()');
	if (corp.divisions.length < 1) {
		// initial Company setup
    log(ns, "Corp: init setup");
		//homeRam = await getNsDataThroughFile(ns, `ns.getServerMaxRam(ns.args[0])`, null, ["home"]);
    log(ns, "Corp: new industry = Agriculture");
    await getNsDataThroughFile(ns, 'ns.corporation.expandIndustry(ns.args[0],ns.args[1])', null, ["Agriculture", "Agriculture"]);
		corp = await getNsDataThroughFile(ns, 'ns.corporation.getCorporation()');
		await initialCorpUpgrade(ns);
		await initCities(ns, corp.divisions[0]);
	}
}

async function initialCorpUpgrade(ns) {
	log(ns, "Upgrade: Smart Supply");
	//ns.corporation.unlockUpgrade("Smart Supply");
  if(!await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Smart Supply"])){
    await getNsDataThroughFile(ns, 'ns.corporation.purchaseUnlock(ns.args[0])', null, ["Smart Supply"]);
  }
	log(ns, "Upgrade: 2 x Smart Factories, FocusWires, Neural Accelerators, Speech Processor Implants, Nuoptimal Nootropic Injector Implants");
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Smart Factories"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Smart Factories"]);
	//ns.corporation.levelUpgrade("Smart Storage");
	//ns.corporation.levelUpgrade("DreamSense");
	// upgrade employee stats
	//ns.corporation.levelUpgrade("Nuoptimal Nootropic Injector Implants");
	//ns.corporation.levelUpgrade("Speech Processor Implants");
	//ns.corporation.levelUpgrade("Neural Accelerators");
	//ns.corporation.levelUpgrade("FocusWires");
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["FocusWires"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["FocusWires"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Neural Accelerators"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Neural Accelerators"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Speech Processor Implants"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Speech Processor Implants"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Nuoptimal Nootropic Injector Implants"]);
	await getNsDataThroughFile(ns, 'ns.corporation.levelUpgrade(ns.args[0])', null, ["Nuoptimal Nootropic Injector Implants"]);
}

async function initCities(ns, division, productCity = "Sector-12") {
	for (const city of cities) {
		log(ns, "Expand: " + division.name + " to City " + city);
		if (!division.cities.includes(city)) {
      //await getNsDataThroughFile(ns, 'ns.corporation.expandIndustry(ns.args[0],ns.args[1])', null, ["Agriculture", "Agriculture"]);
			await getNsDataThroughFile(ns, 'ns.corporation.expandCity(ns.args[0],ns.args[1])', null, [division.name, city]);
			await getNsDataThroughFile(ns, 'ns.corporation.purchaseWarehouse(ns.args[0],ns.args[1])', null, [division.name, city]);
		}

		//ns.corporation.setSmartSupply(division.name, city, true); // does not work anymore, bug?
    if(await getNsDataThroughFile(ns, 'ns.corporation.hasUnlock(ns.args[0])', null, ["Smart Supply"])){
      await getNsDataThroughFile(ns, 'ns.corporation.setSmartSupply(ns.args[0],ns.args[1],ns.args[2])', null, [division.name, city, true]);
    }

    const whUp = 3;
    //ns.corporation.upgradeWarehouse(division.name, city, whUp);
		log(ns, "Expand: Upgrade Warehouse in City " + city);
    await getNsDataThroughFile(ns, 'ns.corporation.upgradeWarehouse(ns.args[0],ns.args[1],ns.args[2])', null, [division.name, city, whUp]);
    // get more employees in the main product development city
    //const newEmployees = 9;
    //ns.corporation.upgradeOfficeSize(division.name, productCity, newEmployees);
		log(ns, "Expand: Hire 3 employee in City " + city);
    for (let i = 0; i < 3; i++) {
      await getNsDataThroughFile(ns, 'ns.corporation.hireEmployee(ns.args[0],ns.args[1])', null, [division.name, city]);
    }
		log(ns, "Expand: assign employee in City " + city);
    await getNsDataThroughFile(ns, 'ns.corporation.setAutoJobAssignment(ns.args[0],ns.args[1],ns.args[2],ns.args[3])', null, [division.name, city, "Operations", 1]);
    await getNsDataThroughFile(ns, 'ns.corporation.setAutoJobAssignment(ns.args[0],ns.args[1],ns.args[2],ns.args[3])', null, [division.name, city, "Engineer", 1]);
    await getNsDataThroughFile(ns, 'ns.corporation.setAutoJobAssignment(ns.args[0],ns.args[1],ns.args[2],ns.args[3])', null, [division.name, city, "Business", 1]);
    //await ns.corporation.setAutoJobAssignment(division.name, city, "Engineer", 1);
    //await ns.corporation.setAutoJobAssignment(division.name, city, "Business", 1);
	}

	//ns.corporation.makeProduct(division.name, productCity, "Product-0", "1e9", "1e9");
}
