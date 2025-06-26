import {
    instanceCount, getConfiguration, getNsDataThroughFile, getFilePath, getActiveSourceFiles, tryGetBitNodeMultipliers,
    formatDuration, formatMoney, formatNumberShort, disableLogs, log, getErrorInfo, tail
} from './helpers.js'
/** @param {NS} ns */
export async function main(ns) {


  ns.tprint(measureFactionRepGainRate(ns,"Tian Di Hui"));
}
/** Measure our rep gain rate (per second)
 * TODO: Move this to helpers.js, measure all rep gain rates over a parameterizable number of game ticks (default 1) and return them all.
 * @param {NS} ns
 * @param {() => Promise<number>} fnSampleReputation - An async function that samples the reputation at a current point in time */
async function measureRepGainRate(ns, fnSampleReputation) {
    const initialReputation = await fnSampleReputation();
    let nextTickReputation;
    let start = Date.now();
    while (initialReputation == (nextTickReputation = await fnSampleReputation()) && Date.now() - start < 450)
        await ns.sleep(50);
    return (nextTickReputation - initialReputation) * 5; // Assume this rep gain was for a 200 tick
}

async function measureFactionRepGainRate(ns, factionName) {
    return await measureRepGainRate(ns, async () => await getFactionReputation(ns, factionName));
}

async function getFactionReputation(ns, factionName) {
    return await getNsDataThroughFile(ns, ns.singularity.getFactionRep(ns.args[0]), null, [factionName]);
}