export async function main(ns) {
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMinSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("asleep");

  let HackPerWant = 0.25;
  let SVMaxMoney = ns.getServerMaxMoney(ns.args[0]);
  while (true) {
    let NumHack = Math.floor(ns.hackAnalyzeThreads(ns.args[0], Math.floor(SVMaxMoney * HackPerWant)));
    let SecInc = ns.hackAnalyzeSecurity(NumHack, ns.args[0]);
    let NumGrow = Math.floor((ns.growthAnalyze(ns.args[0], SVMaxMoney / (SVMaxMoney * (1 - HackPerWant))) + 1) / 2) + 2;
    SecInc = Math.floor(SecInc + NumGrow / 10) + 1;
    let NumWeaken = Math.floor(SecInc / 0.05) + 1;

    let HT = ns.getHackTime(ns.args[0]);
    let GT = ns.getGrowTime(ns.args[0]);
    let WT = ns.getWeakenTime(ns.args[0]);
    /*ns.tprint("HT "+HT);
    ns.tprint("GT "+GT);
    ns.tprint("WT "+WT);*/
    let addtime = 0;
    let IncTime = ns.getWeakenTime(ns.args[0]) - ns.getHackTime(ns.args[0]) + 50;
    let LoopRun = 10;
    let PID = 0;
    let pid = 0;
    let pid1 = 0;
    let pid2 = 0;
    let pid3 = 0;
    let HR = ns.getScriptRam("/scripts/1hack.js", "home");
    let GR = ns.getScriptRam("/scripts/1grow.js", "home");
    let WR = ns.getScriptRam("/scripts/1hack.js", "home");

    let RAM = (ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) * 0.95;
    let RamUse = HR * NumHack + 2 * GR * NumGrow + WR * NumWeaken;

    let Maxround = Math.floor(RAM / RamUse);
    //Maxround=10;
    /*
          ns.tprint("RAM: " + RAM + " HR: " + HR + " GR: " + GR +" WR: " + WR);
          ns.tprint("NH: " + NumHack + "NG: " + NumGrow + " NW: " + NumWeaken);
          ns.tprint("Maxround " + Maxround);
    */
    //Maxround=3;
    let Gap = 100;

    for (let i = 0; i < Maxround; i++) {
      let HPlus = WT - HT + (4 + i) * Gap * i - i * i * Gap;
      let GPlus = WT + 4 * Gap * i + Gap - GT;
      let GPlus2 = WT + 4 * Gap * i + 2 * Gap - GT;
      let WPlus = 4 * Gap * (i + 1) - Gap;
      pid1 = ns.exec("/scripts/1hack.js", "home", NumHack, ns.args[0], HPlus, "Hack " + i);
      pid2 = ns.exec("/scripts/1grow.js", "home", NumGrow, ns.args[0], GPlus, "Grow " + (i));
      pid3 = ns.exec("/scripts/1grow.js", "home", NumGrow, ns.args[0], GPlus2, "Grow " + (i));
      pid = ns.exec("/scripts/1weaken.js", "home", NumWeaken, ns.args[0], WPlus, "Weaken " + (i));
      //ns.tprint("I= " + i + "H:" + HPlus + " G1:"+ GPlus+ " G2:"+ GPlus2 + " W:" + WPlus );
    }

    while (ns.isRunning(pid, "home") || ns.isRunning(pid1, "home") || ns.isRunning(pid2, "home") || ns.isRunning(pid3, "home")) {
      await ns.asleep(100);
    }
    await ns.asleep(1000);

    PID = await ns.exec("/scripts/Strong.js", "home", 1, ns.args[0]);
    while (ns.isRunning(PID, "home")) {
      await ns.asleep(100);
    }
  }
}
