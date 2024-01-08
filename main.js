import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import {AVLTree} from './modules/avl.js'; // AVLTreeについては、https://learnersbucket.com/tutorials/data-structures/avl-tree-in-javascript/#google_vignette のサイトのものを改造しました

const c = world.getDimension("overworld"); // 記述を簡略化する為です

const carrots = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const clickItemId = "minecraft:compass";
const clickItemId2 = "minecraft:clock";

const itemMaxUse = 1e7*20; // ショットガンの最大で使用できる(？)時間です
const kbMul = 4.0; // 役職フクロウで飛ぶ威力の倍率です
const reg_term = 40;

let gameInfo;
let contestInfo = new AVLTree();

var rarmors = [];
var barmors = [];
var items = [];
const thro_block = [
    "minecraft:air",
    "minecraft:ladder",
    "minecraft:red_flower",
    "minecraft:yellow_flower",
    "minecraft:tallgrass",
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:chain",
    "minecraft:scaffolding",
    "minecraft:structure_void",
    "minecraft:double_plant",
    "minecraft:light_block"
];
 
// ローリングハッシュ -->
// 例えば、採掘者のメテオで貫通できるブロックか？を高速で判定するために、貫通可能なブロック群(上のthro_block)をハッシュで数値化したものをAVLTreeに入れることで、
// そこそこ高い確率で正しい判定が可能になります。この前計算を施すことで、N=(thro_block配列の長さ) とすると、判定問題ごとの計算量はO(N)から概ねO(logN)に改善されます。
const CharaParm = {a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9, k: 10, l: 11, m: 12, n: 13, o: 14, p: 15, q: 16, r: 17, s: 18, t: 19, u: 20, v: 21, w: 22, x: 23, y: 24, z: 25};
CharaParm[":"] = 26;
CharaParm["_"] = 27;

const p = 1000003, B = 30;
function hash(str) {
    let res = 0, beki = 1;
    for(let i=0; i<str.length; i++) {
        res += beki*(CharaParm[str[i]]+1);
        beki *= B;
        res %= p;
        beki %= p;
    }
    return res;
}
//<--

let thro = new AVLTree();
for(const element of thro_block) {
    thro.insert(hash(element));
}

const roleInfo = [
    {name: "§l§c兵士", tag: "warrior", object: "warrior"},
    {name: "§l§g採掘者", tag: "", object: "saikutu"},
    {name: "§l§6弓兵", tag: "archer", object: "archer"},
    {name: "§l§a後継者", tag: "suc", object: "suc"},
    {name: "§l§b剣士", tag: "sword", object: "sword"},
    {name: "§l§2木こり", tag: "", object: "kikori"},
    {name: "§l§f白兎", tag: "trick", object: "rabbit"},
    {name: "§l§d薬師", tag: "pharm", object: "pharm"},
    {name: "§l§c格闘家", tag: "fight", object: "fighter"},
    {name: "§l§7骸骨", tag: "gaikotu", object: "gaikotu"},
    {name: "§l§4暗殺者", tag: "ansatu", object: "ansatu"},
    {name: "§l§j重剣士", tag: "hwarrior", object: "hwarrior"},
    {name: "§l§e狩人", tag: "kariudo", object: "kariudo"},
    {name: "§l§t梟(ふくろう)", tag: "hukurou", object: "hukurou"},
    {name: "§l§q盗人", tag: "thief", object: "thief"},
    {name: "§l§6猫又", tag: "nekomata", object: "nekomata"}
];

const specArea = [
    {x1: -49, y1: -1, z1: 100, x2: 50, y2: -55, z2: 318},
    {x1: 2, y1: -44, z1: 322, x2: -1, y2: -41, z2: 317},
    {x1: -1, y1: -44, z1: 96, x2: -4, y2: -41, z2: 100},
    {x1: -93, y1: 26, z1: 565, x2: 93, y2: -50, z2: 379},
    {x1: 12, y1: -22, z1: 601, x2: -12, y2: -46, z2: 558},
    {x1: -12, y1: -46, z1: 386, x2: 12, y2: -20, z2: 343},
    {x1: -235, y1: -25, z1: 251, x2: -124, y2: -53, z2: 110}
]

const raincheck = [
    {dx: 0, dz: 0}
];

const memo_effect = [
    "strength",
    "regeneration",
    "speed"
];

// 重複無しエフェクト (純粋なエフェクトコマンドに対して、損をしない付与の仕方をしたい、という考えの基です)
// -->
function effect_init(player) {
    for(const element of memo_effect) {
        player[element] = new AVLTree();
    }
}

function effect_apply(player, effect_name, amplifier, tick) {
    var pre = player[effect_name].find(amplifier);
    var max = player[effect_name].max();
    if(tick<=0) return;
    if(max == undefined) {
        player[effect_name].insert(amplifier, tick);
        player.addEffect(effect_name, tick, {amplifier: amplifier, showParticles: true});
        return;
    }
    if(pre != undefined) {
        if(pre.date <= tick) {
            pre.date = tick;
            if(max.key <= amplifier) {
                player.addEffect(effect_name, tick, {amplifier: amplifier, showParticles: true});
            }
        }
    } else {
        player[effect_name].insert(amplifier, tick);
        if(max.key <= amplifier) {
            player.addEffect(effect_name, tick, {amplifier: amplifier, showParticles: true});
        }
    }
    return;
}

function effect_update(player) {
    for(const element of memo_effect) {
        let deleting = [];
        const func = (node) => {
            if(node.date == 0) deleting.push(node.key);
            node.date--;
        }
        player[element].update(func);
        for(const elm of deleting) player[element].delete(elm);
        const max = player[element].max();
        if(max == undefined) continue;
        if(deleting.length >= 1) effect_apply(player, element, max.key, max.date); // 変更があったときのみ最大のエフェクトを付与します
    }
// <--

// 人baseの向いている方向側(?)にplayerがいるか判定します
function judge_front(base, player) {
    const rot = base.getRotation();
    const theta = rad(rot.y), phi = rad(rot.x);
    const offset = base.location, p = player.location;
    const dp = {x: p.x-offset.x, y: p.y-offset.y, z: p.z-offset.z}; // (DynamicProgramingの略ではなくて、)デルタpの略です。射出された位置と今検査しているプレイヤーの人の位置の差を格納します
    const Rp = Math.sqrt(dp.x*dp.x+dp.y*dp.y+dp.z*dp.z), cosThetap = dp.z/Rp, sinThetap = (-1)*dp.x/Rp, cosPhip = Math.sqrt(dp.x*dp.x+dp.z*dp.z)/Rp, sinPhip = (-1)*dp.y/Rp; // このチェックで、使う数値を前計算しておきます
    const Naiseki = (cosThetap*cosPhip*Math.cos(theta)*Math.cos(phi)+sinThetap*cosPhip*Math.sin(theta)*Math.cos(phi)+sinPhip*Math.sin(phi));
    if(!(Naiseki>=0)) return false;
    return true;
}

var star;
var berries;
var clock;
var magic;
var ruby;
var kohakutou;
var glow_berries = [];
var spawncarrot = [];
var spawncarrot2 = [];
var raintime = 0;
var rainsystem = undefined;

//線形合同法(に近いモノ(?))による乱数生成-->
//この方のサイトを参考にしました https://computing2.vdslab.jp/docs/random/lcg
let seed = 1;
function random() {
    const a = 48271;
    const m = 2147483647;
    const q = int(m/a);
    const r = m%a;
    const hi = int(seed/q);
    const lo = seed%q;
    const test = a*lo - r*hi;
    if(test>0) {
        seed = test;
    } else {
        seed = test+m;
    }
    return seed/m;
}
//<--

function HoldItem(player) { // 手にしているアイテムを返します
    return player.getComponent("inventory").container.getItem(player.selectedSlot);
}

function toukei(player) {
    new MessageFormData()
    .title("統計")
    .body(`参加回数 ${score(player, "Tjoined")}\n総キル数 ${score(player, "Tkill")}\n総デス数 ${score(player, "Tdeath")}\n総納品数 ${score(player, "Tcarrot")}\n総強奪数 ${score(player, "Tsteal")}`)
    .button1("OK")
    .show(player).then((Response) => {
        if(Response.selection == 0) return;
    });
}

function syuukeishow(player, text) {
    new MessageFormData()
    .title("コンテスト情報")
    .body(text)
    .button1("OK")
    .show(player).then((Response) => {
        if(Response.selection == 0) return;
    });
}

function prepare() {
    let cbox = world.getDimension("overworld").getBlock({x: -12, y: -48, z: 29}).getComponent("inventory").container;
    for(let i=0; i<cbox.size; i++) {
        spawncarrot[i] = cbox.getItem(i);
    }
    cbox = world.getDimension("overworld").getBlock({x: -14, y: -48, z: 29}).getComponent("inventory").container;
    for(let i=0; i<7; i++) {
        spawncarrot2[i] = cbox.getItem(i);
    }
    var base = Number(world.getDimension("overworld").getBlock({x: -10, y: -48, z: 32}).getComponent("inventory").container.getItem(0).nameTag);
    for(let i=0; i<base; i++) {
        let block = world.getDimension("overworld").getBlock({x: -11-i, y: -48, z: 32});
        let ct = block.getComponent("inventory").container;
        var armor = [];
        var item = [];

        {
            var itemj;
            if(ct.getItem(0)!=undefined) {
                itemj = ct.getItem(0);
                itemj.lockMode = "slot";
                armor.push(itemj);
            } else {
                armor.push(undefined);
            }
        }
        for(let j=1; j<4; j++) {
            var itemj;
            if(ct.getItem(j)!=undefined) {
                itemj = ct.getItem(j);
                itemj.lockMode = "inventory";
                armor.push(itemj);
            } else {
                armor.push(undefined);
            }
        }
        for(let j=9; j<ct.size; j++) {
            var itemj;
            if(ct.getItem(j)!=undefined) {
                itemj = ct.getItem(j);
                itemj.lockMode = "inventory";
                item.push(itemj);
            } else {
                item.push(undefined);
            }
        }
        rarmors.push(armor);
        items.push(item);
        
        block = world.getDimension("overworld").getBlock({x: -11-i, y: -48, z: 33});
        ct = block.getComponent("inventory").container;
        armor = [];
        item = [];

        {
            var itemj;
            if(ct.getItem(0)!=undefined) {
                itemj = ct.getItem(0);
                itemj.lockMode = "slot";
                armor.push(itemj);
            }
        }
        for(let j=1; j<4; j++) {
            var itemj;
            if(ct.getItem(j)!=undefined) {
                itemj = ct.getItem(j);
                itemj.lockMode = "inventory";
                armor.push(itemj);
            } else {
                armor.push(undefined);
            }
        }
        barmors.push(armor);
    }
    
    let block = world.getDimension("overworld").getBlock({x: -14, y: -48, z: 34}).getComponent("inventory").container;
    star = block.getItem(0);
    star.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -15, y: -48, z: 34}).getComponent("inventory").container;
    berries = block.getItem(0);
    berries.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -17, y: -48, z: 34}).getComponent("inventory").container;
    clock = block.getItem(0);
    clock.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -18, y: -48, z: 34}).getComponent("inventory").container;
    magic = block.getItem(0);
    magic.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -18, y: -48, z: 35}).getComponent("inventory").container;
    for(let i=0; i<3; i++) glow_berries.push(block.getItem(i));
    block = world.getDimension("overworld").getBlock({x: -21, y: -48, z: 34}).getComponent("inventory").container;
    ruby = block.getItem(0);
    ruby.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -26, y: -48, z: 34}).getComponent("inventory").container;
    kohakutou = block.getItem(0);
    kohakutou.lockMode = "inventory";
}

