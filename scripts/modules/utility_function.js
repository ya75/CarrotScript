import {world, system, ItemStack} from '@minecraft/server';
import { vector } from './vector';

let ov;
system.run(() => {
    ov = world.getDimension('overworld');
});

export const iptpm = (player, bool) => {
    const mode = bool?"enabled":"disabled";
    player.runCommand(`inputpermission set @s movement ${mode}`);
}

export const getBlock = (v) => {
    const res = ov.getBlock(v);
    return res;
}

export const Item = (typeId, amount=1, lock = 'none') => {
    const item = new ItemStack(typeId, amount);
    item.lockMode = lock;
    return item;
}

export const III = (typeId, amount) => {
    return Item(typeId, amount, 'inventory');
}

export const IIS = (typeId, amount) => {
    return Item(typeId, amount, 'slot');
}

export const gp = (option = {}) => {
    return ov.getPlayers(option);
}

export const gpt = (arr) => {
    let x = [], y = [];
    for(const tag of arr) {
        if(!tag.startsWith("!")) x.push(tag);
        else {
            let str = "", flag = false;
            for(const char of tag) {
                if(flag) str += char;
                flag = true;
            }
            y.push(str);
        }
    }
    const ps1 = gp({tags: x});
    let res = [];
    for(const player of ps1) {
        let flag = true;
        for(const tag of y) {
            if(player.hasTag(tag)) flag = false;
        }
        if(flag) res.push(player);
    }
    return res;
}

export const gptc = (arr) => {
    const res = gpt(arr);
    return res.length;
}

export const sound = (id, array) => {
    if(array == undefined) array = gp();
    for(const player of array) if(player != undefined) try{player.runCommandAsync(`playsound ${id} @s ~ ~1 ~`);} catch(e) {};
}

export const title = (str, array) => {
    if(array == undefined) array = gp();
    for(const player of array) if(player != undefined) try{player.runCommandAsync(`titleraw @s title {"rawtext":[{"text":"${str}"}]}`);} catch(e) {};
}

