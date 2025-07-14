/** @param {NS} ns */
export async function main(ns) {
	ns.exec("HAllH0.js", "home");
	ns.exec("go.js", "home");
	await ns.nuke("n00dles");
	let ThisResetInstall = false;
	let Graft = [
		["OmniTek InfoLoad", 0],
		["SmartJaw", 0],
		["The Shadow's Simulacrum", 0],
		["ADR-V2 Pheromone Gene", 0]
	];

	//Take This Out ++++++
	ThisResetInstall = false;
	if (isGrafting(ns)) {
		while (isGrafting(ns)) { await ns.asleep(1000); }
		ThisResetInstall = true;
	}

	{
		//ToGtaftIndex=-1;
		for (let i = 0; i < Graft.length; i++) {
			if (IsAugInstalled(ns, Graft[i][0]) == false) {
				//let crimeTime = await getNsDataThroughFile(ns, 'ns.singularity.commitCrime(ns.args[0], ns.args[1])', null, ["Shoplift", false]);
				Graft[i][1] = await getNsDataThroughFile(ns, 'ns.grafting.getAugmentationGraftPrice(ns.args[0])', null, [Graft[i][0]]);
				ns.tprint(Graft[i][1]);
				if (ns.getPlayer().money >= Graft[i][1]) {
					await LoopGraftin(ns, Graft[i][0]);
					ns.tprint("Grafting Finish " + Graft[i][0]);
					ThisResetInstall = true;
				}

			}
		}
	}

	if (ThisResetInstall == false) {
		UpGradeRam(ns);
		//UpGradeCore(ns);    
		ns.exec("autopilot.js", "home", 1);
	}
	else {
		UpGradeRam(ns);
		//UpGradeCore(ns);
		ns.exec("HAllH0.js", "home");
		await WorkAndInstall(ns);
	}
}
//********************************************************************************************************** */
async function WorkAndInstall(ns) {
	ns.exec("HAllH0.js", "home");
	let RAM = ns.getServerMaxRam("home") * 0.9;
	await ns.nuke("n00dles");
	ns.exec("/scripts/weaken.js", "home", Math.floor(RAM / 460 * 20 - 5), "n00dles");
	ns.exec("/scripts/hack.js", "home", Math.floor(RAM / 460 * 250 - 10), "n00dles");
	//let crimeTime = await getNsDataThroughFile(ns, 'ns.singularity.commitCrime(ns.args[0], ns.args[1])', null, ["Shoplift", false]);
	let WorkingFaction = FactionWithmostRep(ns);
	await getNsDataThroughFile(ns, 'ns.singularity.workForFaction(ns.args[0],ns.args[1],ns.args[2])', null, [WorkingFaction, "hacking", true]);
	let RepTarget = await getNsDataThroughFile(ns, 'ns.singularity.getAugmentationRepReq(ns.args[0])', null, ["NeuroFlux Governor"]);
	while (RepTarget > await getNsDataThroughFile(ns, 'ns.singularity.getFactionRep(ns.args[0])', null, [WorkingFaction])) {
		await ns.asleep(1000);
	}

	await getNsDataThroughFile(ns, 'ns.singularity.purchaseAugmentation(ns.args[0],ns.args[1])', null, [WorkingFaction, "NeuroFlux Governor"]);
	await getNsDataThroughFile(ns, 'ns.singularity.installAugmentations(ns.args[0])', null, ["1Graft.js"]);
}
//**********************************************************************************************************
async function FactionWithmostRep(ns) {
	const player = JSON.parse(JSON.stringify(ns.getPlayer()));
	let AllJoined = player.factions;
	let MaxRep = -1;
	let MaxRepFaction = ""
	for (let i = 0; i < AllJoined.length; i++) {
		//let crimeTime = await getNsDataThroughFile(ns, 'ns.singularity.commitCrime(ns.args[0], ns.args[1])', null, ["Shoplift", false]);
		let SingFacRep = await getNsDataThroughFile(ns, 'ns.singularity.getFactionRep(ns.args[0])', null, [AllJoined[i]]);
		if (SingFacRep > MaxRep && (AllJoined[i] != "Church of the Machine God")) {
			MaxRep = await getNsDataThroughFile(ns, 'ns.singularity.getFactionRep(ns.args[0])', null, [AllJoined[i]]);
			MaxRepFaction = AllJoined[i];
		}
	}
	return (MaxRepFaction);
}
//**********************************************************************************************************
async function LoopGraftin(ns, GraftingName) {
	await getNsDataThroughFile(ns, 'ns.singularity.travelToCity(ns.args[0])', null, ["New Tokyo"]);
	//let crimeTime = await getNsDataThroughFile(ns, 'ns.singularity.commitCrime(ns.args[0], ns.args[1])', null, ["Shoplift", false]);
	await getNsDataThroughFile(ns, 'ns.grafting.graftAugmentation(ns.args[0], ns.args[1])', null, [GraftingName, true]);
	while (isGrafting(ns) == false) { await ns.asleep(1000); }
	UpGradeRam(ns);
	await WaitForGrafting(ns);
}
//**********************************************************************************************************
async function UpGradeRam(ns) {
	let X = true;
	while (X) { X = await getNsDataThroughFile(ns, 'ns.singularity.upgradeHomeRam()'); }
}
//**********************************************************************************************************
async function UpGradeCore(ns) {
	let X = true;
	while (X) { X = await getNsDataThroughFile(ns, 'ns.singularity.upgradeHomeCore()'); }
}
//**********************************************************************************************************
async function WaitForGrafting(ns) {
	let pid = ns.exec("stanek.js", "home")
	let isEXPRun = false;
	while (isGrafting(ns)) {
		await ns.asleep(100);
		JoinAllInvitation(ns);
		if (ns.isRunning(pid, "home") == false && isEXPRun == false) {
			isEXPRun = true;
			let RAM = ns.getServerMaxRam("home") * 0.9;
			ns.exec("/scripts/weaken.js", "home", Math.floor(RAM / 460 * 20 - 5), "n00dles");
			ns.exec("/scripts/hack.js", "home", Math.floor(RAM / 460 * 250 - 10), "n00dles");
		}
	}
}
//**********************************************************************************************************
async function IsAugInstalled(ns, AugName) {
	const installedAugmentations = await getNsDataThroughFile(ns, 'ns.singularity.getOwnedAugmentations()');
	for (let i = 0; i < installedAugmentations.length; i++) {
		if (installedAugmentations[i] == AugName) {
			return (true);
		}
	}
	return (false);
}
//**********************************************************************************************************
async function JoinAllInvitation(ns) {
	let AllInv = await getNsDataThroughFile(ns, 'ns.singularity.checkFactionInvitations()');
	if (AllInv.length > 0) {
		for (let i = 0; i < AllInv.length; i++) {
			if ((AllInv[i] != "Aevum") && (AllInv[i] != "Chongqing") && (AllInv[i] != "Ishima") && (AllInv[i] != "New Tokyo") && (AllInv[i] != "Sector-12") && (AllInv[i] != "Volhaven")) {
				await getNsDataThroughFile(ns, 'ns.singularity.joinFaction(ns.args[0])', null, [AllInv[i]]);
			}
		}
	}
	return (0);
}
//**********************************************************************************************************
async function isGrafting(ns) {
	let Temp = JSON.stringify(await getNsDataThroughFile(ns, 'ns.singularity.getCurrentWork()'));
	//let crimeTime = await getNsDataThroughFile(ns, 'ns.singularity.commitCrime(ns.args[0], ns.args[1])', null, ["Shoplift", false]);
	return (Temp.search("GRAFTING") != -1);
}