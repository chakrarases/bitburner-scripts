import {
  log, getConfiguration, instanceCount, disableLogs, getActiveSourceFiles,
  getNsDataThroughFile, runCommand, formatMoney, formatDuration
} from './helpers.js'

const interval = 1000; // Update (tick) this often to check on sleeves and recompute their ideal task
const trainStats = ['str', 'def', 'dex', 'agi'];
const trainSmarts = ['hacking', 'charisma'];
let numSleeves;
let ownedSourceFiles;

/*
alias sles="run sleeve_short.js";
sles com
sles alg
sles led
sles r
sles i
sles s
sles m
sles h
sles str
sles def
sles dex
sles agi
*/


/** @param {NS} ns **/
export async function main(ns) {
  ownedSourceFiles = await getActiveSourceFiles(ns);
  if (!(10 in ownedSourceFiles))
    return ns.tprint("WARNING: You cannot run sleeve_short.js until you do BN10.");

  try { await mainLoop(ns); }
  catch (err) {
    log(ns, `WARNING: sleeve_short.js Caught (and suppressed) an unexpected error in the main loop:\n` +
      (err?.stack || '') + (typeof err === 'string' ? err : err.message || JSON.stringify(err)), false, 'warning');
  }
  await ns.sleep(interval);
}

/** @param {NS} ns
 * @param {number} numSleeves
 * @returns {Promise<SleevePerson[]>} */
async function getAllSleeves(ns, numSleeves) {
  return await getNsDataThroughFile(ns, `ns.args.map(i => ns.sleeve.getSleeve(i))`,
    `/Temp/sleeve_short-getSleeve-all.txt`, [...Array(numSleeves).keys()]);
}

/** @param {NS} ns
 * Main loop that gathers data, checks on all sleeves, and manages them. */
async function mainLoop(ns) {
  // Update info
  numSleeves = await getNsDataThroughFile(ns, `ns.sleeve.getNumSleeves()`);
  // Update all sleeve information and loop over all sleeves to do some individual checks and task assignments
  let sleeveInfo = await getAllSleeves(ns, numSleeves);

  for (let i = 0; i < numSleeves; i++) {
    let sleeve = sleeveInfo[i]; // For convenience, merge all sleeve stats/info into one object

    if ((ns.args[0] == "alg") || (ns.args[0] == "led") || (ns.args[0] == "com")) { //University
      if (sleeve.city != ns.enums.CityName.Volhaven) {
        log(ns, `Moving Sleeve ${i} from ${sleeve.city} to Volhaven so that they can study at ZB Institute.`);
        await getNsDataThroughFile(ns, `ns.sleeve.travel(ns.args[0], ns.args[1])`, null, [i, ns.enums.CityName.Volhaven]);
      }
      var univ = ns.enums.LocationName.VolhavenZBInstituteOfTechnology;
      if (ns.args[0] == "alg") {
        let result = await getNsDataThroughFile(ns, `ns.sleeve.setToUniversityCourse(ns.args[0], ns.args[1], ns.args[2])`, `/Temp/Sleeve_short_univ.txt`, [i, univ, "algorithms"]);
      } else if (ns.args[0] == "led") {
        let result = await getNsDataThroughFile(ns, `ns.sleeve.setToUniversityCourse(ns.args[0], ns.args[1], ns.args[2])`, `/Temp/Sleeve_short_univ.txt`, [i, univ, "leadership"]);
      } else if (ns.args[0] == "com") {
        let result = await getNsDataThroughFile(ns, `ns.sleeve.setToUniversityCourse(ns.args[0], ns.args[1], ns.args[2])`, `/Temp/Sleeve_short_univ.txt`, [i, univ, "computer science"]);
      }
      //ns.sleeve.setToUniversityCourse(i, univ, ns.args[0]);
    } else if (ns.args[0] == "r") { //set to ShockRecovery
      let result = await getNsDataThroughFile(ns, `ns.sleeve.setToShockRecovery(ns.args[0])`, null, [i]);
      //ns.sleeve.setToShockRecovery(i);
    } else if (ns.args[0] == "i") { //set to Idle
      let result = await getNsDataThroughFile(ns, `ns.sleeve.setToIdle(ns.args[0])`, null, [i]);
      //ns.sleeve.setToIdle(i);
    } else if (ns.args[0] == "s") {
      let result = await getNsDataThroughFile(ns, `ns.sleeve.setToCommitCrime(ns.args[0], ns.args[1])`, `/Temp/Sleeve_short_crime.txt`, [i, "shoplift"]);
      //ns.sleeve.setToCommitCrime(i, ns.args[0]);
    } else if (ns.args[0] == "m") {
      let result = await getNsDataThroughFile(ns, `ns.sleeve.setToCommitCrime(ns.args[0], ns.args[1])`, `/Temp/Sleeve_short_crime.txt`, [i, "mug"]);
      //ns.sleeve.setToCommitCrime(i, ns.args[0]);
    } else if (ns.args[0] == "h") {
      let result = await getNsDataThroughFile(ns, `ns.sleeve.setToCommitCrime(ns.args[0], ns.args[1])`, `/Temp/Sleeve_short_crime.txt`, [i, "homicide"]);
      //ns.sleeve.setToCommitCrime(i, ns.args[0]);
    } else { //Gym
      if (sleeve.city != ns.enums.CityName.Sector12) {
        log(ns, `Moving Sleeve ${i} from ${sleeve.city} to Sector-12 so that they can study at Powerhouse Gym.`);
        await getNsDataThroughFile(ns, 'ns.sleeve.travel(ns.args[0], ns.args[1])', null, [i, ns.enums.CityName.Sector12]);
      }
      var gym = ns.enums.LocationName.Sector12PowerhouseGym;
      let result = await getNsDataThroughFile(ns, `ns.sleeve.setToGymWorkout(ns.args[0], ns.args[1], ns.args[2])`, `/Temp/Sleeve_short_gym.txt`, [i, gym, ns.args[0]]);
      //ns.sleeve.setToGymWorkout(i, gym, ns.args[0]);
    }
  }
}