function rad(deg) {
    return deg/180*Math.PI;
}

function resetCooltime(player) {
    try{player.runCommand(`scoreboard players set @s cooltime 0`)} catch(e) {};
    if(player.updatect!=undefined)system.clearRun(player.updatect);
    player.updatect = undefined;
}

function updateCooltime(player, tick, p) {
    try{player.runCommand(`scoreboard players set @s cooltime ${Math.floor(tick/20)}`)} catch(e) {};
    updateCooltimeHelper(player, tick, p);
}

function BulletCoolHelper(player) {
    const bullet = score(player, "bullet");
    if(bullet<16) {
        updateCooltime(player, 10, 10);
        player.lbullet = system.runTimeout(function() {
            const bulletnow = score(player, "bullet");
            player.runCommand(`scoreboard players set @s bullet ${Math.min(bulletnow+1, 16)}`);
            player.lbullet = undefined;
        }, 10)
    }
}

function BulletSouten(player) {
    player.lsouten = system.runTimeout(function() {
        const bulletSouten = score(player, "bulletSouten");
        player.runCommand(`scoreboard players set @s bulletSouten ${Math.min(bulletSouten+1, 8)}`);
        player.runCommand(`scoreboard players remove @s bullet 1`);
        player.lsouten = undefined;
    }, 2)
}

// クールタイムの表示を更新する為の関数です
// 引数はそれぞれ、更新する人、クールの長さ(tick)、更新するピッチ(tick)であり、tick%p==0 が入力の時点で保証されるものとします
function updateCooltimeHelper(player, tick, p) {
    let check = 0;
    try{check = player.runCommand(`scoreboard players set @s[scores={cooltime=${Math.floor(tick/20)}..}] cooltime ${Math.floor(tick/20)}`).successCount} catch(e) {}; // 例えば、クールタイムが死亡時に0にリセットされる。というシステムを実装したときに、この更新を継続させない為です
    if(tick>=p && check) player.updatect = system.runTimeout(function() {
        updateCooltimeHelper(player, tick-p, p);
    }, p)
    return;
}

function getRI(min, max) {
    return min + Math.floor(random() *(max-min+1));
}

function notTeam(p1, p2) {
    if(p1==undefined || p2==undefined) return false;
    return !((p1.hasTag("red") && p2.hasTag("red")) || (p1.hasTag("blue") && p2.hasTag("blue")));
}

function tellraw(target, rawtext) {
    try{c.runCommand(`tellraw ${target} {"rawtext":[{"text":"${rawtext}"}]}`)} catch(e) {c.runCommand(`tellraw @a[tag=debug] {"rawtext":[{"text":"${e}"}]}`)};
}

function score(target, object) {
    if(target.scoreboardIdentity==undefined) return 0;
    return world.scoreboard.getObjective(object).getScore(target.scoreboardIdentity);
}

function dist(p1, p2) { // 返される値は実際の距離の二乗であることに注意してください
    return (p1.x-p2.x)*(p1.x-p2.x)+(p1.y-p2.y)*(p1.y-p2.y)+(p1.z-p2.z)*(p1.z-p2.z);
}

function is_air(x, y, z) {
    if(y<-64) return false;
    const block_id = c.getBlock({x: x, y: y, z: z}).typeId;
    return thro.find(hash(block_id)) != undefined;
    /*for(let i=0; i<thro.length; i++) {
        if(c.runCommand(`testforblock ${x} ${y} ${z} ${thro[i]}`).successCount) return true;
    }
    return false;*/
}

function floor2(value) {
    return Math.abs(value) >= 0.0001 ? value : 0;
}

function trans3D(hor, ver, r, axis, offset) { // 水平方向の角度, 鉛直方向の角度, 半径 (, 軸)の情報から3次元極座標変換を施します。(因みに、2つの角度の基準は、それぞれ、多分マイクラの中でのry, rxと対応しています)返り値は軸の上での座標です
    let res = 0;
    if(axis=="x") res = floor2(offset.x+ (-1)*Math.sin(hor)*Math.cos(ver)*r);
    else if(axis=="y") res = floor2(offset.y+ (-1)*Math.sin(ver)*r);
    else if(axis=="z") res = floor2(offset.z+ Math.cos(hor)*Math.cos(ver)*r);
    return res;
}

function inArea(p, a, b) {
    let flag = 1;
    if(p-a < 0) flag *= -1;
    if(p-b < 0) flag *= -1;
    return flag==-1;
}

function inSpecArea(player) {
    let res = false;
    for(let element of specArea) {
        if(inArea(player.location.x, element.x1, element.x2) && inArea(player.location.y, element.y1, element.y2) && inArea(player.location.z, element.z1, element.z2)) res = true;
    }
    return res;
}

world.afterEvents.itemUse.subscribe(({source, itemStack}) => {
    tellraw("@a[tag=debug]", `${itemStack.typeId}`);
    if(itemStack.typeId === clickItemId) {
        menu1(source);
    }
    else if(itemStack.typeId === clickItemId2 && source.hasTag("trick")) {
        try{source.runCommand(`clear @s clock`)} catch(e) {};
        if(!source.pcount>=100) source.getComponent("inventory").container.addItem(clock);
        if(source.pasti!=undefined) if(source.pcount>=100) {
            source.tryTeleport(source.pasti.min().date.location, {rotation: source.pasti.min().date.rotate});
            source.pasti = undefined;
            source.pcount = undefined;
            updateCooltime(source, 300, 20);
            source.lclock = system.runTimeout(function() {
                source.getComponent("inventory").container.addItem(clock);
                source.lclock = undefined;
            }, 300)
            //tellraw("@a", `${source.lclock}`);
        }
    } else if(itemStack.typeId === "minecraft:dragon_breath" && source.hasTag("pharm")) {
        var check = 0;
        try{check = source.runCommand(`testfor @s[hasitem={item=carrot,quantity=20..}]`).successCount} catch(e) {};
        if(check) {
            try{source.runCommand(`clear @s dragon_breath`)} catch(e) {};
            try{source.runCommand(`clear @s carrot 0 20`)} catch(e) {};
            source.getComponent("inventory").container.addItem(glow_berries[getRI(0, 2)]);
            updateCooltime(source, 300, 20);
            source.lcomp = system.runTimeout(function() {
                source.getComponent("inventory").container.addItem(magic);
                source.lcomp = undefined;
            }, 300) // comp の由来はcompounding です
        }
    } else if(source.hasTag("ansatu") && itemStack.typeId === "ya7:ruby" && source.haigeki==undefined) {
        var players;
        if(source.hasTag("red")) players = world.getDimension("overworld").getPlayers({
            location: source.location,
            closest: 1,
            maxDistance: 9,
            excludeGameModes: ["spectator"],
            excludeTags: ["red"]
        });
        if(source.hasTag("blue")) players = world.getDimension("overworld").getPlayers({
            location: source.location,
            closest: 1,
            maxDistance: 9,
            excludeGameModes: ["spectator"],
            excludeTags: ["blue"]
        });
        if(players.length!=0) {
            var check = 0;
            const sourceRotation = players[0].getRotation();
            const theta = rad(sourceRotation.y+180);
            let phi;
            for(let ddir=0; ddir>=-45; ddir-=15) {
                phi = rad(ddir);
                for(let i=1; i<=4; i++) {
                    check = 0;
                    check += is_air(trans3D(theta, phi, i*0.5, "x", players[0].location), trans3D(theta, phi, i*0.5, "y", players[0].location)+1, trans3D(theta, phi, i*0.5, "z", players[0].location));
                    //c.runCommand(`particle par:bullet_particle ${trans3D(theta, phi, i*0.5, "x", players[0].location)} ${trans3D(theta, phi, i*0.5, "y", players[0].location)+1} ${trans3D(theta, phi, i*0.5, "z", players[0].location)}`)
                    if(!check) break;
                }
                if(check) break;
            }
            source.runCommand(`clear @s ya7:ruby`);
            if(!check) {
                source.runCommand(`kill @s`);
                tellraw("@a[tag=debug]", `ルビー誤爆`);
            }
            else {
                players[0].runCommand(`tp @a[name="${source.nameTag}"] ${trans3D(theta, phi, 2, "x", players[0].location)} ${trans3D(theta, phi, 2, "y", players[0].location)+1} ${trans3D(theta, phi, 2, "z", players[0].location)} facing ~ ~1 ~`);

               try{ for(let i=0; i<9; i++) {
                    const item = source.getComponent("inventory").container.getItem(i);
                    if(item!=undefined) if(item.typeId== "ya7:iron_sword") source.selectedSlot=i;
                }} catch(e) {};
                /*const effects = source.getEffects();
                let value = -1;
                let duration = 0;
                for(let element of effects) {
                    if(element.typeId=="strength") {
                        value = element.amplifier;
                        duration = element.duration;
                    }
                }
                source.runCommand(`effect @s strength 3 ${value+1} false`);
                if(value>=0 && duration>60) source.conPower = system.runTimeout(function() {
                    source.addEffect("strength", duration-60, {amplifier: value, showParticles: true});
                    source.conPower = undefined;
                }, 60)*/
                let appllying = [];
                const func = (node) => {
                    appllying.push({amplifier: node.key+1, tick: Math.min(60, node.date)});
                }
                source["strength"].update(func);
                for(const elm of appllying) effect_apply(source, "strength", elm.amplifier, elm.tick);
                effect_apply(source, "strength", 0, 60);
                source.haigeki = 900;
                updateCooltime(source, 900, 20);
                source.lruby = system.runTimeout(function() {
                    source.getComponent("inventory").container.addItem(ruby);
                    source.lruby = undefined;
                }, 900)
            }
        }
    } else if(source.hasTag("nekomata") && itemStack.typeId == "ya7:kohakutou") /*if(source.kohakutou==undefined)*/ {
        tellraw("@a[tag=debug]", `使用`);
        var players;
        if(source.hasTag("red")) players = world.getDimension("overworld").getPlayers({
            location: source.location,
            maxDistance: 4,
            excludeGameModes: ["spectator"],
            excludeTags: ["blue"]
        });
        if(source.hasTag("blue")) players = world.getDimension("overworld").getPlayers({
            location: source.location,
            maxDistance: 4,
            excludeGameModes: ["spectator"],
            excludeTags: ["red"]
        });
        for(const player of players) effect_apply(player, "regeneration", 9, 80);
        source.runCommand(`clear @s ya7:kohakutou`);
        source.runCommand(`particle ya7:health ${source.location.x} ${source.location.y} ${source.location.z}`);
        updateCooltime(source, 900, 20);
        source.lkohakutou = system.runTimeout(function() {
            source.getComponent("inventory").container.addItem(kohakutou);
            source.lkohakutou = undefined;
        }, 900)
    }
})

