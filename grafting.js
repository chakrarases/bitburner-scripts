import {
	log, getFilePath, getConfiguration, instanceCount, getNsDataThroughFile, runCommand, waitForProcessToComplete,
	formatDateTimeElaspe,
	getActiveSourceFiles, tryGetBitNodeMultipliers, getStocksValue, unEscapeArrayArgs,
	formatMoney, formatDuration, formatNumber, getErrorInfo, tail
} from './helpers.js'

const argsSchema = [ // The set of all command line arguments
	['install-for-augs', ["SmartJaw"]], // or... automatically install as soon as we can afford one of these augmentations
];
/** @param {NS} ns */
export async function main(ns) {
	const persistGraftLog = "log.grafting.txt";
	const augTRP = "The Red Pill";
	const augStanek = `Stanek's Gift - Genesis`;

	let options; // The options used at construction time
	let homeRam = 0; // Amount of RAM on the home server, last we checked
	let dictOwnedSourceFiles = (/**@returns{{[k: number]: number;}}*/() => [])(); // Player owned source files
	let unlockedSFs = [], nextBn = 0; // Info for the current bitnode
	let bitNodeMults = (/**@returns{BitNodeMultipliers}*/() => undefined)(); // bitNode multipliers that can be automatically determined after SF-5
	let playerInstalledAugCount = (/**@returns{null|number}*/() => null)(); // Number of augs installed, or null if we don't have SF4 and can't tell.
	let installedAugmentations = [];
	let daemonStartTime = 0; // The time we personally launched daemon.
	let acceptedStanek = false, stanekLaunched = false;

	// Replacements for player properties deprecated since 2.3.0
	function getTimeInAug() { return Date.now() - resetInfo.lastAugReset; }
	function getTimeInBitnode() { return Date.now() - resetInfo.lastNodeReset; }

	/** Ram-dodge getting player info.
	 * @param {NS} ns
	 * @returns {Promise<Player>} */
	async function getPlayerInfo(ns) {
		return await getNsDataThroughFile(ns, `ns.getPlayer()`);
	}
	/** Helper to launch a script and log whether if it succeeded or failed
	 * @param {NS} ns */
	function launchScriptHelper(ns, baseScriptName, args = [], convertFileName = true) {
		if (!options['no-tail-windows'])
			tail(ns); // If we're going to be launching scripts, show our tail window so that we can easily be killed if the user wants to interrupt.
		let pid, err;
		try { pid = ns.run(convertFileName ? getFilePath(baseScriptName) : baseScriptName, 1, ...args); }
		catch (e) { err = e; }
		if (pid)
			log(ns, `INFO: Launched ${baseScriptName} (pid: ${pid}) with args: [${args.join(", ")}]`, true);
		else
			log(ns, `ERROR: Failed to launch ${baseScriptName} with args: [${args.join(", ")}]` +
				(err ? `\nCaught: ${getErrorInfo(err)}` : ''), true, 'error');
		return pid;
	}
	/** Helper to get a list of all scripts running (on home)
	 * @param {NS} ns */
	async function getRunningScripts(ns) {
		return await getNsDataThroughFile(ns, 'ns.ps(ns.args[0])', null, ['home']);
	}
	/** Helper to get the first instance of a running script by name.
	 * @param {NS} ns
	 * @param {string} baseScriptName The name of a script (before applying getFilePath)
	 * @param {ProcessInfo[]} runningScripts - (optional) Cached list of running scripts to avoid repeating this expensive request
	 * @param {(value: ProcessInfo, index: number, array: ProcessInfo[]) => unknown} filter - (optional) Filter the list of processes beyond just matching on the script name */
	function findScriptHelper(baseScriptName, runningScripts, filter = null) {
		return runningScripts.filter(s => s.filename == getFilePath(baseScriptName) && (!filter || filter(s)))[0];
	}
	/** Helper to kill a running script instance by name
	 * @param {NS} ns
	 * @param {ProcessInfo[]} runningScripts - (optional) Cached list of running scripts to avoid repeating this expensive request
	 * @param {ProcessInfo} processInfo - (optional) The process to kill, if we've already found it in advance */
	async function killScript(ns, baseScriptName, runningScripts = null, processInfo = null) {
		processInfo = processInfo || findScriptHelper(baseScriptName, runningScripts || (await getRunningScripts(ns)))
		if (processInfo) {
			log(ns, `INFO: Killing script ${baseScriptName} with pid ${processInfo.pid} and args: [${processInfo.args.join(", ")}].`, false, 'info');
			return await getNsDataThroughFile(ns, 'ns.kill(ns.args[0])', null, [processInfo.pid]);
		}
		log(ns, `INFO: Skipping request to kill script ${baseScriptName}, no running instance was found...`, false, 'warning');
		return false;
	}
	/** Accept Stanek's gift immediately at the start of the BN (as opposed to just before the first install)
	 * if it looks like it will scale well.
	 * @param {NS} ns
	 * @param {Player} player */
	async function maybeAcceptStaneksGift(ns, player) {
		// Look for any reason not to accept stanek's gift (do the quickest checks first)
		if (acceptedStanek) return;
		// Don't get Stanek's gift too early if its size is reduced in this BN
		if (bitNodeMults.StaneksGiftExtraSize < 0) return;
		// If Stanek's gift size isn't reduced, but is penalized, don't get it too early 
		if (bitNodeMults.StaneksGiftExtraSize == 0 && bitNodeMults.StaneksGiftPowerMultiplier < 1) return;
		// Otherwise, it is not penalized in any way, it's probably safe to get it immediately despite the 10% penalty to all stats
		// If we won't have access to Stanek yet, skip this
		if (!(13 in unlockedSFs)) return;
		// If we've already accepted Stanek's gift (Genesis aug is installed), skip
		if (installedAugmentations.includes(augStanek)) return acceptedStanek = true;
		// If we have more than Neuroflux (aug) installed, we won't be allowed to accept the gift (but we can try)
		if (installedAugmentations.length > 1)
			log(ns, `WARNING: We think it's a good idea to accept Stanek's Gift, but it appears to be too late - other augmentations have been installed. Trying Anyway...`);
		// Use the API to accept Stanek's gift
		if (await getNsDataThroughFile(ns, 'ns.stanek.acceptGift()')) {
			log(ns, `SUCCESS: Accepted Stanek's Gift!`, true, 'success');
			installedAugmentations.push(augStanek); // Manually add Genesis to installed augmentations so checkOnRunningScripts picks up on the change.
		} else
			log(ns, `WARNING: autopilot.js tried to accepted Stanek's Gift, but was denied.`, true, 'warning');
		// Whether we succeded or failed, don't try again - if we're denied entry (due to having an augmentation) we will never be allowed in
		acceptedStanek = true;
	}

	const runOptions = getConfiguration(ns, argsSchema);
	const player = await getPlayerInfo(ns);
	if (!runOptions || await instanceCount(ns) > 1) return; // Prevent multiple instances of this script from being started, even with different args.
	options = runOptions; // We don't set the global "options" until we're sure this is the only running instance

	bitNodeMults = await tryGetBitNodeMultipliers(ns);
	dictOwnedSourceFiles = await getActiveSourceFiles(ns, false);
	unlockedSFs = await getActiveSourceFiles(ns, true);
	homeRam = await getNsDataThroughFile(ns, `ns.getServerMaxRam(ns.args[0])`, null, ["home"]);

	try {
		if (!(10 in unlockedSFs)) {
			log(ns, `WARNING: This script requires SF10 (grafting) functions to graft augmentations `, true);
			return false;
		}
		if (!(4 in unlockedSFs)) {
			log(ns, `WARNING: This script requires SF4 (singularity) functions to assess purchasable augmentations ascend automatically. ` +
				`Some functionality will be disabled and you'll have to manage working for factions, purchasing, and installing augmentations yourself.`, true);
			installedAugmentations = [];
			playerInstalledAugCount = null; // 'null' is treated as 'Unknown'
		} else {
			installedAugmentations = await getNsDataThroughFile(ns, 'ns.singularity.getOwnedAugmentations()', '/Temp/player-augs-installed.txt');
			playerInstalledAugCount = installedAugmentations.length;
			await maybeAcceptStaneksGift(ns, player);
			installedAugmentations = await getNsDataThroughFile(ns, 'ns.singularity.getOwnedAugmentations()', '/Temp/player-augs-installed.txt');
			playerInstalledAugCount = installedAugmentations.length;
		}
	} catch (err) {
		if (unlockedSFs[4] || 0 == 3) throw err; // No idea why this failed, treat as temporary and allow auto-retry.
		log(ns, `WARNING: You only have SF4 level ${unlockedSFs[4]}. Without level 3, some singularity functions will be ` +
			`too expensive to run until you have bought a lot of home RAM.`, true);
	}

	let currentWork = (/**@returns{Task|null}*/() => null)();
	currentWork = await getNsDataThroughFile(ns, 'ns.singularity.getCurrentWork()');
	// Never interrupt grafting
	if (currentWork?.type == "GRAFTING") {
		return false;
	}

	//list the grafting requirement
	let graftinglists = (options['install-for-augs'] || []).map(f => f.replaceAll('_', ' '));
	for (let i in graftinglists) {
		//check condition
		let stocksValue = 0;
		try { stocksValue = await getStocksValue(ns); } catch { /* Assume if this fails (insufficient ram) we also have no stocks */ }
		//manageReservedMoney(ns, player, stocksValue);
		//if found in installed aug, skip
		if (installedAugmentations.includes(graftinglists[i])) {
			//ns.tprint(graftinglists[i] + " installed, so skipped it");
			log(ns, "AT: " + graftinglists[i] + " installed, so skipped it");
			continue;
		}

		let price = await getNsDataThroughFile(ns, 'ns.grafting.getAugmentationGraftPrice(ns.args[0])', null, [graftinglists[i]]);
		price = price + 1e6; //Fly to New Tokyo cost
		//ns.tprint("Total Money == " + formatMoney(stocksValue + player.money));
		log(ns, "AT: Total Money == " + formatMoney(stocksValue + player.money));
		//ns.tprint("Require Money == " + formatMoney(price));
		log(ns, "AT: Require Money == " + formatMoney(price));
		//ns.Grafting.getAugmentationGraftPrice(augName)
		//if have enough money do graft
		if ((stocksValue + player.money) >= price) {
			//if only player.money not enough, sell all stock
			if (player.money < price) {
				await killScript(ns, 'stockmaster.js');
				ns.run("stockmaster.js", 1, "--liquidate");
				await ns.sleep(5 * 1000);
			}
			//goto New Tokyo
			//ns.singularity.travelToCity("New Tokyo")
			await getNsDataThroughFile(ns, 'ns.singularity.travelToCity(ns.args[0])', null, ["New Tokyo"]);
			//Grafting
			//ns.grafting.graftAugmentation("SmartJaw", true)
			await getNsDataThroughFile(ns, 'ns.grafting.graftAugmentation(ns.args[0],ns.args[1])', null, [graftinglists[i], true]);
			//ns.tprint(graftinglists[i] + " price == " + formatMoney(price));
			log(ns, "AT: " + graftinglists[i] + " price == " + formatMoney(price));
			//ns.tprint(graftinglists[i] + " going to be grafting");
			log(ns, "AT: " + graftinglists[i] + " going to be grafting");
				//await killScript(ns, 'work-for-factions.js');
				//await killScript(ns, 'autopilot.js');
			ns.run("stockmaster.js", 1);
			//ns.tprint(graftinglists[i] + " then start stockmaster");
			log(ns, "AT: " + graftinglists[i] + " then start stockmaster");
			return true
			//installedAugmentations = await getNsDataThroughFile(ns, 'ns.singularity.getOwnedAugmentations()', '/Temp/player-augs-installed.txt');
		} else {
			log(ns, "AT: " + graftinglists[i] + " price == " + formatMoney(price));
			//ns.tprint(graftinglists[i] + " price == " + formatMoney(price));
			log(ns, "AT: " + graftinglists[i] + " not enough money, so skipped it");
			//ns.tprint(graftinglists[i] + " not enough money, so skipped it");
		}
		//else move to next Aug
	}
	return false;
}