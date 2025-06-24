/** @param {NS} ns */
export async function main(ns) {
    while (true) {
  
      //const pid2= ns.exec("/scripts/1grow.js", "home", 200, ns.args[0]);
      //hack1000 up 1.98
      //Wean 1 Down 0.053
      let runner = "daemon-0";
      let multiply = 3 * 100;
  
      const pid = ns.exec("/param/hack.js", runner, 1000 * multiply, "CSEC");
      const pid2 = ns.exec("/param/weaken.js", runner, 38 * multiply * 3, "CSEC");
      while (ns.isRunning(pid, runner)) {
        await ns.asleep(500);
      }
      const pid3 = ns.exec("/param/hack.js", runner, 1000 * multiply, "CSEC");
      while (ns.isRunning(pid3, runner)) {
        await ns.asleep(500);
      }
      const pid4 = ns.exec("/param/hack.js", runner, 1000 * multiply, "CSEC");
      while (ns.isRunning(pid4, runner) || ns.isRunning(pid2, runner)) {
        await ns.asleep(500);
      }
      await ns.asleep(500);
    }
  }