var heir;
var _match = 0;
let gamerun;
let now_stage;
system.runInterval(function() {
    random();
    for(let i=carrots.length-1; i>=0; i--) {
        try{c.runCommand(`execute as @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add "red_carrot" count ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s carrot ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s Tcarrot ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s point ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add "blue_carrot" count ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s carrot ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s Tcarrot ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s point ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`clear @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] carrot 0 ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`clear @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] carrot 0 ${carrots[i]}`)} catch(e) {};
    }
    
    const timem = ('00' + world.scoreboard.getObjective("count").getScore("timem")).slice(-2);
    const times = ('00' + world.scoreboard.getObjective("count").getScore("times")).slice(-2);
    const red_alive = world.scoreboard.getObjective("count").getScore("red_alive");
    const red_carrot = world.scoreboard.getObjective("count").getScore("red_carrot");
    const blue_alive = world.scoreboard.getObjective("count").getScore("blue_alive");
    const blue_carrot = world.scoreboard.getObjective("count").getScore("blue_carrot");
    gamerun = world.scoreboard.getObjective("count").getScore("gamerun");
    now_stage = world.scoreboard.getObjective("count").getScore("now_stage");
    if(gamerun==3) {
        if(_match==0) {
            gameInfo = new AVLTree();
            const players = world.getPlayers();
            for(const player of players) {
                if(player.hasTag("join")) {
                    if(player.hasTag("red")) gameInfo.insert(player.id, {role: player.role, team: "red"});
                    if(player.hasTag("blue")) gameInfo.insert(player.id, {role: player.role, team: "blue"});
                    c.runCommand(`scoreboard players add ${roleInfo[player.role].object} Tselect 1`);
                    player.runCommand(`scoreboard players add @s Tjoined 1`);
                }
            }
        }
        _match++;
        try{c.runCommand(`execute as @a[tag=!redc,tag=!bluec] run scoreboard players reset @s catch_time`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=redc] if score "red_carrot" count matches 1.. run scoreboard players add @s catch_time 1`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=bluec] if score "blue_carrot" count matches 1.. run scoreboard players add @s catch_time 1`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=redc,scores={catch_time=20},tag=!thief] run give @s carrot ${Math.min(10, red_carrot)}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=bluec,scores={catch_time=20},tag=!thief] run give @s carrot ${Math.min(10, blue_carrot)}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=redc,scores={catch_time=20},tag=!thief] run scoreboard players add @s Tsteal ${Math.min(10, red_carrot)}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=bluec,scores={catch_time=20},tag=!thief] run scoreboard players add @s Tsteal ${Math.min(10, blue_carrot)}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=redc,scores={catch_time=20},tag=!thief] run scoreboard players remove "red_carrot" count ${Math.min(10, red_carrot)}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=bluec,scores={catch_time=20},tag=!thief] run scoreboard players remove "blue_carrot" count ${Math.min(10, blue_carrot)}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=!thief] run scoreboard players operation @s catch_time %= "n20" num`)} catch(e) {};

        try{c.runCommand(`effect @a[tag=red,tag=redc] wither 0 0`)} catch(e) {};
        try{c.runCommand(`effect @a[tag=blue,tag=bluec] wither 0 0`)} catch(e) {};
        try{c.runCommand(`tag @a[tag=!thief] remove redc`)} catch(e) {};
        try{c.runCommand(`tag @a[tag=!thief] remove bluec`)} catch(e) {};

        if(now_stage==2) {
            if(raintime==0) {
                if(getRI(1, 5000)==1) {
                    tellraw("@a[tag=join]", `§l§c[！]警報 §dもうすぐダメージ付きの大雨が降ります`);
                    tellraw("@a[tag=weather]", `§l§c[！]警報 §dもうすぐダメージ付きの大雨が降ります`);
                    rainsystem = system.runTimeout(function() {
                        c.runCommand(`weather rain`);
                        c.runCommand(`time set sunset`);
                        raintime = getRI(1500, 2000);
                        rainsystem = undefined;
                    }, 100);
                }
            } else {
                if(raintime==1) {
                c.runCommand(`time set noon`);
                c.runCommand(`weather clear`);
                }
                raintime--;
            }
        }
    }
        heir = [];
        var players = world.getPlayers();
        const template = `\ue108§l§7[${red_alive}] §6${red_carrot}\ue107    \ue109§7[${blue_alive}] §6${blue_carrot}\ue107  §f\ue10b${timem}:${times}\n`;
        players.forEach((player) => {
            if(player["strength"] == undefined) effect_init(player);
            effect_update(player);
            if(player.hasTag("join")) {
                const effects = player.getEffects();
                let flag = false;
                for(let element of effects) {
                    if(element.typeId=="invisibility") {
                        player.runCommand(`playanimation @s animation.invisibility none 100000000000000`);
                        player.invisibilityFlag = true;
                        flag = true;
                        if(player.hasTag("red")) {
                            if(_match%10==0) player.runCommand(`particle minecraft:basic_flame_particle ~ ~1.2 ~`);
                        } else if(player.hasTag("blue")) {
                            if(_match%10==0) player.runCommand(`particle minecraft:blue_flame_particle ~ ~1.2 ~`);
                        }
                    }
                }
                if(!flag && player.invisibilityFlag!=undefined) {
                    player.runCommand(`playanimation @s animation.invisibility none 0`);
                    player.invisibilityFlag = undefined;
                }
                if(_match%20==0) if(now_stage==2 && raintime>0) {
                    let flag = false;
                    for(let i=player.location.y+1; i<=-26; i++) {
                        for(let p of raincheck) {
                            /*let flag2 = false;
                            for(let q of thro) {
                                if(world.getDimension("overworld").getBlock({x: player.location.x+p.dx, y: i, z: player.location.z+p.dz}).typeId==q) {
                                    flag2 = true;
                                }
                            }*/
                            if(!is_air(player.location.x+p.dx, i, player.location.z+p.dz)) {
                                flag = true;
                                break;
                            }
                        }
                    }
                    if(!flag) {
                        player.applyDamage(2, {cause: "magic"});
                    }
                }
            }
            if(contestInfo.find(player.id) == undefined) {
                contestInfo.insert(player.id, {nameTag: player.nameTag, point: score(player, "point")});
            } else {
                contestInfo.find(player.id).date.point = score(player, "point");
            }
            if(player.kabotya!=undefined) player.kabotya--;
            if(player.kabotya==0) player.kabotya=undefined;
            if(gamerun==3) {
                player.titleStack = template;
                player.titleStack += `\ue106 ${score(player, "kill")}  \ue10a ${score(player, "death")}  \ue10c ${score(player, "hascarrot")}`;
                
                if(player.hasTag("warrior")) {
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.hasTag("archer")) {
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.hasTag("suc") && player.heir==undefined) {
                    var check = 0;
                    try{check = player.runCommand(`execute if score "gamerun" count matches 3 run testfor @s[hasitem={item=nether_star,quantity=0}]`).successCount} catch(e) {};
                    if(check) heir.push(player);
                }
                if(player.hasTag("sword")) {
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.hasTag("trick")) {
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.hasTag("pharm")) {
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.hasTag("fight")) {
                    if(player.damagec==undefined) player.damagec=[];
                    if(player.dc==undefined) player.dc = 2;
                    if(_match-200>=0) {
                        if(player.damagec[_match-200]!=undefined) {
                            player.dc -= player.damagec[_match-200];
                            player.damagec[_match-200] = undefined;
                        }
                    }
                    player.titleStack += `  \ue10e ${Math.floor(player.dc)}`;
                }
                if(player.hasTag("hwarrior")) { //重戦士
                    if(player.weight == undefined) player.weight = 0;
                    const equips = player.getComponent("equippable");
                    let count = 0;
                    if(equips.getEquipment("Chest") != undefined) count++;
                    if(equips.getEquipment("Legs") != undefined) count++;
                    if(equips.getEquipment("Feet") != undefined) count++;
                    if(player.weight > count) player.runCommand(`effect @s slowness 0 0 true`);
                    if(count > 0) player.runCommand(`effect @s slowness 1 ${count-1} true`);
                    player.weight = count;
                }
                if(player.hasTag("ansatu")) {
                    if(player.haigeki!=undefined) player.haigeki--;
                    if(player.haigeki==0) player.haigeki = undefined;
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.addDamage != undefined) {
                    player.applyDamage(player.addDamage, {cause: "entityAttack"});
                    player.addDamage = undefined;
                }
                if(player.hasTag("kariudo")) {
                    /*if(player.isSneaking) {
                        player.addEffect("slow_falling", 4, {amplifier: 0, showParticles: true});
                    }*/
                    const bullet = score(player, "bullet");
                    const bulletSouten = score(player, "bulletSouten");
                    if(bullet<16) {
                        if(player.lbullet==undefined) BulletCoolHelper(player);
                    }
                    if(bulletSouten<8 && bullet>=1) {
                        if(player.lsouten==undefined && player.lrensya==undefined) BulletSouten(player);
                    }
                    player.titleStack += `  \ue10f §u${score(player, "bulletSouten")}§7/${score(player, "bullet")}`;
                }
                if(player.hasTag("hukurou")) {
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                if(player.hasTag("thief")) {
                    const jukuren = score(player, "jukuren");
                    if(player.hasTag("blue") && player.hasTag("redc")) {
                        if(red_carrot>=1) {
                            try{player.runCommand(`execute as @s[scores={catch_time=20}] run scoreboard players add @s jukuren 1`)} catch(e) {};
                        }
                        try{player.runCommand(`execute as @s[scores={catch_time=20}] run give @s carrot ${Math.min(jukuren, red_carrot)}`)} catch(e) {};
                        try{player.runCommand(`execute as @s[scores={catch_time=20}] run scoreboard players add @s Tsteal ${Math.min(jukuren, red_carrot)}`)} catch(e) {};
                        try{player.runCommand(`execute as @s[scores={catch_time=20}] run scoreboard players remove "red_carrot" count ${Math.min(jukuren, red_carrot)}`)} catch(e) {};
                    } else if(player.hasTag("red") && player.hasTag("bluec")) {
                        if(blue_carrot>=1) {
                            try{player.runCommand(`execute as @s[scores={catch_time=20}] run scoreboard players add @s jukuren 1`)} catch(e) {};
                        }
                        try{player.runCommand(`execute as @s[scores={catch_time=20}] run scoreboard players remove "blue_carrot" count ${Math.min(jukuren, blue_carrot)}`)} catch(e) {};
                        try{player.runCommand(`execute as @s[scores={catch_time=20}] run give @s carrot ${Math.min(jukuren, blue_carrot)}`)} catch(e) {};
                        try{player.runCommand(`execute as @s[scores={catch_time=20}] run scoreboard players add @s Tsteal ${Math.min(jukuren, blue_carrot)}`)} catch(e) {};
                    }
                    try{player.runCommand(`scoreboard players operation @s catch_time %= "n20" num`)} catch(e) {};
                    try{player.runCommand(`tag @s remove redc`)} catch(e) {};
                    try{player.runCommand(`tag @s remove bluec`)} catch(e) {};
                    player.titleStack += `  \ue110 §u${score(player, "jukuren")}`;
                }
                if(player.hasTag("kabotya")) {
                    for(const element of players) {
                        const eft = element.getEffects();
                        let flag = false;
                        for(let eftelement of eft) {
                            if(eftelement.typeId == "invisibility") {
                                flag = true;
                            }
                        }
                        if(element.kabotya == undefined && flag) continue;
                        if((player.hasTag("red") && element.hasTag("red")) || (player.hasTag("blue") && element.hasTag("blue"))) {
                            if(dist(player.location, element.location) <= 1) if(HoldItem(element) == undefined) element.addEffect("invisibility", 4, {amplifier: 1, showParticles: true});
                        }
                        element.kabotya=4;
                    }
                }
                if(player.hasTag("nekomata")) {
                    for(const element of world.getDimension("overworld").getPlayers({
                        location: player.location,
                        maxDistance: 1,
                        excludeGameModes: ["spectator"],
                        tags: [player.hasTag("red") ? "red" : "blue"]
                    })) {
                        if(element.id == player.id) continue;
                        effect_apply(element, "regeneration", 1, 1);
                    }
                    player.titleStack += `  \ue10d ${score(player, "cooltime")}`;
                }
                player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":"${player.titleStack}"}]}`);
                tellraw("@a[tag=budeg]", `${player.titleStack}`);
            }
            if(player.hasTag("watch")) {
                if(inSpecArea(player)) {
                    player.specAreal = player.location;
                    player.specArear = player.getRotation();
                } else {
                    player.tryTeleport(player.specAreal, {rotation: player.specArear});
                }
                if(player.runCommand(`testfor @s[rxm=-90, rx=-89]`).successCount) {
                    if(player.backLobby==undefined) player.backLobby=0;
                    if(player.backLobby>=100) {
                        player.runCommand(`function backLobby`);
                    }
                    player.backLobby++;
                } else {
                    player.backLobby = undefined;
                }
            }
        })
        if(heir.length>=2) {
            for(let i=0; i<heir.length; i++) {
                heir[i].getComponent("inventory").container.addItem(star);
            }
        } else if(heir.length==1) {
            //players = world.getPlayers();
            players.forEach((player) => {
                if(player.hasTag("heired")) {
                    var del = "";
                    if(heir[0].hasTag("red")) del = "§c";
                    else if(heir[0].hasTag("blue")) del = "§9";
                    if(player.heired == undefined) {
                        heir[0].heir = player.nameTag;
                        player.heired = heir[0].nameTag;

                        tellraw(`@a[name="${heir[0].nameTag}"]`, `§l§8≫ ${del}${player.nameTag} §7さんを相続元にしました`);
                        tellraw(`@a[name="${player.nameTag}"]`, `§l§8≫ ${del}${heir[0].nameTag} §7さんが後継者になりました`);
                    } else if(player.heired != undefined) {
                        tellraw(`@a[name="${heir[0].nameTag}"]`, `§l§8≫ ${del}${player.nameTag} §cさんには既に、後継者がいます`);
                        heir[0].getComponent("inventory").container.addItem(star);
                    }
                } 
            })
        }
        try{c.runCommand(`tag @a remove heired`)} catch(e) {};

        players.forEach((player) => {
            if(player.hasTag("trick") && !player.hasTag("death")) {
                if(player.pasti==undefined) {
                    player.pasti = new AVLTree();
                }
                if(player.pasti!=undefined) {
                    if(player.pcount==undefined) player.pcount = 0;
                    if(player.pcount>=100) {
                        player.pasti.delete(player.pcount-100);
                    }
                    player.pasti.insert(player.pcount, {location: player.location, rotate: player.getRotation()});
                    player.pcount++;
                    //let info = player.pasti.min();
                    //try{player.runCommand(`tellraw @s {"rawtext":[{"text":"${info.key}, ${info.height}, {x: ${info.location.x}, y: ${info.location.y}, z:${info.location.z}}, {${info.rotate}}"}]}`)} catch(e) {};
                }
            }
        })

        for(const player of players) {
            if(player.damaged == undefined) player.damaged = reg_term;
            const effects = player.getEffects();
            let flag = false;
            for(let element of effects) {
                if(element.typeId == "wither") {
                    flag = true;
                }
            }
           if(!flag) player.damaged--;
            if(player.damaged == 0) {
                const health = player.getComponent("health");
                if(health.effectiveMax >= health.currentValue+1) health.setCurrentValue(health.currentValue+1);
                player.damaged = reg_term;
            }
        }
}, 1);