export const actionbar = (str, array) => {
    if(array == undefined) array = gp();
    for(const player of array) if(player != undefined) try{player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":"${str}"}]}`);} catch(e) {}
}

export const particle = (v, player, particleId) => {
    if(player != undefined) player.spawnParticle(particleId, v);
    else ov.spawnParticle(particleId, v);
}

export const cont = (player) => {
    if(player == undefined) return undefined;
    return player.getComponent(`inventory`).container;
}

export const HoldItem = (player) => {
    if(player == undefined) return undefined;
    const itemStack = player.getComponent(`inventory`).container.getItem(player.selectedSlotIndex);
    return itemStack;
}

export const line = (p, q, player, particleId) => {
    const pq = q.removed(p);
    const d = 3;
    for(let i=0; i<=pq.norm()*d; i++) {
        const scaled = p.added(pq.scaled(i/d/pq.norm()));
        //world.sendMessage(JSON.stringify(scaled));
        try{particle(scaled, player, particleId);} catch(e) {};
    }
}

export const tp = (player, pos = new vector(0, 0, 0), rot = {x:0, y:0}) => {
    if(player == undefined) return false;
    if(pos == undefined) pos = new vector(0, 0, 0);
    if(rot == undefined) rot = {x: 0, y:0};
    player.tryTeleport(pos, {rotation: rot});
    return true;
}

export const box = (bottomV, player) => {
    bottomV.x = Math.floor(bottomV.x);
    bottomV.y = Math.floor(bottomV.y);
    bottomV.z = Math.floor(bottomV.z);
    const v1 = bottomV;
    const v2 = bottomV.added(new vector(1, 0, 0));
    const v3 = bottomV.added(new vector(0, 1, 0));
    const v4 = bottomV.added(new vector(0, 0, 1));
    const v5 = bottomV.added(new vector(1, 1, 0));
    const v6 = bottomV.added(new vector(1, 0, 1));
    const v7 = bottomV.added(new vector(0, 1, 1));
    const v8 = bottomV.added(new vector(1, 1, 1));
    const func = (p, q) => {
        line(p, q, player, "minecraft:redstone_wire_dust_particle");
        //world.sendMessage(`${JSON.stringify(p)} ${JSON.stringify(q)}`)
    }
    func(v1, v2);
    func(v1, v3);
    func(v1, v4);
    func(v2, v5);
    func(v2, v6);
    func(v3, v5);
    func(v3, v7);
    func(v4, v6);
    func(v4, v7);
    func(v5, v8);
    func(v6, v8);
    func(v7, v8);
}

export const score = (target, object) => {
    if(target.scoreboardIdentity == undefined) return 0;
    return world.scoreboard.getObjective(object).getScore(target.scoreboardIdentity);
}

export const setScore = (target, object, amount) => {
    if(target.scoreboardIdentity == undefined) return false;
    world.scoreboard.getObjective(object).setScore(target.scoreboardIdentity, amount);
    return true;
}

export const addScore = (target, object, amount) => {
    if(target.scoreboardIdentity == undefined) return false;
    setScore(target, object, score(target, object)+amount);
    return true;
}

export const rad = (deg) => {
    return (deg/180)*Math.PI;
}

export const msg = (str, arr) => {
    if(arr == undefined) world.sendMessage(str);
    else {
        for(const p of arr) {
            if(p == undefined) continue;
            p.sendMessage(str);
        }
    }
}

let isStopLazyFor = false;
export const stopLazyFor = () => {isStopLazyFor = true;}
export const resumeLazyFor = () => {isStopLazyFor = false;}

export const lazyFor = (func, imple, limit, lastFunc) => {
    const f = (start) => {
        if(isStopLazyFor) return;
        for(let i=start; i<Math.min(start+imple, limit); i++) {
            func(i);
            if(i >= limit-1) {
                if(lastFunc != undefined) lastFunc();
                return;
            }
        }
        system.runTimeout(() => {f(start+imple)}, 1)
    }
    system.runTimeout(() => {f(0)}, 1);
}

export const lazyWhile = (func, imple, whileFunc, lastFunc) => {
    const f = () => {
        if(isStopLazyFor) return;
        for(let i=0; i<imple && whileFunc(); i++) {
            func();
        }
        if(!whileFunc()) {
            if(lastFunc != undefined) lastFunc();
            return;
        }
        system.runTimeout(() => {f()}, 1);
    }
    system.runTimeout(() => {f()}, 1);
}

export const isAirBetween = (p, q) => {
    const delta = 1e-5;
    const deltaSet = [
        new vector(delta, 0, 0),
        new vector(-delta, 0, 0),
        new vector(0, delta, 0),
        new vector(0, -delta, 0),
        new vector(0, 0, delta),
        new vector(0, 0, -delta)
    ];
    const pq = q.removed(p), norm = pq.norm();
    const xyz = ["x", "y", "z"];

    const func = (w) => {
        for(let v = Math.floor(p[w])+(pq[w]>=0); (p[w] < q[w] && v<=Math.floor(q[w])) || (p[w] >= q[w] && v>=Math.floor(q[w])); v+=(p[w]<q[w] ? 1: -1)) {
            const base = p.added(pq.scaled((v-p[w])/(q[w]-p[w])));
            const norm2 = base.removed(p).norm();
            if(norm2 > norm) continue;
            let flag = false;
            //particle(base, undefined, "minecraft:redstone_wire_dust_particle");
            for(const elm of deltaSet) {
                const now = base.added(elm);
                const block = world.getDimension(`overworld`).getBlock(now);
                if(block == undefined || block.typeId != 'minecraft:air') flag = true;
            }
            if(flag) return 0;
        }
        return 1;
    }

    let flag = false; 
    for(const elm of xyz) if(!func(elm)) flag = true;
    if(flag) return 0;
    return 1;
}

export async function wait(tick) {
    return new Promise(resolve => {
        system.runTimeout(() => {
            resolve();
        }, 1000*tick/20)
    });
}

export function split2(mes, eraseAtMark = false) {
    if(mes == "") return [];
    let res = [];
    let part = "";
    let doublequo = 0;
    for(let i=0; i<mes.length; i++) {
        if(mes[i] == "\"") {
            doublequo++;
            doublequo %= 2;
        }
        if(eraseAtMark && mes[i] == "@") continue;
        if(mes[i] != " " || doublequo == 1) {
            if(mes[i] != "\"") part += mes[i];
        } else if(i != mes.length-1 && mes[i+1] != " ") {
            res.push(part);
            part = "";
        }
    }
    if(part != "") res.push(part);
    if(doublequo == 1) return undefined;
    else return res;
}

export function copy_array(array) {
    let res = [];
    for(const p of array) res.push(p);
    return res;
}

export function isArea(l, r, a) {
    const [x, y, z] = (r.removed(l)).e();
    const newR = r.added(x).added(y).added(z);
    const xFlag = (l.x <= a.x-1) ^ (newR.x <= a.x-1);
    const yFlag = (l.y <= a.y-1) ^ (newR.y <= a.y-1);
    const zFlag = (l.z <= a.z-1) ^ (newR.z <= a.z-1);
    return xFlag & yFlag & zFlag;
}