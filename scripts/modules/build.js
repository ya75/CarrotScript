import {world, system} from '@minecraft/server';
import {ActionFormData, MessageFormData, ModalFormData} from '@minecraft/server-ui';
import {queue} from './dinic';
import {vector} from './vector';
import {box, lazyFor, msg, copy_array, lazyWhile, resumeLazyFor, stopLazyFor, rad, isArea, HoldItem, sound} from './utility_function';

const modeArray = [
    {modeId: "fill", disp: "fill(座標1, 座標2)", texture: "textures/items/dye_powder_red"}, 
    {modeId: "clone", disp: "clone(座標1, 座標2, clone先)", texture: "textures/items/dye_powder_orange"},
    {modeId: "sphere", disp: "球(中心, 半径端)", texture: "textures/items/dye_powder_yellow"},
    {modeId: "sphere2", disp: "球面(中心, 内径端, 外径端)", texture: "textures/items/dye_powder_lime"},
    {modeId: "xzBFS", disp: "xz平面塗りつぶし(始点)", texture: "textures/items/dye_powder_green"},
    {modeId: "xyBFS", disp: "xy平面塗りつぶし(始点)", texture: "textures/items/dye_powder_cyan"},
    {modeId: "yzBFS", disp: "yz平面塗りつぶし(始点)", texture: "textures/items/dye_powder_light_blue"},
    {modeId: "xzCircle", disp: "xz底面円柱(中心, 半径端, 高さ目安)", texture: "textures/items/dye_powder_blue"},
    {modeId: "xyCircle", disp: "xy底面円柱(中心, 半径端, 高さ目安)", texture: "textures/items/dye_powder_purple"},
    {modeId: "yzCircle", disp: "yz底面円柱(中心, 半径端, 高さ目安)", texture: "textures/items/dye_powder_magenta"},
    {modeId: "undo", disp: "前に戻す", texture: "textures/items/dye_powder_pink"}
];

let random, timer;

export const buildManager = function(rand, time) {
    random = rand;
    timer = time;
}

function toDate(block) {
    const Date = `${block.typeId} ${JSON.stringify(block.permutation.getAllStates()).replace(/\{/g, "[").replace(/\}/g, "]")}`;
    return Date;
}

function isBuildArea(player, v) {
    if(player.hasTag(`op`) && !player.hasTag(`join`)) return true;
    if(player.buildArea == undefined) return false;
    const l = player.buildArea.l.added(new vector(-1, -1, -1)), r = player.buildArea.r.added(new vector(1, -1, 1));
    return isArea(l, r, v);
}

const banded_block = [
    "minecraft:creeper_head",
    "minecraft:zombie_head",
    "minecraft:piglin_head",
    "minecraft:skeleton_skull",
    "minecraft:wither_skeleton_skull",
    "minecraft:dragon_head",
    "minecraft:player_head"
];

const banded = (block) => {
    for(const p of banded_block) if(block.typeId == p) return true;
    return false;
}

world.beforeEvents.playerBreakBlock.subscribe(ev => {
    const {player, itemStack, block} = ev;
    if(player.set == undefined) player.set = [];
    if(player.pos == undefined) player.pos = [];
    if(itemStack != undefined) {
    if(itemStack.typeId == "build:stick") {
        ev.cancel = true;
        if(player.stickCool > timer.get()) return;
        if(player.isSneaking) {
            player.set = [];
            player.runCommandAsync(`playsound note.chime @s ~ ~ ~ 1 1 1`);
            msg(player, `§bブロックを§aクリア§bしました`);
        }
        else {
            if(banded(block)) {
                msg(player, `§cそのブロックは追加できません`);
                sound(`note.bass`, [player]);
                return;
            }
            const Data = toDate(block);
            player.set.push(Data);
            player.runCommandAsync(`playsound note.pling @s ~ ~ ~ 1 ${1+(player.set.length-1)*0.1} 1`);
            msg(player, `§aブロックを追加しました`);
        }
        player.stickCool = timer.get()+5;
    }

    const push = () => {
        player.pos.push(new vector(block.location));
    }

    if(itemStack.typeId == "build:wooden_axe") {
        ev.cancel = true;
        if(player.axeCool > timer.get()) return;
        if(!isBuildArea(player, new vector(block.location))) return;
        if(player.isSneaking) {
            player.mode = undefined;
            player.pos = undefined;
            player.runCommandAsync(`playsound note.chime @s ~ ~ ~ 1 1 1`);
            msg(player, `§bモードを§aクリア§bしました`);
        }
        else if(player.mode == undefined) {
            const form = new ActionFormData();
            form.title("§m§o§d§e");
            for(const elm of modeArray) form.button("stack#01" + elm.disp, elm.texture);
            form.button("stack#01戻る", "textures/items/dye_powder_gray");
            system.run(() => {
                form.show(player).then((res) => {
                    if(res.canceled || res.selection == modeArray.length) return;
                    player.mode = modeArray[res.selection].modeId;
                    push();
                })
            });
        } else {
            push();
        }
        player.axeCool = timer.get()+5;
    }}

    if(!isBuildArea(player, new vector(block.location))) {
        ev.cancel = true;
    }
});

