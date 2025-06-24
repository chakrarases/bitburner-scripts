/** @param {NS} ns */
export async function main(ns) {
	//var ram = Math.pow(2,20);
	var ram = Math.pow(2,ns.args[0] || 10);
	var list = ns.getPurchasedServers();
	var money = ns.getPlayer().money;
	var ramCost = ns.getPurchasedServerCost(ram);
	var i;
  
	for( i = list.length; i < 25 && money >= ramCost; i++ ) {
	  ns.purchaseServer("home" + parseInt(i+1),ram);
	  ns.tprint("Purchased server home" + parseInt(i+1));
	  money = ns.getPlayer().money;
	}
  
	list = ns.getPurchasedServers();
	ns.tprint("Total Purchased Servers: " + list.length);
  }