function int(value) {
    return Math.floor(value);
}

function itemCount(player, itemId) {
    if(player.hasTag("join")) {
        var mi = 0;
        var ma = 2304;
        for(let i=0; i<12; i++) {
            var check = 0;
            var mid = int((mi+ma)/2);
            try{check = player.runCommand(`testfor @s[hasitem={item=${itemId},quantity=${int(mid)}..}]`).successCount} catch(e) {};
            if(check) {
                mi = mid;
            } else {
                ma = mid;
            }
            if(mi==ma-1) break;
        }
        return int(mi)
    }
}

function itemDrop(location, itemId, amount) {
    for(let i=0; i<36; i++) {
        if(amount>=65) {
            amount-=64;
            try{c.spawnItem(new ItemStack(itemId, 64), {x: location.x, y: location.y, z: location.z})} catch(e) {}; //spawncarrot2[6]は64個のニンジンのデータ
        } else break;
    }
    for(let i=6; i>=0; i--) {
        if(amount>=carrots[i]) {
            amount-=carrots[i];
            try{c.spawnItem(new ItemStack(itemId, carrots[i]), {x: location.x, y: location.y, z:location.z})} catch(e) {}; //spawncarrot2[i]は2^i個のニンジンのデータ
        }
    }
}

system.runInterval(function() {
    if(rarmors.length==0) prepare();
    var players = world.getPlayers();
    players.forEach((player) => {
        if(player.hasTag("join")) {
            try{player.runCommand(`scoreboard players set @s hascarrot ${itemCount(player, "carrot")}`)} catch(e) {};
        }
    })
}, 20)

system.runInterval(function() {
    var players = world.getPlayers();
    players.forEach((player) => {
        if(player.watch!=undefined) {
            try{c.runCommand(`execute as @a[name="${player.watch}"] at @s anchored eyes as @a[name="${player.nameTag}"] rotated as @s run camera @s set minecraft:free pos ~ ~2 ~ rot ~ ~`)} catch(e) {};
            try{c.runCommand(`execute as @a[name="${player.watch}"] at @s run tp @a[name="${player.nameTag}"] ~ -60 ~`)} catch(e) {};
            try{player.runCommand(`inputpermission set @s[haspermission={movement=enabled}] movement disabled`)} catch(e) {};
        }
    });
}, 1)

