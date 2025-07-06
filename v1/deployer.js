/**
 * Automates the process of hacking servers by deploying scripts and cracking open their security.
 * The script first gathers all servers accessible from the starting point ("home"). It then attempts
 * to breach the servers' security using available hacking programs and, if successful, deploys hacking scripts
 * to the compromised servers. This enables automated hacking activities on those servers.
 *
 * @param {NS} ns - The namespace object provided by the game, which includes
 *                  functions for interacting with the game's systems.
 * @async
 */
export async function main(ns) {
    // Retrieve a list of all reachable servers from "home".
    const SERVERS = getAllServers(ns);
  
    // Define the available hacking programs and their corresponding action functions.
    const PROGRAMS = [
      { file: "BruteSSH.exe", action: ns.brutessh },
      { file: "FTPCrack.exe", action: ns.ftpcrack },
      { file: "RelaySMTP.exe", action: ns.relaysmtp },
      { file: "HTTPWorm.exe", action: ns.httpworm },
      { file: "SQLInject.exe", action: ns.sqlinject }
    ];
  
    // Iterate through each server, excluding "home", and attempt to compromise and deploy scripts.
    for (let server of SERVERS) {
      if (server === "home") continue;
      // Transfer necessary scripts to the server.
      ns.scp(["/self/selfweak.js", "/self/selfgrow.js", "/self/selfhack.js"], server);
      ns.scp(["/shared/weaken.js", "/shared/grow.js", "/shared/hack.js"], server);
      ns.scp(["/param/weak.js", "/param/grow.js", "/param/hack.js"], server);
      ns.scp(["/mshack/weakms.js", "/mshack/growms.js", "/mshack/hackms.js"], server);
      ns.scp(["/mshack/nuke.js", "/mshack/masterHack.js"], server);
      ns.scp(["/shared/ramshare.js","gs.js","/v2/home1hwgw.js"], server);
      ns.scp(["/v4/exphack.js"], server);
  
      let open_ports = 0;
      // Attempt to run each hacking program that exists on "home", and count successfully opened ports.
      PROGRAMS.forEach(program => {
        if (ns.fileExists(program.file)) {
          program.action(server);
          open_ports++;
        }
      });
  
      // If the number of open ports meets or exceeds the server's requirements, run the nuke command.
      if (ns.getServerNumPortsRequired(server) <= open_ports) ns.nuke(server);
  
      if (ns.getServerMoneyAvailable(server) == 0) {
        
      }
    }
  
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