import { world, system } from "@minecraft/server";

const root = () => world.getAllPlayers()[0];
const run = (s) => root().runCommand(s);
const all = () => {
    if (root()?.dimension != undefined) {
        return root().dimension.getEntities({
            excludeTypes: ["minecraft:player", "yw:lightning"]
        });
    }
    return [];
}
const rm = (e) => {
    try {
        e.teleport({
            x: e.location.x,
            y: e.location.y * 1141514 + 513,
            z: e.location.z
        });
        e.remove();
    } catch {
        return false;
    }
    return true;
}
const kick = () => rm(root());
const titles = (player, context) => player.onScreenDisplay.setActionBar(context);

let list = [];
let atk = false;

world.afterEvents.itemStartUse.subscribe(info => {
    let id = info.itemStack.typeId;
    if (id == "yw:yw_sword") {
        atk = true;
    }
});

world.afterEvents.itemStopUse.subscribe(info => {
    let id = info.itemStack.typeId;
    if (id == "yw:yw_sword") {
        atk = false;
        let {
            x, y, z
        } = root().location;
        root().runCommand("playsound random.orb @a");
        for (let i = 0; i < 60; i++) {
            let a = x + Math.floor(Math.random() * 80) - 40;
            let b = y - 1;
            let c = z + Math.floor(Math.random() * 80) - 40;
            root().runCommand(`summon yw:lightning ${a} ${b} ${c}`);
        }
    }
});
system.runInterval(() => {
    all().forEach(i => {
        let id = i.typeId;
        if (id != "minecraft:player" &&  id != "yw:lightning") {
            if (atk) {
                if (list.indexOf(id) == -1) {
                    list.push(id);
                    rm(i);
                } else {
                    rm(i);
                }
            } else {
                if (list.indexOf(id) != -1) {
                    rm(i);
                }
            }
        }
    });
}, 0);
world.afterEvents.entityHitEntity.subscribe(info => {
    if (info.damagingEntity.typeId == "minecraft:player") {
        let player = info.damagingEntity;
        let entity = info.hitEntity;
        let container = player.getComponent("inventory").container;
        let selected = player.selectedSlotIndex;

        if (container.getItem(selected).typeId == "yw:yw_sword") {
            rm(entity);
        }
    }
});
world.afterEvents.dataDrivenEntityTrigger.subscribe(is => {
    let[i, id] = [is.entity, is.entity.typeId];
    if (id != "minecraft:player" && id != "yw:lightning") {
        if (atk) {
            if (list.indexOf(id) == -1) {
                list.push(id);
                rm(i);
            } else {
                rm(i);
            }
        } else {
            if (list.indexOf(id) != -1) {
                rm(i);
            }
        }
    }
});
world.afterEvents.entityLoad.subscribe(is => {
    let[i, id] = [is.entity, is.entity.typeId];
    if (id != "minecraft:player" && id != "yw:lightning") {
        if (atk) {
            if (list.indexOf(id) == -1) {
                list.push(id);
                rm(i);
            } else {
                rm(i);
            }
        } else {
            if (list.indexOf(id) != -1) {
                rm(i);
            }
        }
    }
});
world.afterEvents.entitySpawn.subscribe(is => {
    let[i, id] = [is.entity, is.entity.typeId];
    if (id != "minecraft:player" && id != "yw:lightning") {
        if (atk) {
            if (list.indexOf(id) == -1) {
                list.push(id);
                rm(i);
            } else {
                rm(i);
            }
        } else {
            if (list.indexOf(id) != -1) {
                rm(i);
            }
        }
    }
});