const equip_slot = [
    "Head",
    "Chest",
    "Legs",
    "Feet"
]
system.afterEvents.scriptEventReceive.subscribe((ev) => {
    const {id, sourceEntity, message} = ev;
    switch(id) {
        case 'ya7:syuukeishow': {
            /*const scores = world.scoreboard.getObjective(message).getScores();
            for(const element of scores) {
                tellraw("@a[tag=debug]", `${element.participant.displayName}, ${element.participant.id}, ${element.score}`);
            }*/
            let syuukei = [];
            const func = (node) => {
                syuukei.push({nameTag: node.date.nameTag, point: node.date.point});
            }
            contestInfo.update(func);
            syuukei.sort((a, b) => {
                if(a.point > b.point) return -1;
                else if(a.point < b.point) return 1;
                return 0;
            });

            syuukei[0].order = 1;
            for(let i=1; i<syuukei.length; i++) {
                if(syuukei[i].point == syuukei[i-1].point) syuukei[i].order = syuukei[i-1].order;
                else syuukei[i].order = i+1;
            }

            let mi = 0;/*, ma = syuukei.length-1, mid, mypoint = score(sourceEntity, "point");
            while(mi != ma-1) {
                Math.floor(mid = (mi+ma)/2);
                if(syuukei[mid].point < mypoint) {
                    mi = mid;
                } else {
                    ma = mid;
                }
            }*/

            let text = `あなたのポイント: ${score(sourceEntity, "point")}\n現在の順位: ${mi}/${syuukei.length}\n`;
            for(let i=0; i<syuukei.length; i++) {
                text += `\n${syuukei[i].order} ${syuukei[i].nameTag} ${syuukei[i].point}ポイント`;
            }

            syuukeishow(sourceEntity, text);
        }
        break;
        case 'ya7:coolCate':
            const itemStack = new ItemStack("minecraft:shield");
            const cdCategory = itemStack.getComponent("minecraft:cooldown").cooldownCategory; 
            tellraw("@a[tag=debug]", `${cdCategory}`);
        break;
        case 'ya7:itemName': 
            var players = c.getPlayers();
            players.forEach((player) => {
                tellraw("@a[tag=debug]", `${player.nameTag} ${sourceEntity.nameTag} ${(HoldItem(player)!=undefined) ? HoldItem(player).nameTag : undefined}`);
                if(player.nameTag == sourceEntity.nameTag) {
                    system.runTimeout(function() {
                        HoldItem(player).nameTag = message;
                    }, 40)
                }
            })
        break;
        case 'ya7:result':
            var players = world.getPlayers();
            var playerl = Array.from(players);

        let result = [];
        for(let i=0; i<playerl.length; i++) {
            if(playerl[i].hasTag('red')) result.push({name: playerl[i].name, kill: score(playerl[i], "kill"), death: score(playerl[i], "death"), carrot: score(playerl[i], "carrot"), team: "red"});
            else if(playerl[i].hasTag('blue')) result.push({name: playerl[i].name, kill: score(playerl[i], "kill"), death: score(playerl[i], "death"), carrot: score(playerl[i], "carrot"), team: "blue"});
        }
        result.sort((a, b) => {
            if(a.kill > b.kill) return -1;
            else if(a.kill < b.kill) return 1;
            else if(a.kill == b.kill) {
                    if(a.death < b.death) return -1;
                    else if(a.death > b.death) return 1;
                    else if(a.death == b.death) {
                            if(a.carrot > b.carrot) return -1;
                            else if(a.carrot < b.carrot) return 1;
                    }
            }
            return 0;
        });
        
        tellraw("@a", "§l§7～～リザルト～～");
        for(let i=0; i<result.length; i++) {
            if(result[i].team == "red") tellraw("@a", `§l§7\ue108${result[i].name}  \ue106${result[i].kill}  \ue10a${result[i].death} \ue107${result[i].carrot}`);
            else if(result[i].team == "blue") tellraw("@a", `§l§7\ue109${result[i].name}  \ue106${result[i].kill}  \ue10a${result[i].death} \ue107${result[i].carrot}`);
        }
        break;
        case 'ya7:equip':
                for(let j=0; j<4; j++) {
                    if(sourceEntity.hasTag("red")) {
                        if(rarmors[sourceEntity.role][j]!=undefined) sourceEntity.getComponent("equippable").setEquipment(equip_slot[j], rarmors[sourceEntity.role][j]);
                    }
                    else if(sourceEntity.hasTag("blue")) {
                        if(barmors[sourceEntity.role][j]!=undefined) sourceEntity.getComponent("equippable").setEquipment(equip_slot[j], barmors[sourceEntity.role][j]);
                    }
                }
                for(let j=0; j<items[sourceEntity.role].length; j++) {
                    if(items[sourceEntity.role][j]!=undefined) sourceEntity.getComponent("inventory").container.addItem(items[sourceEntity.role][j]);
                }
        break;
        case 'ya7:role':
            sourceEntity.role = Number(message);
            try{sourceEntity.runCommand(`tellraw @s {"rawtext":[{"text":"§l§8≫ §7あなたは${roleInfo[Number(message)].name}§7を選びました"}]}`)} catch(e) {};
            if(gamerun == 3) c.runCommand(`scoreboard players add ${roleInfo[Number(message)].object} Tselect 1`);
            if(roleInfo[Number(message)].tag != "") try{sourceEntity.runCommand(`tag @s add ${roleInfo[Number(message)].tag}`)} catch(e) {};
        break;
        case 'ya7:reset':
            {
                _match = 0;
                var players = world.getPlayers();
                players.forEach((player) => {
                    player.heir = undefined;
                    player.heired = undefined;
                    player.role = undefined;
                    player.ld = undefined;
                    player.pasti = undefined;
                    player.pcount = undefined;
                    if(player.lclock!=undefined) {
                        system.clearRun(player.lclock);
                    }
                    player.lclock= undefined;
                    player.watch = undefined;
                    if(player.lberries!=undefined) {
                        system.clearRun(player.lberries);
                    }
                    player.lberries = undefined;
                    if(player.lcomp!=undefined) {
                        system.clearRun(player.lcomp);
                    }
                    player.lcomp = undefined;

                    player.dc = undefined;
                    player.damagec = undefined;
                    if(player.lruby!=undefined) {
                        system.clearRun(player.lruby);
                    }
                    player.lruby = undefined;
                    player.haigeki = undefined;
                    player.weight = undefined;
                    player.lberries = undefined;
                    
                    player.addDamage = undefined;
                    resetCooltime(player);

                    if(player.lbullet!=undefined) {
                        system.clearRun(player.lbullet);
                    }
                    player.lbullet = undefined;
                    if(player.lkohakutou!=undefined) {
                        system.clearRun(player.lkohakutou)
                    }
                    effect_init(player);
                })

                if(rainsystem != undefined) {
                    system.clearRun(rainsystem);
                }
                rainsystem = undefined;
                c.runCommand(`time set noon`);
                c.runCommand(`weather clear`);
                raintime = 0;
            }
        break;
        case 'ya7:carrot':
            const l = message.split(' ');
            try{c.spawnItem(spawncarrot[getRI(1, 4)], {x: Number(l[0])+0.5, y: Number(l[1]), z: Number(l[2])+0.5})} catch(e) {};
        break;
        case 'ya7:heir':
            {
                let k = message.split(' ');
                let players = c.getPlayers();
                players.forEach((player) => {
                    if(player.nameTag==k[0]) k[0] = player;
                    else if(player.nameTag==k[1]) k[1] = player;
                })
                k[0].heir = k[1];
                k[1].heired = k[0];
            }
        break;
        case 'ya7:tp':
            {
                try{sourceEntity.runCommand(`tp @s 500 -40 500`)} catch(e) {}
            }
        break;
        case 'ya7:greset':
            {
                try{sourceEntity.runCommand(`setblock 520 -48 501 redstone_block`)} catch(e) {}
            }
        break;
        case 'ya7:giveclock':
            {
                updateCooltime(sourceEntity, 100, 20);
                system.runTimeout(function() {
                    sourceEntity.getComponent("inventory").container.addItem(clock);
                }, 100)
            }
        break;
        case 'ya7:prepare':
            {
                prepare();
            }
        break;
        case 'ya7:setlore':
            {
                const m = message.split(/\\n/);
                let lore = [];
                for(let i=2; i<m.length; i++) lore.push(m[i]);
                const item = new ItemStack(m[0], Number(m[1]));
                item.setLore(lore);
                sourceEntity.getComponent("inventory").container.addItem(item);
            }
        break;
        case 'ya7:giveruby':
            {
                updateCooltime(sourceEntity, 100, 20);
                system.runTimeout(function() {
                    sourceEntity.getComponent("inventory").container.addItem(ruby);
                }, 100)
            }
        break;
        case 'ya7:givekohakutou':
            {
                updateCooltime(sourceEntity, 100, 20);
                system.runTimeout(function() {
                    sourceEntity.getComponent("inventory").container.addItem(kohakutou);
                }, 100)
            }
        break;
        case 'ya7:bulletCool':
            {
                BulletCoolHelper(sourceEntity);
            }
        break;
        case 'ya7:totyuu':
            {
                sourceEntity.runCommand(`scoreboard players add @s Tjoined 1`);
                if(gameInfo.find(sourceEntity.id) != undefined) {
                    sourceEntity.runCommand(`scriptevent ya7:role ${gameInfo.find(sourceEntity.id).date.role}`);
                    sourceEntity.runCommand(`tag @s add join`)
                    sourceEntity.runCommand(`function totyuu`);
                    c.runCommand(`scoreboard players add ${roleInfo[gameInfo.find(sourceEntity.id).date.role].object} Tselect -1`);
                    sourceEntity.runCommand(`scoreboard players add @s Tjoined -1`);
                }
            }
        break;
        case 'ya7:arrow_reload':
            {
                try{sourceEntity.runCommand(`clear @s arrow`)} catch(e) {};
                updateCooltime(sourceEntity, Number(message), 20);
                system.runTimeout(function() {
                    try{sourceEntity.runCommand(`execute if score "gamerun" count matches 3 run give @s arrow 1 0 {"item_lock":{"mode":"lock_in_inventory"}}`)} catch(e) {};
                }, Number(message))
            }
        break;
        case 'ya7:regist':
            {
                if(gameInfo.find(sourceEntity.id) == undefined) gameInfo.insert(sourceEntity.id, {role: sourceEntity.role});
            }
        break;
        case 'ya7:showToukei':
            {
                toukei(sourceEntity);
            }
        break;
        case 'ya7:switch_stage':
            {
                const stage = getRI(0, 2);
                c.runCommand(`scoreboard players set "now_stage" count ${stage}`);
                c.runCommand(`clone ${-2-stage} -51 6 ${-2-stage} -51 6 -2 -47 6`);
            }
        break;
        case 'ya7:effect':
            {
                const mes = message.split(' ');
                effect_apply(sourceEntity, mes[0], Number(mes[2]), Number(mes[1])*20);
            }
        break;
    }
});

function DeadClearRun(player, property) {
    if(player[property] != undefined) {
        system.clearRun(player[property]);
        player[property] = undefined;
    }
}

