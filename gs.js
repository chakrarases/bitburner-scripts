import {
	formatMoney, getNsDataThroughFile, log
} from './helpers.js'

/** 
 * @param {NS} ns 
 **/
/*
Gets stats of each hacked server.
RAM: 2.55GB
*/
function get_all_servers(ns, all = false) {
	/*
	Scans and iterates through all servers.
	If all is false, only servers with root access and have money are returned.
	*/
	var servers = ["home"]
	var result = []

	var i = 0
	while (i < servers.length) {
		var server = servers[i]
		var s = ns.scan(server)
		for (var j in s) {
			var con = s[j]
			if (servers.indexOf(con) < 0) {
				servers.push(con)
				if (all || (ns.hasRootAccess(con) && parseInt(ns.getServerMaxMoney(con)) > 0)) {
					result.push(con)
				}
			}
		}
		i += 1
	}
	return result
}

function get_action(ns, host) {
	/*
	Gets the first action in the list and returns it.
	*/
	var actions = ns.ps(host)
	if (actions.length == 0) {
		return null
	}
	return actions[0].filename.replace("target", "").replace("Remote/", "").replace("param/", "").replace("mshack/", "").replace("masterHack", "MSH").replace(".js", "")
}

function pad_str(string, len) {
	/*
	Prepends the requested padding to the string.
	*/
	var pad = "                                "
	return String(pad + string).slice(-len)
}

async function get_server_data(ns, server) {
	/*
	Creates the info text for each server. Currently gets money, security, and ram.
	NOTE: ns.getServer() can return a server object and obtain all of the necessary properties.
	However, ns.getServer() costs 2GB, which doubles the RAM requirement for this script.
	*/
	var moneyAvailable = ns.getServerMoneyAvailable(server)
	var moneyMax = ns.getServerMaxMoney(server)
	var securityLvl = ns.getServerSecurityLevel(server)
	var securityMin = ns.getServerMinSecurityLevel(server)
	var ram = ns.getServerMaxRam(server)
	var hackLvl = ns.getServerRequiredHackingLevel(server)
	var growth = ns.getServerGrowth(server)
	var sServer = await getNsDataThroughFile(ns, 'ns.getServer(ns.args[0])', null, [server]);
	var core = sServer.cpuCores;
	//ns.tprint("S:"+server);
	/*
	Basic Colors (8-color palette):
	\u001b[30m to \u001b[37m for foreground colors (black to white).
	\u001b[40m to \u001b[47m for background colors.
	\u001b[0m resets the color.
	256-Color Palette:
	\u001b[38;5;COLOR_CODEm for foreground colors, where COLOR_CODE is a number from 0-255.
	\u001b[48;5;COLOR_CODEm for background colors.
	True Color (RGB):
	\u001b[38;2;R;G;Bm for foreground colors, where R, G, B are 0-255.
	\u001b[48;2;R;G;Bm for background colors.
	*/
	// \u001b[30m ==> Gray-Black
	// \u001b[31m ==> Red
	// \u001b[32m ==> Green
	// \u001b[33m ==> Yellow
	// \u001b[34m ==> Blue
	// \u001b[35m ==> Magenta
	// \u001b[36m ==> Cyan
	// \u001b[37m ==> White

	var txtcolor = `\u001b[32m`;
	if (moneyAvailable / moneyMax > 0.75) txtcolor = `\u001b[36m`;

	return ``
		+ txtcolor
		+ `${pad_str(server, 20)}`
		+ `${pad_str(formatMoney(moneyAvailable, 3, 2), 7)}/${pad_str(formatMoney(moneyMax, 3, 2), 7)}(${pad_str((moneyAvailable / moneyMax).toFixed(2), 4)})`
		+ ` ${pad_str(securityLvl.toFixed(2), 6)}(${pad_str(securityMin, 2)})`
		+ ` ${pad_str(parseInt(ram), 4)}`
		+ ` ${pad_str(get_action(ns, server), 7)}`
		+ ` ${pad_str(hackLvl, 4)}`
		+ ` ${pad_str(growth, 2)}`
		+ ` ${pad_str(core, 2)}`
}

function get_servers(ns) {
	/*
	Gets servers. If specific servers requested, then returns those only.
	Otherwise, scans and returns all servers.
	return: list of servers
	*/
	if (ns.args.length >= 1) {
		return ns.args
	} else {
		return get_all_servers(ns, false)
	}
}

export async function main(ns) {
	ns.disableLog('ALL');
	while (true) {
		var servers = get_servers(ns)
		var stats = {}
		// For each server in servers, get the server data and add to our Hash Table.
		for (var server of servers) {
			stats[parseInt(ns.getServerMaxMoney(server))] = await get_server_data(ns, server)
		}
		// Sort each server based on how much money it holds.
		var keys = Object.keys(stats)
		keys.sort((a, b) => a - b)
		// Print header
		log(ns, "============"
			+ " SERVER " + "==="
			+ " MONEY cur/max(%)" + "=="
			+ " SEC(min) " + ""
			+ "  RAM" + ""
			+ " Action " + ""
			+ " Hack" + ""
			+ " Gr" + ""
			+ " Co " + ""
		);
		// Print the results
		for (var i in keys) {
			var key = keys[i]
			//ns.tprint(stats[key])
			log(ns, stats[key]);
			//log(ns, `WARNING: The "${confName}" overriding "${key}" value: ${JSON.stringify(override)} has a different type (${typeof override}) than the ` +
			//`current default value ${JSON.stringify(match[1])} (${typeof match[1]}). The resulting behaviour may be unpredictable.`, false, 'warning');
			//log(ns, stats[key], false, 'warning')
		}
		await ns.sleep(1 * 1000);
	}
}