world.beforeEvents.playerPlaceBlock.subscribe(ev => {
    const { player, block} = ev;
    const itemStack = HoldItem(player);
    if(itemStack.typeId == "minecraft:mob_spawner") ev.cancel = true;
    if(itemStack.typeId == "minecraft:trial_spawner") ev.cancel = true;
    if(itemStack.typeId == "minecraft:vault") ev.cancel = true;
    if(itemStack.typeId == "minecraft:piston") ev.cancel = true;
    if(itemStack.typeId == "minecraft:sticky_piston") ev.cancel = true;
    if(itemStack.typeId == "minecraft:end_portal_frame") ev.cancel = true;
    if(itemStack.typeId == "minecraft:obsidian") ev.cancel = true;
    if(!isBuildArea(player, new vector(block.location))) ev.cancel = true;
});

function decode(i, dx, dy, dz) {
    let x, y, z;
    const Dx = Math.abs(dx), Dy = Math.abs(dy), Dz = Math.abs(dz);
    x = i%Dx; i /= Dx; i = Math.floor(i);
    y = i%Dy; i /= Dy; i = Math.floor(i);
    z = i%Dz; i /= Dz; i = Math.floor(i);
    return [x, y, z];
}

const Delta1 = [new vector(1, 0, 0), new vector(0, 0, 1), new vector(-1, 0, 0), new vector(0, 0, -1)];
const Delta2 = [new vector(1, 0, 0), new vector(0, 1, 0), new vector(-1, 0, 0), new vector(0, -1, 0)];
const Delta3 = [new vector(0, 1, 0), new vector(0, 0, 1), new vector(0, -1, 0), new vector(0, 0, -1)];

system.runInterval(() => {
    for(const player of world.getPlayers()) {
        if(player.que == undefined) player.que = new queue();
        if(player.running == undefined) player.running = false;
        if(player.undoQue == undefined) player.undoQue = new queue();
        if(player.snapShot == undefined) player.snapShot = new queue();

        const error = () => {
            msg(player, `§cブロックセットが空です`);
            player.runCommand(`playsound note.bass @s ~ ~ ~ 1 1 1`);
        }
        
        const modeReset = () => {
            player.mode = undefined;
            player.pos = [];
        }
        
        if(player.mode == "fill") {
            if(player.pos.length == 2) {
                if(player.set.length != 0) player.que.push([player.mode, new vector(player.pos[0]), new vector(player.pos[1]), copy_array(player.set)]);
                else error();
                modeReset();
            }
        }
        if(player.mode == "clone") {
            if(player.pos.length == 3) {
                player.que.push([player.mode, new vector(player.pos[0]), new vector(player.pos[1]), new vector(player.pos[2])]);
                modeReset();
            }
        }
        if(player.mode == "sphere") {
            if(player.pos.length == 2) {
                if(player.set.length != 0) player.que.push([player.mode, new vector(player.pos[0]), new vector(player.pos[1]), copy_array(player.set)]);
                else error();
                modeReset();
            }
        }
        if(player.mode == "sphere2") {
            if(player.pos.length == 3) {
                if(player.set.length != 0) player.que.push([player.mode, new vector(player.pos[0]), new vector(player.pos[1]), copy_array(player.set), new vector(player.pos[2])]);
                else error();
                modeReset();
            }
        }
        if(player.mode == "xzBFS" || player.mode == "xyBFS" || player.mode == "yzBFS") {
            if(player.pos.length == 1) {
                if(player.set.length != 0) player.que.push([player.mode, new vector(player.pos[0]), copy_array(player.set)]);
                else error();
                modeReset();
            }
        }
        if(player.mode == "undo") {
            if(player.pos.length == 1) {
                player.que.push([player.mode]);
            }
            modeReset();
        }
        if(player.mode == "xzCircle" || player.mode == "xyCircle" || player.mode == 'yzCircle') {
            if(player.pos.length == 3) {
                if(player.set.length != 0) player.que.push([player.mode, new vector(player.pos[0]), new vector(player.pos[1]), new vector(player.pos[2]), copy_array(player.set)]);
                else error();
                modeReset();
            }
        }

        if(!player.running) {
            const que = player.que;
            if(!que.empty()) {
                const f = que.front();
                que.pop();
                switch(f[0]) {
                    case "fill": { fill(player, f[1], f[2], f[3]); player.undoCnt = 0; break; }
                    case "clone": { clone(player, f[1], f[2], f[3]); player.undoCnt = 0; break; }
                    case "sphere": { sphere(player, f[1], f[2], f[3], f[1]); player.undoCnt = 0; break; }
                    case "sphere2": { sphere(player, f[1], f[4], f[3], f[2]); player.undoCnt = 0; break; }
                    case "xzBFS": { bfs(player, f[1], f[2], Delta1); player.undoCnt = 0; break; }
                    case "xyBFS": { bfs(player, f[1], f[2], Delta2); player.undoCnt = 0; break; }
                    case "yzBFS": { bfs(player, f[1], f[2], Delta3); player.undoCnt = 0; break; }
                    case "xzCircle": { circle(player, f[1], f[2], f[3], f[4], ["x", "z", "y"]); player.undoCnt = 0; break; }
                    case "xyCircle": { circle(player, f[1], f[2], f[3], f[4], ["y", "x", "z"]); player.undoCnt = 0; break; }
                    case "yzCircle": { circle(player, f[1], f[2], f[3], f[4], ["z", "y", "x"]); player.undoCnt = 0; break;}
                    case "undo": { undo(player); break; }
                }
                player.running = true;
            }
        }
    }
});

