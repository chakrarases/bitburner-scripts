/** @param {NS} ns */
export async function main(ns) {
	ns.exec("/shared/ramshare.js", ns.args[0], ns.args[1]);
  } 