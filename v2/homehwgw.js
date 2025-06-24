/** @param {NS} ns */
export async function main(ns) {
	// Retrieve a list of all reachable servers from "home".
	const SERVERS = getAllServers(ns);
  
	// Iterate through each server, excluding "home", and attempt run weak grow hack function.
	ns.killall("home");
	let servNameMaxSecHackable = "n00dles";
	let servLvelMaxSecHackable = 1;
  
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
		factor = 16;
	  }
	  else if (ns.getServerMaxRam(server) == 4) { //n00dles
		if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) < 0.9) {
		  //ns.exec("/param/grow.js", "home", 2, server);
		} else {
		  ns.exec("/param/weak.js", "home", 2, server);
		}
		ns.exec("/param/grow.js", "home", 2, server);
		continue;
	  }
	  else if (ns.getServerMaxRam(server) == 8) { //CSEC
		continue;
	  }
	  else {
		factor = ns.getServerMaxRam(server) / 16;
	  }
  
	  /*
	  if (ns.getServerMoneyAvailable(server) == 0) {
		//ns.print(server);
		//ns.exec("/shared/ramshare.js", "home", factor, server);
		continue;
	  }
	  else if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) {
		//ns.exec("/param/weak.js", "home", factor, server);
		//ns.exec("/param/grow.js", "home", factor, server);
		continue;
	  }
	  else if (ns.getServerMoneyAvailable(server) < 1000000) {
		continue;
	  }
	  else if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) < 0.9) {
		ns.exec("/param/weak.js", "home", factor, server);
		ns.exec("/param/grow.js", "home", 10 * factor, server);
		if (securityLvlDiff > 3) {
		  ns.exec("/param/weak.js", "home", 4 * factor, server);
		}
	  }
  
	  //if (moneyRatio > 0.9 && securityLvlDiff < 3) {
		//ns.exec("/param/hack.js", "home", factor, server);
	  //}
  
	  if (ns.getServerGrowth(server) >= 40) {
		ns.exec("/param/grow.js", "home", 10 * factor, server);
	  }
	  */
	  /*
	  if (ns.getServerGrowth(server) >= 40) {
		//Good Growth Ratio >= 40
		if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) >= 0.80) {
		  ns.exec("/param/grow.js", "home", 1 * factor, server);
		}
		else if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) >= 0.04) {
		  ns.exec("/param/grow.js", "home", 2 * factor, server);
		} else {
		  ns.exec("/param/grow.js", "home", 4 * factor, server);
		}
		if (ns.getServerGrowth(server) >= 60) {
		  //Good Growth Ratio >= 60
		  ns.exec("/param/grow.js", "home", 1 * factor, server);
		  ns.exec("/param/weak.js", "home", 1 * factor, server);
		}
	  }
  
	  // Check Ava.Money 4% suitable to action
	  if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) >= 0.04) {
		//Weak adding
		if (securityLvlDiff > 3) {
		  //First found add more weak x8
		  ns.exec("/param/weak.js", "home", 4 * factor, server);
		} else {
		  //once Sec-Lvl-Diff <= 2 reduce weak to x1 to maintain
		  ns.exec("/param/weak.js", "home", 1 * factor, server);
		}
  
		//Grow adding
		if ((ns.getServerMoneyAvailable(server) / ns.getServerMaxMoney(server)) < 0.90) {
		  //First found add more grow x32
		  ns.exec("/param/grow.js", "home", 4 * factor, server);
		} else {
		  //once MoneyRation >= 0.9 reduce grow to x8
		  ns.exec("/param/grow.js", "home", 1 * factor, server);
		}
	  */
	  if (ns.getServerMoneyAvailable(server) == 0) {
		continue;
	  }
  
	  if (securityLvlDiff > 2) {
		//First found add more weak x8
		ns.exec("/param/weak.js", "home", 8 * factor, server);
		if (ns.getServerGrowth(server) >= 40) {
		  if (servLvelMaxSecHackable < ns.getServerRequiredHackingLevel(server)) {
			servLvelMaxSecHackable = ns.getServerRequiredHackingLevel(server);
			servNameMaxSecHackable = server;
		  }
		}
	  } else {
		//Start add Grow
		//once Sec-Lvl-Diff <= 2 reduce weak to x1 to maintain
		ns.exec("/param/weak.js", "home", 1 * factor, server);
		//ns.exec("/param/grow.js", "home", 8 * factor, server);
		if (ns.getServerGrowth(server) >= 40) {
		  //Good Growth Ratio >= 40
		  if (servLvelMaxSecHackable < ns.getServerRequiredHackingLevel(server)) {
			servLvelMaxSecHackable = ns.getServerRequiredHackingLevel(server);
			servNameMaxSecHackable = server;
		  }
		  if (moneyRatio <= 0.80) {
			ns.exec("/param/grow.js", "home", 1 * factor, server);
			//ns.exec("/param/hack.js", "home", 2, server);
		  }
  
		  if (moneyRatio >= 0.04) {
			ns.exec("/param/grow.js", "home", 1 * factor, server);
		  } else {
			ns.exec("/param/grow.js", "home", 4 * factor, server);
		  }
  
		  if (ns.getServerGrowth(server) >= 60) {
			//Good Growth Ratio >= 60
			//ns.exec("/param/grow.js", "home", 1 * factor, server);
			//ns.exec("/param/weak.js", "home", 1 * factor, server);
		  }
		}
	  }
	}
	// use all the rest of RAM to weak or grow+weak servNameMaxSecHackable
	let Home0MaxRam = ns.getServerMaxRam("home") - 8;
	let Home0UseRam = ns.getServerUsedRam("home");
	let ThreadShareRam = Math.floor((Home0MaxRam - Home0UseRam) / 1.7);
	let securityLvlDiff = ns.getServerSecurityLevel(servNameMaxSecHackable) - ns.getServerMinSecurityLevel(servNameMaxSecHackable);
  
	if (securityLvlDiff > 2) {
	  ThreadShareRam = Math.floor((Home0MaxRam - Home0UseRam) / 1.75);
	  ns.exec("/param/weak.js", "home", ThreadShareRam, servNameMaxSecHackable);
	} else { //Grow+Weak 250:20 or approx 12:1
	  ThreadShareRam = Math.floor((Home0MaxRam - Home0UseRam) / (1.75 * 13));
	  ns.exec("/param/grow.js", "home", ThreadShareRam * 12, servNameMaxSecHackable);
	  ns.exec("/param/weak.js", "home", ThreadShareRam, servNameMaxSecHackable);
	}
	ns.tprint("S: " + servNameMaxSecHackable + ",Thread:" + ThreadShareRam);
  
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