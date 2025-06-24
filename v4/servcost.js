import { getConfiguration, formatRam, formatMoney, formatNumber } from '../helpers.js'
/** @param {NS} ns */
export async function main(ns) {
  let a=0;
  var i;
  for( i = 1; i <= 20; i++){
    var ram = Math.pow(2,i)
    ns.tprint("i:"+formatNumber(i,1).padStart(2)+", "+`RAM: ${formatRam(ram ?? 0).replace(' ', '').padStart(6)}`+" Cost:"+`${formatMoney(ns.getPurchasedServerCost(ram) ?? 0, 4, 1).padStart(7)} `);
  }
}