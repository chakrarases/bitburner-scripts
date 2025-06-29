/** @param {NS} ns */
export async function main(ns) {
  const hgwOptions = {
    additionalMsec: 0
  }
  hgwOptions.additionalMsec = ns.args[1];
  await ns.grow(ns.args[0], hgwOptions);
}