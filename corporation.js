import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatNumber, getErrorInfo, tail
} from './helpers.js'

const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("disableLog"); ns.disableLog("sleep");

	let corp = ns.corporation.getCorporation(); //Return CorporationInfo interface
	//https://github.com/bitburner-official/bitburner-src/blob/stable/markdown/bitburner.corporationinfo.md
	//Debuging and finding the right API
	//corp.canCreateCorporation();
	ns.tprint("Output == " + ns.corporation.canCreateCorporation(true));

	/*
	if (!ns.getPlayer().hasCorporation) {
		ns.corporation.createCorporation("Eternity", true);
	}
	//var corp = ns.corporation.getCorporation();
	if (corp.divisions.length < 1) {
		// initial Company setup
		ns.corporation.expandIndustry("Agriculture", "Agriculture");
		corp = ns.corporation.getCorporation();
		await initialCorpUpgrade(ns);
		await initCities(ns, corp.divisions[0]);
	}
	//await initialCorpUpgrade(ns);
	//await initCities(ns, corp.divisions[0]);
	ns.tprint(`getIndustryData == `+ ns.corporation.getIndustryData("Agriculture"));
	ns.tprint(`getIndustryData.description == `+ ns.corporation.getIndustryData("Agriculture").description);
	ns.tprint(`getIndustryData.advertisingFactor? == `+ ns.corporation.getIndustryData("Agriculture").advertisingFactor);
	//getExpandIndustryCost
	ns.tprint(`getIndustryData.getExpandIndustryCost? == `+ ns.corporation.getIndustryData("Agriculture").getExpandIndustryCost);
	//const corp = ns.corporation;
	ns.tprint(`corporation money == ` + corp.funds);
	*/
}

async function initCities(ns, division, productCity = "Sector-12") {
	for (const city of cities) {
		if (!division.cities.includes(city)) {
			ns.corporation.expandCity(division.name, city);
			ns.corporation.purchaseWarehouse(division.name, city);
			ns.corporation.purchaseWarehouse(division.name, city);
			ns.corporation.purchaseWarehouse(division.name, city);
		}
	}
}

async function initialCorpUpgrade(ns) {
	log(ns, "1st Upgrade Corp");
	ns.corporation.hasUnlock("Smart Supply");
	ns.corporation.levelUpgrade("Smart Storage");
	ns.corporation.levelUpgrade("Smart Storage");
	// upgrade employee stats
	ns.corporation.levelUpgrade("FocusWires");
	ns.corporation.levelUpgrade("FocusWires");
	ns.corporation.levelUpgrade("Neural Accelerators");
	ns.corporation.levelUpgrade("Neural Accelerators");
	ns.corporation.levelUpgrade("Speech Processor Implants");
	ns.corporation.levelUpgrade("Speech Processor Implants");
	ns.corporation.levelUpgrade("Nuoptimal Nootropic Injector Implants");
	ns.corporation.levelUpgrade("Nuoptimal Nootropic Injector Implants");
}
