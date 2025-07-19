/** @param {NS} ns */
export async function main(ns) {

	let psCache = (/**@returns{{[serverName: string]: ProcessInfo[];}}*/() => ({}))();
	/** PS can get expensive, and we use it a lot so we cache this for the duration of a loop
	 * @param {NS} ns
	 * @param {string} serverName
	 * @returns {ProcessInfo[]} All processes running on this server. */
	function processList(ns, serverName, canUseCache = true) {
		let psResult = null;
		if (canUseCache)
			psResult = psCache[serverName];
		// Note: We experimented with ram-dodging `ps`, but there's so much data involed that serializing/deserializing generates a lot of latency
		//psResult ??= await getNsDataThroughFile(ns, 'ns.ps(ns.args[0])', null, [serverName]));
		psResult ??= psCache[serverName] = ns.ps(serverName);
		return psResult;
	}

	/** Helper to kill a list of process ids
	 * @param {NS} ns **/
	async function killProcessIds(ns, processIds) {
		return await runCommand(ns, `ns.args.forEach(ns.kill)`, '/Temp/kill-pids.js', processIds);
	}

	// Retrieve a list of all reachable servers from "home".
	const SERVERS = getAllServers(ns);

	// Iterate through each server, excluding "home", and attempt run weak grow hack function.
	/*
	while (true) {
		await ns.sleep(100);
	*/
	for (let server of SERVERS) {
		let factor = 1;
		let securityLvlDiff = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server);
		let moneyAvailable = ns.getServerMoneyAvailable(server);
		let moneyMax = ns.getServerMaxMoney(server);
		let moneyRatio = (moneyAvailable / moneyMax);

		if (server === "home") continue;

		ns.print(server);
		ns.print(ns.getServerMaxRam(server));

		//ns.killall(server);

		if (ns.getServerMaxRam(server) == 0) {
			continue;
		}
		else if (ns.getServerMaxRam(server) == 4) { //n00dles
			ns.exec("/param/hack.js", server, 1, server);
			ns.exec("/param/weak.js", server, 1, server);
			continue;
		}
		else if (ns.getServerMaxRam(server) == 8) { //CSEC
			//ns.print(server);
			ns.exec("/shared/ramshare.js", server, 2, server);
			continue;
		}
		else { // other mostly 16, 32, 64, ...
			factor = ns.getServerMaxRam(server) / 16;
		}

		if (!ns.hasRootAccess(server)) {
			ns.exec("/param/weak.js", server, 9 * factor, server);
			//ns.exec("/param/grow.js", server, 8 * factor, server);
			continue;
		}
		else if (ns.getServerMoneyAvailable(server) == 0) {
			//ns.tprint(server);
			//ns.exec("/shared/ramshare.js", server, 4 * factor, server);
			continue;
		}
		else if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) {
			//ns.killall(server);
			//ns.tprint(server);
			const scriptName = "/mshack/masterHack.js";
			const competingMaster = processList(ns, server, false /* Important! Don't use the (global shared) cache. */)
				.filter(s => s.filename == scriptName && s.pid != ns.pid);
			ns.tprint("competingMaster High:" + competingMaster);
			if (competingMaster.length > 0) { // We expect only 1, due to this logic, but just in case, generalize the code below to support multiple.
				const masterPids = competingMaster.map(p => p.pid);
				const killPid = await killProcessIds(ns, masterPids);
				ns.tprint("Kill PID:" + killPid);
			}
			ns.exec("/mshack/masterHack.js", server, 1, server, server);
			continue;
			//ns.exec("/param/grow.js", server, 8 * factor, server);
		} else {
			//ns.tprint(server);
			const scriptName = "/mshack/masterHack.js";
			const competingMaster = processList(ns, server, false /* Important! Don't use the (global shared) cache. */)
				.filter(s => s.filename == scriptName && s.pid != ns.pid);
			ns.tprint("competingMaster Low :" + competingMaster.length);
			if (competingMaster.length > 0) { // We expect only 1, due to this logic, but just in case, generalize the code below to support multiple.
				const masterPids = competingMaster.map(p => p.pid);
				const killPid = await killProcessIds(ns, masterPids);
				ns.tprint("Kill PID:" + killPid);
			}
			ns.exec("/mshack/masterHack.js", server, 1, server, server);
			continue;
		}
		//ns.tprint("S:" + server, ",SecDiff:" + securityLvlDiff);
		//ns.tprint("S:"+server+", M:"+moneyRatio);

		//ns.killall(server);
		//ns.exec("/mshack/masterHack.js", server, 1, [server, server]);
		//continue;
		/*
		if (securityLvlDiff > 2) { //High diff need more weak
			ns.killall(server);
			ns.exec("/mshack/masterHack.js", server, 1, [server, server]);
			continue;
			//ns.exec("/param/weak.js", server, 9 * factor, server);
		} else {
			if (ns.getServerGrowth(server) < 40) { //Bad growth rate
				if ((ns.getHackingLevel() - ns.getServerRequiredHackingLevel(server)) > 100) {
					if (moneyRatio >= 0.90) {
						ns.killall(server);
						ns.exec("/param/hack.js", server, 1 * factor, server);
						ns.exec("/param/grow.js", server, 7 * factor, server);
						ns.exec("/param/weak.js", server, 1 * factor, server);
					} else {
						ns.killall(server);
						ns.exec("/shared/ramshare.js", server, 4 * factor, server);
					}
				} else {
					ns.killall(server);
					ns.exec("/param/grow.js", server, 8 * factor, server);
					ns.exec("/param/weak.js", server, 1 * factor, server);
				}
			} else { //Good growth rate
				ns.killall(server);
				ns.exec("/param/grow.js", server, 7 * factor, server);
				ns.exec("/param/weak.js", server, 2 * factor, server);
				if (moneyRatio >= 0.90) {
					ns.killall(server);
					ns.exec("/param/hack.js", server, 1 * factor, server);
					ns.exec("/param/grow.js", server, 7 * factor, server);
					ns.exec("/param/weak.js", server, 1 * factor, server);
				}
			}
		}
		*/


		/*
		else if ((ns.getHackingLevel() - ns.getServerRequiredHackingLevel(server)) > 100) {
		if (ns.getServerGrowth(server) >= 40) { //High Growth rate 40%
			if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) < 0.70) {
			ns.killall(server);
			//ns.exec("/param/hack.js", server, 1 * factor, server);
			ns.exec("/param/grow.js", server, 8 * factor, server);
			ns.exec("/param/weak.js", server, 1 * factor, server);
			}
			else {
			ns.killall(server);
			ns.exec("/param/hack.js", server, 1 * factor, server);
			ns.exec("/param/grow.js", server, 6 * factor, server);
			ns.exec("/param/weak.js", server, 2 * factor, server);
			}
		} else { // Low Growth rate, put to share for reputation
			ns.killall(server);
			ns.exec("/shared/ramshare.js", server, 4 * factor, server);
		}
		}
		*/
		/*
		else if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) < 0.70) {
		ns.killall(server);
		//ns.exec("/param/hack.js", server, 1 * factor, server);
		ns.exec("/param/grow.js", server, 6 * factor, server);
		ns.exec("/param/weak.js", server, 3 * factor, server);
		}
		*/
		/*
		else if ((ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server)) > 2) {
		ns.killall(server);
		//ns.exec("/param/grow.js", server, 1 * factor, server);
		ns.exec("/param/weak.js", server, 9 * factor, server);
		//ns.exec("/param/hack.js", server, 1 * factor, server);
		}
		*/
		/*
		else {
		ns.killall(server);
		ns.exec("/param/hack.js", server, 1 * factor, server);
		ns.exec("/param/grow.js", server, 6 * factor, server);
		ns.exec("/param/weak.js", server, 2 * factor, server);
		}
		*/

	}
	/*
	}
	*/

	/**
	 * Discovers all servers connected to the starting server ("home"), using a depth-first search.
	 * Unique servers are recorded to ensure each is processed only once.
	 * @param {NS} ns - The namespace object for accessing game functions.
	 * @returns {string[]} An array of unique server names.
	 */
	function getAllServers(ns) {
		let servers = [];
		let stack = ["home"];

		while (stack.length > 0) {
			const CURRENT = stack.pop();
			if (!servers.includes(CURRENT)) {
				servers.push(CURRENT);
				stack.push(...ns.scan(CURRENT).filter(next => !servers.includes(next)));
			}
		}
		return servers;
	}
}