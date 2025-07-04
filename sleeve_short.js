import { log, getConfiguration, instanceCount, disableLogs, getActiveSourceFiles,
	getNsDataThroughFile, runCommand, formatMoney, formatDuration } from './helpers.js'

const trainStats = ['str', 'def', 'dex', 'agi'];
const trainSmarts = ['hacking', 'charisma'];

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

		if ((ns.args[0] == "Algorithms") || (ns.args[0] == "Computer Science")){ //University
			if (sleeve.city != ns.enums.CityName.Volhaven) {
        log(ns, `Moving Sleeve ${i} from ${sleeve.city} to Volhaven so that they can study at ZB Institute.`);
        await getNsDataThroughFile(ns, `ns.sleeve.travel(ns.args[0], ns.args[1])`, null, [i, ns.enums.CityName.Volhaven]);
			}
			var univ = ns.enums.LocationName.VolhavenZBInstituteOfTechnology;
			let result = await getNsDataThroughFile(ns, `ns.sleeve.setToUniversityCourse(ns.args[0], ns.args[1], ns.args[2])`, [i , univ, ns.args[0]]);
		} else if (ns.args[0] == "Recovery") { //ShockRecovery
		} else if (ns.args[0] == "Idle") { //ShockRecovery
		} else { //Gym
		}
	}
}
