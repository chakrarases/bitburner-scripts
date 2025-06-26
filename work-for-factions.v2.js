/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMinSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("asleep");
  let LWork = "";
  let LTarget = 0;
  let Data = [["CyberSec", "Cranial Signal Processors - Gen II", 18750],
  ["Chongqing", "Neuregen Gene Modification", 37500],
  ["NiteSec", "CRTX42-AA Gene Modification", 45000],
  ["Tian Di Hui", "Neuroreceptor Management Implant", 75000],
  ["The Black Hand", "The Black Hand", 100000],
  ["BitRunners", "BitRunners Neurolink", 875000],
  ["Daedalus", "The Red Pill", 2500000]];
  let FV = 0;
  for (let i = 0; i < Data.length; i++) {
    FV = ns.singularity.getFactionFavor(Data[i][0]);
    //ns.tprint(Data[i][0] + " Favor "+ FV);
    if (FV >= 150) {
      Data[i][2] = 0;
    }
    else {
      //ns.tprint(Data[i][0] + " Favor "+ FV);
      let RepWant = 462490.069169063 - ((1.02 ** FV) - 1) * 25000 + 100;
      //ns.tprint("   "+ Data[i][0] + " Rep Want to 150 "+ RepWant); 
      if (RepWant < Data[i][2]) {
        Data[i][2] = RepWant;
      }
    }
  }

  let LastRep = 0;
  let Round = 0;
  let Lasttime = 0;
  let augName = "";
  while (true) {

    JoinAllInvitation(ns);
    let Running = 0
    let ToRun = "";
    let Repto = 0;
    while (Running < Data.length && ToRun == "") {
      if (Data[Running][0] == "Chongqing") {

      }
      //ns.tprint("Check "+Data[Running][0]);
      let isInstalled = IsAugInstalled(ns, Data[Running][1])
      let FTR = ns.singularity.getFactionRep(Data[Running][0]);
      //let FTF=ns.singularity.getFactionFavor(Data[Running][0]);

      if (isInstalled == true || (FTR > Data[Running][2])) {

      }
      else {

        if (isJoined(ns, Data[Running][0])) {
          ToRun = Data[Running][0];
          Repto = Data[Running][2];
        }
        else {
          if (Data[Running][0] == "Chongqing" || Data[Running][0] == "Tian Di Hui") {

            ns.singularity.travelToCity("Chongqing");
            ns.print("Goto Chongqing");
            await ns.asleep(1000);
            //ns.tprint("Join "+Data[Running][0]);
            ns.singularity.joinFaction(Data[Running][0]);
          }
          else if (Data[Running][0] == "Aevum") {
            ns.print("Goto Aevum");
            ns.singularity.travelToCity("Aevum");
            await ns.asleep(1000);
            ns.singularity.joinFaction(Data[Running][0]);
            //            ns.singularity.joinFaction("Aevum");
          }
        }
      }
      Running++;
    }
    //ns.tprint(ToRun);
    if (ToRun != LWork) {
      if (LWork != "") {
        if (ns.singularity.getFactionRep(LWork) >= LTarget) {
          ns.toast("TrytoReborn");
          ns.print("TrytoReborn");
          await ns.exec("/ascend.js", "home", 1, "--install-augmentations", "--prioritize-home-ram", "--on-reset-script", "auto_run.js");
          // ns.singularity.softReset();
        }
      }
      if (ToRun != "") {
        ns.singularity.workForFaction(ToRun, "hacking", false);
        LWork = ToRun;
        LTarget = Repto;
      }
    }
    else {
      if (Round == 0 && ToRun != "") {

        let LastRepPerSec = (ns.singularity.getFactionRep(ToRun) - LastRep) / ((Date.now() - Lasttime) / 1000)
        let SecUse = (Repto - ns.singularity.getFactionRep(ToRun)) / LastRepPerSec;
        const now = new Date();
        let hours = now.getHours();
        let Minute = now.getMinutes();
        let Second = now.getSeconds();
        let ToToAdd = SecUse;
        Second = Second + ToToAdd;
        Minute = Minute + Math.floor(Second / 60);
        Second = Math.floor(Second % 60);
        hours = hours + Math.floor(Minute / 60);
        Minute = Minute % 60;
        ns.print("Work: " + ToRun + " to Rep " + Math.floor(Repto) + " Finish About:" + hours + ":" + Minute + ":" + Second);
        LastRep = ns.singularity.getFactionRep(ToRun);
        Lasttime = Date.now();
      }
      Round = (Round + 1) % 10;
    }
    await ns.asleep(1000);
  }
}

function IsAugInstalled(ns, AugName) {
  const installedAugmentations = ns.singularity.getOwnedAugmentations();
  for (let i = 0; i < installedAugmentations.length; i++) {
    if (installedAugmentations[i] == AugName) {
      return (true);

    }
  }
  return (false);
}


function Repto150(Favor) {
  if (Favor == 150) {
    return (0);
  }
  else {
    return (25000 * (Math.pow(1.02, (150 - Favor)) - 1));
  }
}

function isJoined(ns, FationName) {
  let jFac = ns.getPlayer().factions;
  for (let i = 0; i < jFac.length; i++) {
    if (jFac[i] == FationName) {
      return (true);
    }
  }
  return (false);
}

function JoinAllInvitation(ns) {
  let AllInv = ns.singularity.checkFactionInvitations();
  if (AllInv.length > 0) {
    for (let i = 0; i < AllInv.length; i++) {
      if ((AllInv[i] != "Aevum") && (AllInv[i] != "Chongqing") && (AllInv[i] != "Ishima") && (AllInv[i] != "New Tokyo") && (AllInv[i] != "Sector-12") && (AllInv[i] != "Volhaven")) {
        ns.singularity.joinFaction(AllInv[i]);
      }
    }
  }
  return (0);
}