system.runInterval(() => {
    for(const player of world.getPlayers()) {
        if(player.pos != undefined) for(const p of player.pos) box(p);
    }
}, 10)

function end(player) {
    player.running = false;
    player.snapShot.push(player.undoCnt);
}

function setBlock(v, set, player, isUndo = false) {
    if(!isBuildArea(player, v)) return;
    const Date = random.elm(set);
    const FromDate = toDate(getBlock(v));
    if(!isUndo) {
        player.undoQue.push({from: FromDate, to: Date, v: new vector(v)});
        player.undoCnt++;
    }
    world.getDimension("overworld").runCommand(`setblock ${Math.floor(v.x+1e-5)} ${Math.floor(v.y+1e-5)} ${Math.floor(v.z+1e-5)} ${Date}`);
}

function getBlock(v) {
    return world.getDimension("overworld").getBlock(v);
}

function fill(player, vP, vQ, set) {
    const P = new vector(vP), Q = new vector(vQ), v = Q.removed(P);
    const [ex, ey, ez] = v.e();
    v.add(ex).add(ey).add(ez);
    const func = (i) => {
        const [x, y, z] = decode(i, v.x, v.y, v.z);
        const [kex, key, kez] = [ex.scaled(x), ey.scaled(y), ez.scaled(z)];
        const Real = P.added(kex).added(key).added(kez);
        setBlock(Real, set, player);
    }
    lazyFor(func, 15, Math.abs(v.x*v.y*v.z), () => {end(player)});
}

function clone(player, vP, vQ, vR) {
    const P = new vector(vP), Q = new vector(vQ), R= new vector(vR), v = Q.removed(P);
    const [ex, ey, ez] = v.e();
    v.add(ex).add(ey).add(ez);
    const que = new queue();
    const func = (i) => {
        const [x, y, z] = decode(i, v.x, v.y, v.z);
        const [kex, key, kez] = [ex.scaled(x), ey.scaled(y), ez.scaled(z)];
        const Real = P.added(kex).added(key).added(kez);
        que.push([toDate(getBlock(Real))]);
    }

    const func2 = (i) => {
        const [x, y, z] = decode(i, v.x, v.y, v.z);
        const [kex, key, kez] = [ex.scaled(x), ey.scaled(y), ez.scaled(z)];
        const Real = R.added(kex).added(key).added(kez);
        const f = que.front();
        que.pop();
        setBlock(Real, f, player);
    }

    const cloneFunc = () => {
        lazyFor(func2, 60, Math.abs(v.x*v.y*v.z), () => {end(player)});
    };
    lazyFor(func, 15, Math.abs(v.x*v.y*v.z), () => {cloneFunc()});
}

