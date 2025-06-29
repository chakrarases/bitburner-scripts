/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("asleep")
  let HostName = ns.getHostname();
  let FreeRam = ns.getPurchasedServerMaxRam(HostName) - ns.getServerUsedRam(HostName);
  let MaxThres = Math.floor(FreeRam / (ns.getScriptRam("/scripts/1weak.js", HostName)));

  //Math.floor(FreeRam*.8/1.75/16);
  let SVMaxMoney = ns.getServerMaxMoney(ns.args[0]);
  let NumGrow = Math.floor((ns.growthAnalyze(ns.args[0], SVMaxMoney / ns.getServerMoneyAvailable(ns.args[0]))));
  while (NumGrow > 0 || ns.getServerSecurityLevel(ns.args[0]) != ns.getServerMinSecurityLevel(ns.args[0])) {
    let NumWeak = Math.floor(NumGrow / 2 + (ns.getServerSecurityLevel(ns.args[0]) - ns.getServerMinSecurityLevel(ns.args[0])) / 0.05) + 1;

    const pid2 = ns.exec("/scripts/1grow.js", HostName, NumGrow + 1, ns.args[0]);
    const pid0 = ns.exec("/scripts/1weak.js", HostName, NumWeak + 1, ns.args[0]);
    while (ns.isRunning(pid0, HostName) || ns.isRunning(pid2, HostName)) {
      await ns.asleep(1000);
    }
    NumGrow = Math.floor((ns.growthAnalyze(ns.args[0], SVMaxMoney / ns.getServerMoneyAvailable(ns.args[0]))));
  }
}