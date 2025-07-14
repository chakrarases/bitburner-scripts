import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatNumber, getErrorInfo, tail
} from './helpers.js'

/** @param {NS} ns */
export async function main(ns) {
	ns.exec("go.js", "home");
	ns.exec("HAllH0.js", "home");
	await ns.nuke("n00dles");
	//ns.stanek.acceptGift();
	await getNsDataThroughFile(ns, 'ns.stanek.acceptGift()')
	let RAM = ns.getServerMaxRam("home") * 0.9;
	ns.exec("/scripts/weaken.js", "home", Math.floor(RAM / 460 * 20 - 5), "n00dles");
	ns.exec("/scripts/hack.js", "home", Math.floor(RAM / 460 * 250 - 10), "n00dles");

	//ns.singularity.commitCrime("Shoplift",false);
	let crimeTime = await getNsDataThroughFile(ns, 'ns.singularity.commitCrime(ns.args[0], ns.args[1])', null, ["Shoplift", false]);
	const player = await getPlayerInfo(ns);
	while (player.money < 250000) {
		await ns.asleep(2000);
	}
	await ns.asleep(1000);
	ns.exec("casino.js", "home", 1, "--on-completion-script", "2ndPart.js");
}

/** Ram-dodge getting player info.
 * @param {NS} ns
 * @returns {Promise<Player>} */
async function getPlayerInfo(ns) {
	return await getNsDataThroughFile(ns, 'ns.getPlayer()');
}