function sphere(player, vP, vQ, set, vR) {
    const P = new vector(vP), Q = new vector(vQ), u = Q.removed(P), R = u.norm()+0.99, fR = Math.floor(R)+1, v = new vector(fR, fR, fR), r = P.removed(vR).norm();
    const [ex, ey, ez] = v.e();
    v.add(ex).add(ey).add(ez);

    if(R<r) { // 実行する価値がない場合はキル
        system.run(() => {
            player.running = false;
        });
        return;
    }

    let spherePos = [];

    const sphereJudge = (target) => {
        const dif = target.removed(P);
        return (dif.norm() < R) && (r <= dif.norm());
    }

    const func = (i) => {
        const [x, y, z] = decode(i, v.x, v.y, v.z);
        const [kex, key, kez] = [ex.scaled(x), ey.scaled(y), ez.scaled(z)];
        const Real = P.added(kex).added(key).added(kez);
        if(sphereJudge(Real)) spherePos.push(Real);
    }

    //const funcsphere = (lastFunc) => { lazyFor((i) => {setBlock(spherePos[i], set, player)}, 15, spherePos.length, () => {lastFunc()});}
    const rX = (lastFunc) => { lazyFor((i) => {spherePos[i].rotateX(P, rad(90)); setBlock(spherePos[i], set, player);}, 15, spherePos.length, () => {lastFunc()});}
    const rZ = (lastFunc) => { lazyFor((i) => {spherePos[i].rotateZ(P, rad(90)); setBlock(spherePos[i], set, player);}, 15, spherePos.length, () => {lastFunc()});}

    const f0 = () => {rZ(() => {rZ(() => {rZ(() => {rZ(() => {rX(() => {rZ(() => {rZ(() => {rZ(() => {end(player)})})})})})})})})};
    lazyFor(func, 60, v.x*v.y*v.z, () => {f0();});
}

function bfs(player, vP, set, Delta) {
    player.memo = {};
    player.bfsque = new queue();
    const P = new vector(vP);
    const que = player.bfsque;
    que.push(P);
    player.memo[P.toString(2)] = true;
    setBlock(P, set, player);
    const func = () => {
        const v = que.front();
        que.pop();

        for(const p of Delta) {
            const nex = v.added(p);
            if(player.memo[nex.toString(2)] != undefined) continue;
            if(getBlock(nex).typeId != "minecraft:air") continue;
            if(!isBuildArea(player, nex)) continue;
            setBlock(nex, set, player);
            player.memo[nex.toString(2)] = true;
            que.push(nex);
        }
    }
    lazyWhile(func, 15, () => {return que.size()}, () => {end(player)});
}

function undo(player) {
    const que = player.undoQue;
    const snap = player.snapShot;
    if(snap.size() == 0) {
        sound(`note.bass`, [player]);
        msg(player, `§c戻す内容がありません`);
        system.run(() => {
            player.running = false;
        });
        return;
    }
    
    const func = (i) => {
        const b = que.back();
        que.pop_back();
        setBlock(b.v, [b.from], player, true);
    }

    const endFunc = () => {
        player.running = false;
        snap.pop_back();
    }
    
    lazyFor(func, 15, snap.back(), endFunc);
}

function circle(player, vP, vQ, vR, set, pole) {
    const P = new vector(vP), Q = new vector(vQ), R = new vector(vR); 
    Q[pole[2]] = P[pole[2]];
    R[pole[0]] = Q[pole[0]];
    R[pole[1]] = Q[pole[1]];
    const u = Q.removed(P);
    const r = u.norm()+0.99, fr = Math.floor(r)+1;
    const v = new vector(0, 0, 0);
    v[pole[0]] = fr;
    v[pole[1]] = fr;
    const h = (R.removed(Q)).norm();
    const [ex, ey, ez] = v.e(), [fx, fy, fz] = (R.removed(Q)).e();
    v.add(ex).add(ey).add(ez);
    let circlePos = [], circlePos2 = [];

    const circleJudge = (target) => {
        const dif = target.removed(P);
        return dif.norm() < r;
    }

    const func = (i) => {
        const [x, y, z]  = decode(i, v.x, v.y, v.z);
        const [kex, key, kez] = [ex.scaled(x), ey.scaled(y), ez.scaled(z)];
        const Real = P.added(kex).added(key).added(kez);
        if(circleJudge(Real)) circlePos.push(Real);
    }

    const rotate = (lastFunc) => {
        lazyFor((i) => {
            if(pole[2] == 'x') circlePos[i].rotateX(P, rad(90));
            if(pole[2] == 'y') circlePos[i].rotateY(P, rad(90));
            if(pole[2] == 'z') circlePos[i].rotateZ(P, rad(90));
            circlePos2.push(new vector(circlePos[i]));
        }, 60, circlePos.length, lastFunc);
    }

    const setB = (lastFunc) => {
        lazyFor((i) => {
            setBlock(circlePos2[i], set, player);
            if(pole[2] == 'x') circlePos2[i].add(fx);
            if(pole[2] == 'y') circlePos2[i].add(fy);
            if(pole[2] == 'z') circlePos2[i].add(fz);
        }, 15, circlePos2.length, lastFunc);
    }

    let j = 0;
    const f1 = () => {
        setB(() => {
            if(j >= h) {
                end(player);
            } else {
                f1();
                j++;
            }
        });
    }

    const f0 = () => {rotate(() => rotate(() => {rotate(() => {rotate(() => f1())})}))};
    lazyFor(func, 60, v.x*v.y*v.z, f0);
}