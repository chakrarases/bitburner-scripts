import {
	getFnRunViaNsExec, runCommand_Custom
} from 'helpers.js'
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
		//ns.tprint(psResult);
		return psResult;
	}

	/** Helper to kill a list of process ids
	 * @param {NS} ns **/
	async function killProcessIds(ns, processIds) {
		return await runCommand(ns, `ns.args.forEach(ns.kill)`, '/Temp/kill-pids.js', processIds);
	}
	async function runCommand(ns, ...args) {
		return await runCommand_Custom(ns, getFnRunViaNsExec(ns, "home"), ...args);
	}

	// Retrieve a list of all reachable servers from "home".
	const SERVERS = getAllServers(ns);

	// Iterate through each server, excluding "home", and attempt run weak grow hack function.
	/*
		while (true) {
	*/
	for (let server of SERVERS) {
		let factor = 1;
		let securityLvlDiff = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server);
		let moneyAvailable = ns.getServerMoneyAvailable(server);
		let moneyMax = ns.getServerMaxMoney(server);
		let moneyRatio = (moneyAvailable / moneyMax);

		if (server === "home") continue;
		if (server === "hacknet-server") continue;

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
			const scriptName = "mshack/masterHack.js";
			const competingMaster = processList(ns, server, false /* Important! Don't use the (global shared) cache. */)
				.filter(s => s.filename == scriptName);
			//ns.tprint("High :" + competingMaster.length + " Server : " + server);
			if (competingMaster.length > 0) { // We expect only 1, due to this logic, but just in case, generalize the code below to support multiple.
				//const masterPids = competingMaster.map(p => p.pid);
				//const killPid = await killProcessIds(ns, masterPids);
				//ns.tprint("Kill PID:" + killPid);
			} else {
				ns.exec("/mshack/masterHack.js", server, 1, server, server);
				//ns.tprint("Deploy MasterHack on s: " + server);
			}
			continue;
			//ns.exec("/param/grow.js", server, 8 * factor, server);
		} else {
			//ns.tprint(server);
			const scriptName = "mshack/masterHack.js";
			const competingMaster = processList(ns, server, false /* Important! Don't use the (global shared) cache. */)
				.filter(s => s.filename == scriptName);
			//ns.tprint("Low :" + competingMaster.length + " Server : " + server);
			if (competingMaster.length > 0) { // We expect only 1, due to this logic, but just in case, generalize the code below to support multiple.
				//const masterPids = competingMaster.map(p => p.pid);
				//const killPid = await killProcessIds(ns, masterPids);
				//ns.tprint("Kill PID:" + killPid);
			} else {
				ns.exec("/mshack/masterHack.js", server, 1, server, server);
				//ns.tprint("Deploy MasterHack on s: " + server);
			}
			continue;
		}
	}
	/*
	await ns.sleep(10 * 1000); // wait 10 sec
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