/** @param {NS} ns */
export async function main(ns) {
	// Retrieve a list of all reachable servers from "home".
	const SERVERS = getAllServers(ns);
  
	// Iterate through each server, excluding "home", and attempt run weak grow hack function.
	ns.killall("home1");
  
	for (let server of SERVERS) {
	  let factor = 1;
	  let moneyAvailable = ns.getServerMoneyAvailable(server);
	  let moneyMax = ns.getServerMaxMoney(server);
	  let moneyRatio = (moneyAvailable / moneyMax);
	  let securityLvlDiff = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server);
  
	  if (server === "home") continue;
	  if (!ns.hasRootAccess(server)) continue;
	  if (ns.getServerMaxRam(server) == 0) {
		//continue;
		factor = 1;
	  }
	  else if (ns.getServerMaxRam(server) == 4) { //n00dles
		if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) > 0.90) {
		  ns.exec("/param/hack.js", "home1", 1, server);
		} else {
		  ns.exec("/param/grow.js", "home1", 1, server);
		  ns.exec("/param/weak.js", "home1", 1, server);
		}
		continue;
	  }
	  else if (ns.getServerMaxRam(server) == 8) { //CSEC
		continue;
	  }
	  else {
		factor = ns.getServerMaxRam(server) / 16;
	  }
  
	  if (ns.getServerMoneyAvailable(server) == 0) {
		//ns.print(server);
		//ns.exec("/shared/ramshare.js", "home", factor, server);
		continue;
	  }
	  else if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) {
		//ns.exec("/param/grow.js", "home", factor, server);
		//ns.exec("/param/weak.js", "home", factor, server);
		continue;
	  }
	  else if (ns.getServerMoneyAvailable(server) < 1000000) {
		continue;
	  }
	  else if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) > 0.90) {
		if (ns.getServerGrowth(server) >= 40) {
		  //ns.exec("/param/hack.js", "home1", factor, server);
		  ns.exec("/param/hack.js", "home1", factor, server);
		  ns.exec("/param/grow.js", "home1", 8 * factor, server);
		  ns.exec("/param/weak.js", "home1", 2 * factor, server);
		} else {
		  ns.exec("/param/hack.js", "home1", factor, server);
		  ns.exec("/param/grow.js", "home1", 32 * factor, server);
		  ns.exec("/param/weak.js", "home1", 4 * factor, server);
		}
	  }
  
	  //if (moneyRatio > 0.9 && securityLvlDiff < 3) {
	  //ns.exec("/param/hack.js", "home", factor, server);
	  //}
  
	  /*
		if (securityLvlDiff > 3) {
		  //ns.exec("/param/weak.js", "home", 4 * factor, server);
		}
		else {
		  //ns.exec("/param/hack.js", "home1", factor, server);
		}
	  */
	}
	//push the rest of Ram to Reputation
	let Home1MaxRam = ns.getServerMaxRam("home1");
	let Home1UseRam = ns.getServerUsedRam("home1");
	let ThreadShareRam = Math.floor((Home1MaxRam - Home1UseRam) / 4);
	ns.exec("/shared/ramshare.js", "home1", ThreadShareRam, "home1");
  
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