world.afterEvents.entityDie.subscribe((ev) => {
    const {damageSource, deadEntity} = ev;
    try{deadEntity.runCommand(`scoreboard players set @s death_time 100`)} catch(e) {};
    try{deadEntity.runCommand(`tag @s add death`)} catch(e) {};
    try{deadEntity.runCommand(`tag @s add in_lobby`)} catch(e) {};
    const dd = damageSource.damagingEntity;
    var ddl = "";
    var del = "";
    let l;
    //if(deadEntity!=undefined) return;
    if(deadEntity.hasTag("red")) del = "§c";
    else if(deadEntity.hasTag("blue")) del = "§9";
    if(deadEntity.typeId=="minecraft:player") {
        l = deadEntity.location;
        if(dd!=undefined) {
            if(dd.nameTag != deadEntity.nameTag) if(notTeam(dd, deadEntity)) {
                try{dd.runCommand(`scoreboard players add @s kill 1`)} catch(e) {};
                try{dd.runCommand(`scoreboard players add @s Tkill 1`)} catch(e) {};

                try{dd.runCommand(`scoreboard players add @s point 30`)} catch(e) {};

                if(dd.hasTag("red")) ddl = "§c";
                else if(dd.hasTag("blue")) ddl = "§9";
            }

            if(dd.hasTag('nekomata')) effect_apply(dd, "speed", 2, 40);
        } else if(deadEntity.ld!=undefined) {
            try{c.runCommand(`scoreboard players add @a[name="${deadEntity.ld}"] kill 1`)} catch(e) {};
            try{c.runCommand(`scoreboard players add @a[name="${deadEntity.ld}"] Tkill 1`)} catch(e) {};
            
            try{c.runCommand(`scoreboard players add @a[name="${deadEntity.ld}"] point 30`)} catch(e) {};

            if(deadEntity.hasTag("red")) ddl = "§9";
            else if(deadEntity.hasTag("blue")) ddl = "§c";
        }
        try{deadEntity.runCommand(`scoreboard players add @s death 1`)} catch(e) {};
        try{deadEntity.runCommand(`scoreboard players add @s Tdeath 1`)} catch(e) {};
        let count = itemCount(deadEntity, "carrot"), g1=itemCount(deadEntity, "ya7:glow_berries1"), g2=itemCount(deadEntity, "ya7:glow_berries2"), g3=itemCount(deadEntity, "ya7:glow_berries3");
        deadEntity.runCommand(`clear @s carrot`);
        deadEntity.runCommand(`clear @s ya7:glow_berries1`);
        deadEntity.runCommand(`clear @s ya7:glow_berries2`);
        deadEntity.runCommand(`clear @s ya7:glow_berries3`);
        itemDrop(l, "carrot", count);
        itemDrop(l, "ya7:glow_berries1", g1);
        itemDrop(l, "ya7:glow_berries2", g2);
        itemDrop(l, "ya7:glow_berries3", g3);
        //後継(相続元の人がやられた)-->
            if(deadEntity.heired!=undefined) {
                tellraw(`@a[name="${deadEntity.heired}"]`, `§l§8≫ ${del}${deadEntity.nameTag} §7さん(相続元)が死亡しました`)

                let players = world.getDimension("overworld").getPlayers();
                let hl;
                players.some((player) => {
                    if(player.nameTag==deadEntity.heired) {
                        player.heir = undefined;
                        player.getComponent("inventory").container.addItem(star);
                        hl = player.location;
                        return true;
                    }
                })
                let dis = Math.sqrt((l.x-hl.x)*(l.x-hl.x)+(l.y-hl.y)*(l.y-hl.y)+(l.z-hl.z)*(l.z-hl.z));
                let dcount = count*(dis<=8 ? 0 : (dis-8)/256); // 距離によって減衰する量です
                try{c.runCommand(`give @a[name="${deadEntity.heired}"] carrot ${Math.round(count-dcount)}`)} catch(e) {};
                count = Math.round(dcount); // 下のドロップの機構で、減衰された分をドロップさせる為です(Math.round(count-dcount)+(Math.round(dcount)=持っていた分)
                deadEntity.heired=undefined;
            }

        //<--
        //後継者がやられた-->
            if(deadEntity.heir!=undefined) {
                tellraw(`@a[name="${deadEntity.heir}"]`, `§l§8≫ ${del}${deadEntity.nameTag} §7さん(後継者)が死亡しました`)

                let players = world.getDimension("overworld").getPlayers();
                players.some((player) => {
                    if(player.nameTag==deadEntity.heir) {
                        player.heired = undefined;
                        return true;
                    }
                })
                deadEntity.getComponent("inventory").container.addItem(star);
                deadEntity.heir=undefined;
            }
        //<--
        try{deadEntity.runCommand(`clear @s carrot`)} catch(e) {};
        if(ddl!="") {
            if(dd!=undefined) tellraw("@a", `§l${ddl}${dd.nameTag} §8>> ${del}${deadEntity.nameTag}`);
            else if(deadEntity.ld!=undefined) tellraw("@a", `§l${ddl}${deadEntity.ld} §8>> ${del}${deadEntity.nameTag}`);
        }
        if(deadEntity.hasTag("gaikotu")) {
            if(dd!=undefined) dd.runCommand(`effect @s wither 60 0 false`);
        }
        deadEntity.ld="";
    }
    DeadClearRun(deadEntity, "lclock");
    DeadClearRun(deadEntity, "lberries");
    DeadClearRun(deadEntity, "lcomp");
    DeadClearRun(deadEntity, "lruby");
    DeadClearRun(deadEntity, "lkohakutou");
    DeadClearRun(deadEntity, "conPower");
    DeadClearRun(deadEntity, "lbullet");
    DeadClearRun(deadEntity, "lsouten");
    DeadClearRun(deadEntity, "lrensya");
    try{c.spawnItem(spawncarrot[getRI(5, 8)], {x: l.x, y: l.y, z: l.z})} catch(e) {};
    try{deadEntity.runCommand(`clear @s clock`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:sweet_berries`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s dragon_breath`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:ruby`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:kohakutou`)} catch(e) {};

    try{deadEntity.runCommand(`scoreboard players set @s cooltime 0`)} catch(e) {};
    if(deadEntity.hasTag("sword")) deadEntity.getComponent("inventory").container.addItem(berries);
    if(deadEntity.hasTag("pharm")) deadEntity.getComponent("inventory").container.addItem(magic);

    if(deadEntity.hasTag("fight")) {
        deadEntity.damagec = undefined;
        deadEntity.dc = undefined;
    }
    if(deadEntity.hasTag("ansatu")) {
        deadEntity.haigeki = undefined;
    }
    if(dd!=undefined) if(dd.hasTag("kariudo")) {
        const bullet = score(dd, "bullet");
        dd.runCommand(`scoreboard players set @s bullet ${Math.min(bullet+8, 16)}`);
    }
    resetCooltime(deadEntity);
    effect_init(deadEntity);
})

world.afterEvents.entityHurt.subscribe((ev) => {
    const {damageSource, hurtEntity, damage} = ev;
    const dd = damageSource.damagingEntity;
    const dcause = damageSource.cause;
    var useditem = undefined;
    if(hurtEntity.hasTag("fight") && (dcause == "entityAttack" || dcause == "projectile")) {
        if(hurtEntity.damagec[_match] == undefined) hurtEntity.damagec[_match] = damage;
        else hurtEntity.damagec[_match] += damage; // ダメージが1tick中に二度当たる可能性を考慮しています
        hurtEntity.dc += damage;
    }
    if(hurtEntity.hasTag("ansatu") && !(dcause == "entityAttack" || dcause == "projectile" || dcause == "fall" || dcause == "wither" || dcause == "magic")) {
        hurtEntity.runCommand(`kill @s`);
    }
    
    if(dd!=undefined) {
        if(notTeam(dd, hurtEntity)) hurtEntity.ld = dd.nameTag;
        const GI = dd.getComponent("inventory").container.getItem(dd.selectedSlot)
        if(GI!=undefined) useditem = GI.typeId;
    }
    let l = hurtEntity.location;
    if(notTeam(dd, hurtEntity)) {
        if(useditem=="ya7:golden_pickaxe") {
            try{dd.runCommand(`execute as @s at @s run playsound random.anvil_land @a ~ ~ ~`)} catch(e) {};
            for(let i=0; i<40; i++) {
                l = hurtEntity.location;
                var br = true;
                if(!(l.y>=-64)) {
                    break;
                }
                //let b = world.getDimension("overworld").getBlock({x: l.x, y: l.y, z: l.z}).typeId;
                //tellraw("@a", `${b}`);
                /*for(let j=0; j<thro.length; j++) {
                    if(thro[j]==b) {
                        br = false;
                    }
                }*/
                if(!is_air(l.x, l.y, l.z)) {
                    //tellraw("@a", `${Math.floor(i/2)}`)
                    hurtEntity.applyDamage(Math.floor(i/2), {cause: "fall"});
                    break;
                }
                try{c.runCommand(`execute as @a[name="${hurtEntity.nameTag}"] at @s run tp @s ${l.x} ${l.y-0.5} ${l.z}`)} catch(e) {};
            }
        }
        else if(useditem=="ya7:iron_axe" && hurtEntity.rangeA==undefined) {
            try{hurtEntity.runCommand(`execute as @s at @s anchored eyes run particle ya7:simple_range_attack ^ ^ ^1.5`)} catch(e) {};
            var players;
            if(dd.hasTag("red")) players = world.getDimension("overworld").getPlayers({
                location: hurtEntity.location,
                maxDistance: 4,
                excludeTags: ["red"]
            });
            if(dd.hasTag("blue")) players = world.getDimension("overworld").getPlayers({
                location: hurtEntity.location,
                maxDistance: 4,
                excludeTags: ["blue"]
            });
            try{players.forEach((player) => {
                if(!judge_front(dd, player) && player.id!=hurtEntity.id) {
                    player.rangeA = true;
                    player.applyDamage(5, {cause: "entityAttack", damagingEntity: dd});
                }
            })} catch(e) {};
        } else if(useditem=="ya7:iron_sword" && dd.hasTag("trick")) {
            if(getRI(0, 3)==0 && notTeam(hurtEntity, dd)) hurtEntity.setOnFire(3, true);
        } else if(notTeam(hurtEntity, dd) && dd.hasTag("fight")) {
            hurtEntity.applyDamage(Math.floor(dd.dc), {cause: "entityAttack"});
        } else if(dcause=="projectile" && dd.hasTag("hukurou") && notTeam(hurtEntity, dd)) {
            const hurtl = hurtEntity.location, ddl = dd.location;
            const dx = ddl.x-hurtl.x, dz = ddl.z-hurtl.z, predy = (ddl.y-(hurtl.y+1.2))/5+0.4;
            let dy;
            if(predy >= 1) {
                dy = 1;
            } else if(predy >= 0) {
                dy = (predy);
            } else {
                dy = 0;
            }
            const dl = Math.sqrt(dist(ddl, hurtl));
            hurtEntity.applyKnockback(dx/dl, dz/dl, Math.min(Math.sqrt(dx*dx+dz*dz)*kbMul*0.5, kbMul*0.5), dy);
        } else if(notTeam(hurtEntity, dd) && dd.hasTag("thief")) {
            const jukuren = score(dd, "jukuren");
            const hascarrotHurt = itemCount(hurtEntity, "carrot");
            dd.runCommand(`give @s carrot ${Math.min(hascarrotHurt, jukuren)}`);
            hurtEntity.runCommand(`clear @s carrot 0 ${Math.min(hascarrotHurt, jukuren)}`);
            if(hascarrotHurt>=1) dd.runCommand(`scoreboard players add @s jukuren 1`);
        }
    } else{
        hurtEntity.rangeA = undefined;
    }
})

world.afterEvents.playerLeave.subscribe((ev) => {
    var players = world.getDimension("overworld").getPlayers();
    players.forEach((player) => {
        if(player.heir == ev.playerName) {
            player.heir = undefined;
            player.getComponent("inventory").container.addItem(star);
        }
        if(player.heired == ev.playerName) {
            player.heired = undefined;
        }
        if(player.watch == ev.playerName) {
            exitwatch(player);
        }
    })
})

// 一つ下の関数で、壁を検知するときに、微妙に貫通するケースがあるので、少しズラした場所も確認できるようにする配列です
const searchDirection = [{x: 0.05, y: 0, z: 0}, {x: -0.05, y: 0, z: 0}, {x: 0, y: 0.05, z: 0}, {x: 0, y: -0.05, z: 0}, {x: 0, y: 0, z: 0.05}, {x: 0, y: 0, z: -0.05}];

function bulletLimit(offset, theta, phi) { // ある弾がどこまで飛ぶか、基準からの半径(?)で返してもらいます
    // アルゴリズムについては、私が考えたものですが、とても複雑になってしまいました(すみません；；)
    // そのうえ、細かい調整とか沢山した所為で、メチャ読みにくいコードになっているので、ご注意です；；
    // 実装したアルゴリズムを簡単にご説明すると、銃弾の射出された位置(基準)、角度(横、縦)の情報から、
    // x軸が射出されたところから、+1, +2, ... となったところ(整数値になるように少し調整しています) のブロックが
    // 貫通可能か?だけを調べれば、(射程が7なので、)高々20回の確認だけで(確認の漏れなく)済むので、それで計算量を抑えた形です
    // それを、y方向, z方向についても行っています(そして、基準からの距離が7以上になったら、探索を打ち切るようにしています)
    let res = 20, ma, C, flag;
    C = (-1)*Math.sin(theta)*Math.cos(phi);
    ma = 0, flag = false;
    if(floor2(C)!=0) {
        for(let xdr = 0; Math.sin(theta) < 0 ? xdr<=20 : xdr>=-20; Math.sin(theta) < 0 ? xdr++ : xdr--) {
            if(xdr==0) continue;
            const xr = Math.round(offset.x+xdr);
            let kr = (xr-offset.x)/C; // 仮の半径です。極座標変換された方程式x=-sin(theta)cos(phi)*r + offset.x を変形して、xを固定したときのrを求めています
            if(Math.abs(kr)>=20) {
                ma = Math.max(ma, 20);
                break;
            }
            const yr = trans3D(theta, phi, kr, "y", offset), zr = trans3D(theta, phi, kr, "z", offset);
            /*system.runInterval(function() {
                c.runCommand(`particle par:bullet_particle ${xr}.0 ${yr} ${zr}`);
            }, 1);*/
            ma = Math.max(ma, kr);
            for(let element of searchDirection) if(!is_air(xr+element.x, yr+element.y, zr+element.z)) {
                flag = true;
                break;
            }
            if(flag) break;
        }
        res = Math.min(res, ma);
    }
    
    C = (-1)*Math.sin(phi);
    ma = 0, flag = false;
    if(floor2(C)!=0) {
        for(let ydr = 0; Math.sin(phi) < 0 ? ydr<=20 : ydr>=-20; Math.sin(phi) < 0 ? ydr++ : ydr--) {
            if(ydr==0) continue;
            const yr = Math.round(offset.y+ydr);
            let kr = (yr-offset.y)/C;
            if(Math.abs(kr)>=20) {
                ma = Math.max(ma, 20);
                break;
            }
            const xr = trans3D(theta, phi, kr, "x", offset), zr = trans3D(theta, phi, kr, "z", offset);
            /*system.runInterval(function() {
                c.runCommand(`particle minecraft:blue_flame_particle ${xr} ${yr} ${zr}`);
            }, 1)*/
            ma = Math.max(ma, kr);
            for(let element of searchDirection) if(!is_air(xr+element.x, yr+element.y, zr+element.z)) {
                flag = true;
                break;
            }
            if(flag) break;
        }
        res = Math.min(res, ma);
    }

    C = Math.cos(theta)*Math.cos(phi);
    ma = 0, flag = false;
    if(floor2(C)!=0) {
        for(let zdr = 0; Math.cos(theta) > 0 ? zdr<=20 : zdr>=-20; Math.cos(theta) > 0 ? zdr++ : zdr--) {
            if(zdr==0) continue;
            const zr = Math.round(offset.z+zdr);
            let kr = (zr-offset.z)/C;
            if(Math.abs(kr)>=20) {
                ma = Math.max(ma, 20);
                break;
            }
            const xr = trans3D(theta, phi, kr, "x", offset), yr = trans3D(theta, phi, kr, "y", offset);
            /*system.runInterval(function() { 
                c.runCommand(`particle minecraft:basic_flame_particle ${xr} ${yr} ${zr}.0`);
            }, 1)*/
            ma = Math.max(ma, kr);
            for(let element of searchDirection) if(!is_air(xr+element.x, yr+element.y, zr+element.z)) {
                flag = true;
                break;
            }
            if(flag) break;
        }
        res = Math.min(res, ma);
    }

    return res;
}

function hidan(offset, theta, phi, p, hidanR) { // 被弾する可能性のある人を中心とした、半径(hidanR)の球面と、銃弾の通る直線との交点があるか、その二次方程式の判別式を計算することで、確かめています
    const Ca = (-1)*Math.sin(theta)*Math.cos(phi), Cb = (-1)*Math.sin(phi), Cc = Math.cos(theta)*Math.cos(phi), Ldx = (offset.x-p.x), Ldy = (offset.y-p.y), Ldz = (offset.z-p.z);
    const D = (Ca*Ldx+Cb*Ldy+Cc*Ldz)*(Ca*Ldx+Cb*Ldy+Cc*Ldz)-(Ldx*Ldx+Ldy*Ldy+Ldz*Ldz-hidanR*hidanR); // この判別式には導出過程がありますが、長いので省略します
    if(!(D>=0)) return false; // 2次方程式についての判別式が0以上なら、被弾の扱いにします。(そうではないなら、ここでfalseが返ります)

    // 上の判別式での判定は、今判定しているプレイヤーの人が、基準の位置(打った位置)(原点Oと呼びます)に関して銃弾と対称の位置にあったとしても、
    // 通過されてしまうので、ここから先で、Oを基準に、thetaとphiから、ある平面(?)をイメージして、その反対側に人がいる場合は、
    // ダメージを与えないようにします
    // もう少し厳密に言うと、銃弾が通る直線上の任意の点Qと、プレイヤーの人がいる座標Pについて、ベクトルOPとベクトルOQのなす角が90度以下であれば良いです
    // ベクトルOQについては、銃弾の通る直線がまさにそれなので、都合の良いように(ここでは、cos(角度)の計算で、分母が1になることを、都合が良いと言っています)、常にその方向の単位ベクトルを考えています
    // ベクトルOPについては、P点の座標を三角関数で表すのに、ベクトルP-ベクトルOの差が重要なので、前計算します
    // ベクトルOQと同じく、単位ベクトルで考えられると都合が良いので、絶対値((またはノルム)ベクトルOP)で色々割って、調整しています
    // 細かい導出は省略しますが、ベクトルOQとベクトルOPの成分が分かれば、内積を計算できて、どちらも大きさが1なので、
    // cos(角度)QOP = ベクトルOQ(内積)ベクトルOP が計算できます
    // 最終的な判定としては、cos(角度)QOPが0以上であれば良いです
    const dp = {x: p.x-offset.x, y: p.y-offset.y, z: p.z-offset.z}; // (DynamicProgramingの略ではなくて、)デルタpの略です。射出された位置と今検査しているプレイヤーの人の位置の差を格納します
    const Rp = Math.sqrt(dp.x*dp.x+dp.y*dp.y+dp.z*dp.z), cosThetap = dp.z/Rp, sinThetap = (-1)*dp.x/Rp, cosPhip = Math.sqrt(dp.x*dp.x+dp.z*dp.z)/Rp, sinPhip = (-1)*dp.y/Rp; // このチェックで、使う数値を前計算しておきます
    const Naiseki = (cosThetap*cosPhip*Math.cos(theta)*Math.cos(phi)+sinThetap*cosPhip*Math.sin(theta)*Math.cos(phi)+sinPhip*Math.sin(phi));
    if(!(Naiseki>=0)) return false;
    return true;
}

function shotgun(offset, theta, phi, r, Rlimit) {
    const xr = trans3D(theta, phi, r, "x", offset), yr = trans3D(theta, phi, r, "y", offset), zr = trans3D(theta, phi, r, "z", offset);
    c.runCommand(`particle par:bullet_particle ${xr} ${yr} ${zr}`);
    if(r+1.25<=Math.min(Rlimit, 20)) {
        shotgun(offset, theta, phi, r+1.25, Rlimit);
    }
}

function shotgunHelper(offset, theta, phi, team, damager) {
    var res = bulletLimit(offset, theta, phi);

    const players = c.getPlayers({
        location: {x: offset.x, y: offset.y-1.2, z: offset.z},
        maxDistance: res,
        excludeGameModes: ["spectator"],
        excludeTags: [team]
    })

    var hidanPlayer;
    var hidanInfo;
    for(let element of players) {
        const inputLocation = {x: element.location.x, y: element.location.y+1.5, z: element.location.z};
        const inputLocation2 = {x: element.location.x, y: element.location.y+0.6, z: element.location.z};
        const hidanHead = hidan(offset, theta, phi, inputLocation, 0.45); 
        const hidanBody = hidan(offset, theta, phi, inputLocation2, 0.6); 
        if(!hidanHead && !hidanBody) continue;
        const dis = Math.sqrt(dist(inputLocation, offset));
        if(hidanPlayer==undefined) {
            hidanPlayer = element;
            if(hidanBody) hidanInfo = "body";
            if(hidanHead) hidanInfo = "head";
        } else {
            if(dis < res) {
                res = dis;
                hidanPlayer = element;
                if(hidanBody) hidanInfo = "body";
                if(hidanHead) hidanInfo = "head";
            }
        }
    }


    if(hidanInfo=="head") {
        //c.runCommand(`execute as @a[name="${damager}"] at @s anchored eyes run playsound random.anvil_land @s ^ ^ ^0.5 1 1.4`);
    }
    if(hidanPlayer != undefined) {
        if(hidanPlayer.addDamage == undefined) hidanPlayer.addDamage = 0;
        hidanPlayer.addDamage += Math.min(49/res, hidanInfo=="body" ? 3 : 6);
        hidanPlayer.ld = damager; // ダメージを受けたときの変なノックバックなし、かつダメージを与えた人を記録する仕組みとして、この時点でダメージを与えた人を記録することにします
    }
    shotgun(offset, theta, phi, 0, res);
}

function apk(source, rot, mul) { // ノックバックを与える関数です(apkは、applyKnockbackの略のつもりです, mulはノックバックの倍率です) 関数の概要としては、ショットガンを撃った反対方向にノックバックさせたいのですが、その強さを計算するときに、水平方向については、x方向とz方向の距離を採っています
    const xr = trans3D(rad(rot.y), rad(rot.x+180), mul, "x", {x: 0, y: 0, z: 0}), yr = trans3D(rad(rot.y), rad(rot.x+180), mul, "y", {x: 0, y: 0, z: 0}), zr = trans3D(rad(rot.y), rad(rot.x+180), mul, "z", {x: 0, y: 0, z: 0});
    source.applyKnockback(xr, zr, floor2(Math.sqrt(dist({x: 0, y: 0, z: 0}, {x: xr, y: 0, z: zr}))), yr/1.5);
}

function randomspreadRI(init, ud) {
    return getRI(Math.min((-1)*init+ud*5/30, 0), Math.max(init-ud*5/30, 0));
}

world.afterEvents.itemReleaseUse.subscribe((ev) => {
    const item = ev.itemStack;
    const {source, useDuration} = ev;

    const ud = Math.abs(itemMaxUse-useDuration);
    if(item.typeId=="ya7:shotgun") {
        const rot = source.getRotation();
        let team = "";
        if(source.hasTag("red")) team = "red";
        else if(source.hasTag("blue")) team = "blue";
        const location = {x:source.location.x, y:source.location.y+1.2, z:source.location.z};

        const bulletSouten = score(source, "bulletSouten");
        if(bulletSouten==0) {
            try{source.runCommand(`execute as @a[r=12] run playsound random.click @s ^ ^ ^1 1 1.2 1`)} catch(e) {};
        }
        let count = 0;
        if(bulletSouten>=4) apk(source, rot, 1);
        if(bulletSouten>0) try{source.runCommand(`execute as @a[r=12] at @s anchored eyes run playsound firework.large_blast @s ^ ^ ^1 8 0.9 8`)} catch(e) {};
        for(let i=0; i<4; i++) {
            count++;
            if(count>bulletSouten) break;
            shotgunHelper(location, rad(rot.y+randomspreadRI(5, ud)), rad(rot.x+randomspreadRI(5, ud)), team, source.nameTag);
        }
        source.runCommand(`scoreboard players set @s bulletSouten ${Math.max(bulletSouten-4, 0)}`);
        if(bulletSouten>4) source.lrensya = system.runTimeout(function() {
            if(bulletSouten>=8) apk(source, rot, 1);
            if(bulletSouten>4) try{source.runCommand(`execute as @a[r=12] at @s anchored eyes run playsound firework.large_blast @s ^ ^ ^1 8 0.9 8`)} catch(e) {};
            for(let i=0; i<4; i++) {
                count++;
                if(count>bulletSouten) break;
                shotgunHelper(location, rad(rot.y+randomspreadRI(5, ud)), rad(rot.x+randomspreadRI(5, ud)), team, source.nameTag);
            }
            source.runCommand(`scoreboard players set @s bulletSouten ${Math.max(bulletSouten-8, 0)}`);
            source.lrensya = undefined;
        }, 3)
    }
})


world.afterEvents.projectileHitBlock.subscribe((ev) => {
    const {location, source} = ev;

    const sourcel = source.location;
    const dx = location.x-sourcel.x, dz = location.z-sourcel.z, predy = (location.y-(sourcel.y+1.2))/5+0.4;
    let dy;
    if(predy >= 1) {
        dy = 1;
    } else if(predy >= 0) {
        dy = (predy);
    } else {
        dy = 0;
    }
    const dl = Math.sqrt(dist(location, sourcel));
    if(source.hasTag("hukurou") && itemCount(source, "carrot") <= 32) {
        source.applyKnockback(dx/dl, dz/dl, Math.min(Math.sqrt(dx*dx+dz*dz)*kbMul, kbMul), dy);
    }
})

world.beforeEvents.chatSend.subscribe((ev) => {
    const {sender, message} = ev;
    let color = "", teamchat = "", chatTarget = [];
    const lower = message.toLowerCase() ;
    if(lower == "teamchat" || lower == "tc") {
        if(sender.teamchat == undefined) {
            sender.teamchat = true;
            sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§g今の送信先は§aチームチャット§gです"}]}`);
        } else if (sender.teamchat == true) {
            sender.teamchat = undefined;
            sender.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§g今の送信先は§cジェネラルチャット§gです"}]}`);
        }
        ev.cancel = true;
    } else {
        if(sender.hasTag("red")) {
            if(sender.teamchat == true) {
                teamchat = "§e";
                chatTarget.push("red");
            }
            color = "§c";
        }
        else if(sender.hasTag("blue")) {
            if(sender.teamchat == true) {
                teamchat = "§e";
                chatTarget.push("blue");
            }
            color = "§9";
        } else if(sender.hasTag("watch")) {
            teamchat = "§7";
            chatTarget.push("watch");
        }

        const players = c.getPlayers();
        for(let player of players) {
            let flag = false;
            if(chatTarget.length==0) {
                flag = true;
            } else for(let tag of chatTarget) {
                if(player.hasTag(tag)) {
                    flag = true;
                    break;
                }
            }
            if(flag) player.sendMessage(`${color}<${sender.name}> §r${teamchat}${message}`);
        }
        ev.cancel = true;
    }
})

//建築用です
const dirbfs = [{x: 1, z: 0}, {x: 0, z: 1}, {x: -1, z: 0}, {x: 0, z: -1}];

let memo;
function bfs(x, y, z, set) {
    if(c.getBlock({x: x, y: y, z: z}).typeId == "minecraft:air") {
        const randomblock = set[getRI(0, set.length-1)];
        const blockId = JSON.stringify(randomblock.permutation.getAllStates()).replace(/\{/g, "[").replace(/\}/g, "]");
        c.runCommand(`setblock ${x} ${y} ${z} ${randomblock.typeId} ${blockId}`);
    }
    for(let i=0; i<dirbfs.length; i++) {
        let nx=x+dirbfs[i].x, nz=z+dirbfs[i].z;
        if(c.getBlock({x: nx, y: y, z: nz}).typeId == "minecraft:air" && memo[`${nx} ${y} ${nz}`] == undefined) {
            memo[`${nx} ${y} ${nz}`] = true;
            system.runTimeout(function() {
                bfs(nx, y, nz, set);
            }, 1)
        }
    }
}

world.afterEvents.entityHitBlock.subscribe((ev) => {
    const {damagingEntity, hitBlock} = ev;
    const item = HoldItem(damagingEntity);
    const {x, y, z} = hitBlock.location;

    if(damagingEntity.hasTag("build")) {
        if(item!=undefined){
            if(item.typeId=="build:stick" && item.nameTag=="set") {
                if(damagingEntity.isSneaking) damagingEntity.set = [];
                if(damagingEntity.set==undefined) damagingEntity.set = [];
                damagingEntity.set.push(hitBlock);
                damagingEntity.runCommand(`tellraw @s {"rawtext":[{"text":"§l§8≪ §7Chose a block, ${hitBlock.typeId} §8[${damagingEntity.set.length}]"}]}`)
                tellraw("ya75jp", `${JSON.stringify(hitBlock.permutation.getAllStates())}`);
            }
            if(item.typeId=="build:wooden_axe") {
                if(item.nameTag=="randomtick") {
                    if(damagingEntity.set.length>=1) {
                        for(let i=y; i<6; i++) {
                            const randomblock = damagingEntity.set[getRI(0, damagingEntity.set.length-1)];
                            const blockId = JSON.stringify(randomblock.permutation.getAllStates()).replace(/\{/g, "[").replace(/\}/g, "]");
                            c.runCommand(`setblock ${x} ${i} ${z} ${randomblock.typeId} ${blockId}`)
                        }
                    }
                }
                if(item.nameTag=="randomtick2") {
                    if(damagingEntity.set.length>=1) {
                        for(let i=y; i<17; i++) {
                            const randomblock = damagingEntity.set[getRI(0, damagingEntity.set.length-1)];
                            const blockId = JSON.stringify(randomblock.permutation.getAllStates()).replace(/\{/g, "[").replace(/\}/g, "]");
                            c.runCommand(`setblock ${x} ${i} ${z} ${randomblock.typeId} ${blockId}`)
                        }
                    }
                }
                if(item.nameTag=="randomtick3") {
                    if(damagingEntity.set.length>=1) {
                        for(let i=y-1; i>-46; i--) {
                            if(c.getBlock({x: x, y: i, z: z}).typeId != "minecraft:air") break;
                            const randomblock = damagingEntity.set[getRI(0, damagingEntity.set.length-1)];
                            const blockId = JSON.stringify(randomblock.permutation.getAllStates()).replace(/\{/g, "[").replace(/\}/g, "]");
                            c.runCommand(`setblock ${x} ${i} ${z} ${randomblock.typeId} ${blockId}`)
                        }
                    }
                }
                if(item.nameTag=="randomtickbfs") {
                    if(damagingEntity.set.length>=1) {
                        memo = {};
                        memo[`${x} ${y} ${z}`] = true;
                        bfs(x, y, z, damagingEntity.set);
                    }
                }
                if(item.nameTag=="putlily") {
                    c.runCommand(`setblock ${x} ${y+1} ${z} waterlily`);
                    c.runCommand(`setblock ${x} ${y} ${z} water`);
                    c.runCommand(`setblock ${x} ${y-1} ${z} coal_block`);
                }
            }
        }
    }
})


world.afterEvents.itemCompleteUse.subscribe((ev) => {
    const {itemStack, source, useDuration} = ev;
    if(itemStack.typeId=="ya7:sweet_berries") {
        source.lberries = system.runTimeout(function() {
            source.getComponent("inventory").container.addItem(berries);
        }, 1200)
        updateCooltime(source, 1200, 20);
    }
})
