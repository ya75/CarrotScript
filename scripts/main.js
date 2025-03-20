import { world, system, ItemStack, MolangVariableMap} from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import {AVLTree} from './modules/avl.js'; // AVLTreeについては、https://learnersbucket.com/tutorials/data-structures/avl-tree-in-javascript/#google_vignette のサイトのものを改造しました
import { vector, rot } from './modules/vector.js';
import { score, setScore, addScore, sound, title,
        actionbar, msg, HoldItem, rad, lazyFor as lF,
        lazyWhile as lW, copy_array, gp, gpt, gptc,
        getBlock, tp, cont, Item, III, IIS, iptpm,
        particle,
        line, split2} from './modules/utility_function.js';
import { random as randomI } from './modules/random.js'; 
import { timer as timerI} from './modules/timer.js';
import { DPmanager } from './modules/DP.js';
import { InteractCanceler as ICI } from './modules/IC.js';

system.run(() => {
const  c = world.getDimension("overworld"); // 記述を簡略化する為です

const carrots = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const clickItemId = "minecraft:compass";
const clickItemId2 = "minecraft:clock";

const note = new timerI();
const encode = (h, s, v) => {
    const C = s;
    
    const H = h/60;
    const X = C*(1-Math.abs(H%2-1))
    if(h == undefined) return [v-C, v-C, v-C];
    if(H<1) return [C+v-C, X+v-C, v-C];
    else if(H<2) return [X+v-C, C+v-C, v-C];
    else if(H<3) return [v-C, C+v-C, X+v-C];
    else if(H<4) return [v-C, X+v-C, C+v-C];
    else if(H<5) return [X+v-C, v-C, C+v-C];
    else return [C+v-C, v-C, X+v-C];
}

system.runInterval(() => {
    const mo = new MolangVariableMap();
    const t = note.get();
    const res = encode(t%360, 1, 1);
    mo.setColorRGB("note_color", {red: res[0], green: res[1], blue: res[2]});
    try{c.spawnParticle("minecraft:note_particle", new vector(36+0.5, -45.7, 0.5), mo);} catch(e) {};
    const mo1 = new MolangVariableMap();
    mo1.setColorRGB("color", {red: 1, green: 0, blue: 0});
    try{c.spawnParticle("par:sitai", new vector(0, -47, 0), mo1);} catch(e) {};
}, 1);

const DP = new DPmanager();
const IC = new ICI();
//for(const player of gp()) {
//    if(player.name=='ya75jp') {
//        IC.insertAdmin(player);
//    }
//}
const itemMaxUse = 1e7*20; // ショットガンの最大で使用できる(？)時間です
const kbMul = 4.0; // 役職フクロウで飛ぶ威力の倍率です
const reg_term = 40;
const random = new randomI();

let gameInfo;
let contestInfo = new AVLTree();

let rarmors = [];
let barmors = [];
let items = [];
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
    "minecraft:light_block",
    "minecraft:waterlily",
    "ya7:hrztrap",
    "ya7:verttrap"
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

let thro = new AVLTree();
for(const element of thro_block) {
    thro.insert(hash(element));
}
//<--

const remTags = [
    "warrior", "archer", "kikori", "thief", "tracker", "hukurou", "aka", "ske",
    "uni",
    "join", "red", "blue", "arranged", "totyuu", "watch"
];

const roleInfo = [
    {name: "§l§c兵士", tag: "warrior", object: "warrior"},
    {name: "§l§6アーチャー", tag: "archer", object: "archer"},
    {name: "§l§2木こり", tag: "kikori", object: "kikori"},
    {name: "§l§q盗人", tag: "thief", object: "thief"},
    {name: "§l§c追跡者", tag: "tracker", object: "tracker"},
    {name: "§l§cユ§6ニ§gコ§aー§2ン", tag: "uni", object: "uni"},
    {name: "§l§c赤ずきん", tag: "aka", object: "aka" },
    {name: "§l§t梟(フクロウ)", tag: "hukurou", object: "hukurou"},
    {name: "§l§3スケルトン", tag: "ske", object: "ske"}
];

const specArea = [
    {x1: -49, y1: -1, z1: 100, x2: 50, y2: -55, z2: 318},
    {x1: 2, y1: -44, z1: 322, x2: -1, y2: -41, z2: 317},
    {x1: -1, y1: -44, z1: 96, x2: -4, y2: -41, z2: 100},
    {x1: -93, y1: 26, z1: 565, x2: 93, y2: -50, z2: 379},
    {x1: 12, y1: -22, z1: 601, x2: -12, y2: -46, z2: 558},
    {x1: -12, y1: -46, z1: 386, x2: 12, y2: -20, z2: 343},
    {x1: -235, y1: -25, z1: 252, x2: -124, y2: -53, z2: 111}
];

const raincheck = [
    {dx: 0, dz: 0}
];

const memo_effect = [
    "strength",
    "regeneration",
    "speed"
];

// 重複無しエフェクト (/effectコマンドとは違って、効果時間、強度などで損をしない付与の仕方をしたい、という考えのもとです)
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
}
//<--

// Aの正面にBがいるか？
function judge_front(A, B) {
    const v = new vector(A.getViewDirection());
    const b = new vector(B.location);
    b.reverse();
    if(b.dot(v) < 0) return false;
    return true;
}

let star;
let crossbow;
let crossbow2;
let clock;
let magic;
let ruby;
let kohakutou;
let glow_berries = [];
let spawncarrot = [];
let spawncarrot2 = [];
const rainTimer = new timerI().stop(0);
let rainsystem = undefined;

const arr10 = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];
function deg1(value, d) {
    return Math.floor(value*arr10[d])/arr10[d];
}

function toukei(player) {
    new MessageFormData()
    .title("統計")
    .body(`参加回数 ${joinDP.getDP(`${player.id}`)}回
勝利回数 ${winDP.getDP(`${player.id}`)}回
総キル数 ${killDP.getDP(`${player.id}`)}回
総デス数 ${deadDP.getDP(`${player.id}`)}回
総納品数 ${nouhinDP.getDP(`${player.id}`)}個
総強奪数 ${stealDP.getDP(`${player.id}`)}個
移動距離 ${deg1(iDP.getDP(`${player.id}`), 2)}m`
)
    .button1("OK")
    .show(player).then((Response) => {
        if(Response.selection == 0) return;
    });
}

const hparray = [
    {disp: "白兎のHPバー", icon: "textures/particle/sitai", desc: "サーバーへ参加する", ach: "§b初めの一歩"},
    {disp: "ペルシャ猫のHPバー", icon: "textures/particle/sitai", desc: "マッチ中に7キルする", ach: "§cバーサーカー"},
    {disp: "ずんだもんのHPバー", icon: "textures/particle/sitai", desc: "チームの最終納品数が1700を超える", ach: "§a大量の食料"},
    {disp: "ウーパールーパーのHPバー", icon: "textures/particle/sitai", desc: "？？？？", ach: "§9水生生物"},
    {disp: "弓使いのHPバー", icon: "textures/particle/sitai", desc: "役職「アーチャー」を使って、飛距離40mの矢を当てる", ach: "§gスターライトアロー"},
    {disp: "青いガーネットのHPバー", icon: "textures/particle/sitai", desc: "役職「木こり」の能力「なぎはらい」による追加ダメージでマッチ中に3キルする", ach: "§2見事な斧さばき"},
    {disp: "イルカのHPバー", icon: "textures/particle/sitai", desc: "全試合の移動距離が累計42.195kmを超える", ach: "§gゴールテープ"},
]

system.runInterval(() => {
    for(const player of gpt(["join"])) {
        if(player.killcnt >= 7) unlock(player, 1)
        if(!player.nagi) player.nagi = 0;
        if(player.nagi >= 3) {
            unlock(player, 5);
        }
        //msg(`${DP.get(`idou:`).getDP(`${player.id}`)}`, [player]);
        const w = player.water;
        if(w?.get() >= 2*60*20) unlock(player, 3);
        if(player.pidou+player.idou >= 42.195*1000) unlock(player, 6);
    }
}, 20)

//system.runInterval(() => {
//    for(const player of gpt(["join"])) msg(`${player.idou}`, [player]);
//}, 20*40)

world.afterEvents.buttonPush.subscribe((ev) => {
    const {source, block} = ev;
    const u = new vector(block.location);
    const d1 = new vector(20, -48, -3).removed(u).norm();
    const d2 = new vector(24, -48, -3).removed(u).norm();
    const d3 = new vector(28, -48, -3).removed(u).norm();
    const d4 = new vector(32, -48, -3).removed(u).norm();
    
    if(d1<1e-9) source.runCommand("scriptevent ya7:showToukei");
    if(d2<1e-9) source.runCommand("scriptevent ya7:showHPBAR")
    if(d3<1e-9) source.runCommand("scriptevent ya7:showNAME")
    if(d4<1e-9) {}
})

//world.afterEvents.playerJoin.subscribe((ev) => {
    //const {playerName, playerId} = ev;
    //let flag = false;
    const joinWorld = (player) => {
        resetPl(player);
        const id = ntoiDP.get(player.nameTag);
        player.runCommand(`clear`);
        nupdate(player);
        if(id) {
            itonDP.set(id, `${player.nameTag}${random.getInt(1, 1000)}`);
            for(const p1 of gp()) if(p1.id == id) nupdate(p1);
        }
    }
    //lW(func, 1, () => {return !flag});
//})

function unlock(player, id) {
    const hpbarDP = DP.get(`hpbar:`).get(`${player.id}:`);
    const flag = hpbarDP.getDP(`${id}`);
    //msg(`${flag}`);
    if(flag==1) return;
    msg(`§l§8≫ §a実績${hparray[id].ach} §aを達成しました！`, [player]);
    msg(`§l§8≫ §gHPバー ${hparray[id].disp} §gが解放されました！`, [player]);
    sound(`random.levelup`, [player]);
    hpbarDP.set(`${id}`, true)
}

function lock(player, id) {
    DP.set(`hpbar:${player.id}:${id}`, undefined);
}

const ntoiDP = DP.get('ntop:');
const itonDP = DP.get('iton:');
const weekDP = DP.get('nameWeek:');
const iDP = DP.get('idou:');
const joinDP = DP.get('join:');
const winDP = DP.get('win:');
const killDP = DP.get('kill:');
const deadDP = DP.get('dead:');
const nouhinDP = DP.get('nouhin:');
const stealDP = DP.get('steal:');
//const joinDP = DP.get('join:');
//const joinDP = DP.get('join:');
//const joinDP = DP.get('join:');
//const joinDP = DP.get('join:');
//const joinDP = DP.get('join:');
//const joinDP = DP.get('join:');
//const joinDP = DP.get('join:');
system.runTimeout(() => {
    weekDP.clearAll();
    //ntoiDP.clearAll();
    //itonDP.clearAll();
}, 20)
//for(let i=0; i<100; i++) msg(``);
function nameform(player) {
    const form = new ModalFormData();
    form.title("名前の変更");
    form.textField("変更したい名前を入力して送信してください", "Chocolate Rabit");
    form.show(player).then(res => {
        const {formValues, canceled} = res;
        if(canceled) return;
        //msg(`${formValues[0]}`)
        name(player, formValues[0]);
    })
}

function judge_sec(value) {
    for(const c of value) {
        if(c == '§') return true;
        if(c == '%') return true;
    }
}

function toSec (value) {
    const res = new timerI().stop(Math.floor(value/1000));
    return res.tos();
}

function name (player, value) {
    const res = ntoiDP.getDP(value);
    const week = weekDP.getDP(`${player.id}`);
    
    const error = (str) => {
        msg(`§l§8≫ §c${str}`, [player]);
    }
    const now = new Date().getTime();
    const tos = toSec(week-now);
    if(week != 0 && week < now) {
        error(`あなたが次に更新できるのは ${tos[3]}時間 ${tos[2]}分 ${tos[1]}秒後です`);
    }
    else if(res != 0) {
        error("現在この名前は使われています");
    }
    else if(split2(value).length == 0) {
        error("空白のみの名前は使えません");
    }
    else if(value.length >= 16) {
        error("名前は16文字以内にしてください");
    }
    else if(judge_sec(value)) {
        error("名前にはセクションやパーセント記号を含めません");
    } else {
        const nowname = player.nameTag;
        ntoiDP.clear(nowname);
        ntoiDP.set(value, `${player.id}`);
        itonDP.set(`${player.id}`, value);
        msg(`§l§8≫ §aあなたの名前は §g${value} §aになりました！`, [player]);
        weekDP.set(`${player.id}`, now+1000*60*60*24*7);
        
        player.nameTag = value;
    }
}

function nupdate(player) {
    const name = itonDP.getDP(`${player.id}`);
    msg(`${name}`);
    if(name == 0) {
        ntoiDP.set(player.name, `${player.id}`);
        return;
    }
    player.nameTag = name;  
}

function hpbar(player) {
    const form = new ActionFormData()
    .title("HPバーを選択してください")
    for(const elm of hparray) {
        const {disp, icon} = elm;
        form.button(disp, icon);
    }
    form.show(player).then((res) => {
        if(res.canceled) return;
        if(res.selection == hparray.length) return; 
        hpbarNext(player, res.selection);
    });
}

function hpbarNext(player, id) {
    const form = new MessageFormData()
    const elm = hparray[id];
    form.title(`${elm.disp}`);
    const str = `実績名：${elm.ach}§r\n解放条件：${elm.desc}`;
    form.body(`${str}`);
    const flag = DP.getDP(`hpbar:${player.id}:${id}`);
    //msg(`${flag}`);
    if(!flag) form.button1(`§8HPバーが解放されていません`);
    else form.button1(`§a装着する`);
    form.button2(`§c戻る`);
    form.show(player).then((res) => {
        if(res.canceled) {
            hpbar(player);
            return;
        }
        if(res.selection == 0) {
            if(flag) {
                player.setProperty("ya7:hpbar", id);
                msg(`§l§8≫ §aHPバーを ${elm.disp} §aにしました`, [player]);
                sound(`random.levelup`, [player]);
            } else {
                msg(`§l§8≫ §cHPバーを解放する必要があります`, [player]);
                sound(`note.bass`, [player]);
            }
        } else {
            hpbar(player);
            return;
        }
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
    //ar base = Number(world.getDimension("overworld").getBlock({x: -10, y: -48, z: 32}).getComponent("inventory").container.getItem(0).nameTag);
    for(let i=0; i<10; i++) {
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
    star = III('nether_star');
    block = world.getDimension("overworld").getBlock({x: -18, y: -48, z: 34}).getComponent("inventory").container;
    crossbow = block.getItem(0);
    crossbow.lockMode = "inventory";
    crossbow2 = block.getItem(1);
    crossbow2.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -17, y: -48, z: 34}).getComponent("inventory").container;
    clock = block.getItem(0);
    clock.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -18, y: -48, z: 34}).getComponent("inventory").container;
    magic = block.getItem(0);
    magic.lockMode = "inventory";
    block = world.getDimension("overworld").getBlock({x: -18, y: -48, z: 35}).getComponent("inventory").container;
    for(let i=0; i<3; i++) glow_berries.push(block.getItem(i));
    block = world.getDimension("overworld").getBlock({x: -26, y: -48, z: 34}).getComponent("inventory").container;
    kohakutou = block.getItem(0);
    kohakutou.lockMode = "inventory";
}

function resetCooltime(player) {
    player.ctTimer = undefined;
}

function team(p1, p2) {
    if(p1==undefined || p2==undefined) return false;
    return ((p1.hasTag("red") && p2.hasTag("red")) || (p1.hasTag("blue") && p2.hasTag("blue")));
}

function dist(p1, p2) {
    const a = new vector(p1.location);
    const b = new vector(p2.location);
    return a.removed(b).norm();
}

function is_air(x, y, z) {
    if(y<=-64) return false;
    const block_id = c.getBlock({x: x, y: y, z: z}).typeId;
    return thro.find(hash(block_id)) != undefined;
    /*for(let i=0; i<thro.length; i++) {
        if(c.runCommand(`testforblock ${x} ${y} ${z} ${thro[i]}`).successCount) return true;
    }
    return false;*/
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
    msg(`${itemStack.typeId}`, gpt(["debug"]));
    if(itemStack.typeId === clickItemId) {
        menu1(source);
    }
    else if(itemStack.typeId === clickItemId2 && source.hasTag("trick")) {
        try{source.runCommand(`clear @s clock`)} catch(e) {};
        if(!source.pcount>=100) source.getComponent("inventory").container.addItem(clock);
        if(source.pasti!=undefined) if(source.pasti[(source.pcount+1)%101] != undefined) {
            const teleportTo = source.pasti[(source.pcount+1)%101];
            source.tryTeleport(teleportTo.location, {rotation: teleportTo.rotate});
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
    }
})

var heir;

const timer = new timerI();
const timeri = new timerI().stop(0);

let now_stage;
let state = 0, sub_state = 0;

const wscore = (name, obj) => {
    const sc = world.scoreboard;
    const res = sc.getObjective(obj).getScore(name);
    return res;
}

function timer_set() {
    now_stage = wscore("now_stage", "count");
    if(now_stage == 0) {
        timeri.set(10*60*20);
    }
    if(now_stage == 1) {
        timeri.set(10*60*20);
    }
    if(now_stage == 2) {
        timeri.set(10*60*20);
    }
    if(now_stage == 3) {
        timeri.set(3*20);
    }
}

let red_carrot = 0;
let blue_carrot = 0;
let sitai = [];

c.runCommand(`weather clear`)

let pos_red = 0, pos_blue = 0;
let init;
const teamName = ["red", "blue"];
const arrange = (join, stage) => {
    //const init = random.getInt(0, 1);
    const res = random.randomPerm(join);
    for(const player of res) {
        const rc = gptc(["red"]);
        const bc = gptc(["blue"]);
        if(rc>bc) init = 1;
        else if(bc>rc) init = 0;
        else init = random.getInt(0, 1);
        player.addTag(teamName[init]);
        init++;
        init %= 2;
    }

    const red = gpt(["red", "!arranged"]);
    const blue = gpt(["blue", "!arranged"]);
    for(const player of red) {
        stage_tp(player, 0, stage);
    }
    for(const player of blue) {
        stage_tp(player, 1, stage);
    }
    for(const player of join) {
        player.killcnt = 0;
        player.death = 0;
        player.steal = 0;
        player.lhas = 0;
        player.nouhin = 0;
        player.amo1 = 1;
        player.amo2 = 1;
        player.nagi = 0;
        player.water = new timerI().stop(0);
        player.pidou = iDP.getDP(`${player.id}`);
        player.idou = 0;
        player.prepos = undefined;
        player.at = new timerI().stop(0);
        player.arrowDisted = undefined;
        if(!player.hasTag("totyuu")) player.dt = new timerI().stop(0);
        player.regtimer = new timerI().stop(0);
        player.regWait = new timerI().down(20);
        iptpm(player, false);
        player.addTag("arranged");
    }
}

const arrange2 = (join) => {
    for(const player of join) {
        equip(player);
        if(player.hasTag('red')) {
            redAVL.insert(player.id);
            blueAVL.delete(player.id);
        }
        if(player.hasTag('blue')) {
            blueAVL.insert(player.id);
            redAVL.delete(player.id);
        }
        joinAVL.insert(player.id);
        system.run(() => {
            player.addEffect(`minecraft:instant_health`, 1, {amplifier: 255, showParticles: false});
        });
        iptpm(player, true);
        player.removeTag(`in_lobby`);
    }
}

const unlock4name = ["ToumeiGames"];
for(const player of gp()) {
    for(const elm of unlock4name) if(player.name == elm) unlock(player, 2);
}

const reset1 = (join) => {
    c.runCommand(`weather clear`);
    c.runCommand(`time set 12750`);
    c.runCommand(`kill @e[type=item]`);
    for(const player of join) {
        player.lhas = itemCount(player, "minecraft:carrot");
        player.addTag(`in_lobby`);
        player.runCommand(`clear`);
    c.runCommand(`kill @e[type=item]`);
        player.runCommand(`camera @s clear`);
    }
}

const reset2 = (join) => {
    c.runCommand(`gamemode a @a`);
    c.runCommand(`spawnpoint @a 0 -48 0`);
    sitai = [];
    if(red_carrot>=1700) {
        for(const player of gpt(["red"])) unlock(player, 2);
    }
    if(blue_carrot>=1700) {
        for(const player of gpt(["blue"])) unlock(player, 2);
    }
    red_carrot = 0;
    blue_carrot = 0;
    for(const player of join) {
        resetPl(player);
        player.runCommand(`camera @s clear`);
    }
    const rnd = random.getInt(0, 2);
    c.runCommand(`scoreboard players set now_stage count ${rnd}`)
    system.runTimeout(() => {
        const v = new vector(-2-rnd, -51, 6);    
        c.runCommand(`clone ${v.x} ${v.y} ${v.z} ${v.x} ${v.y} ${v.z} -2 -47 6`);
    }, 1);
}

const resetPl = (player) => {
    player.runCommand(`tp @s 0 -48 0`);
    player.amo1 = undefined;
    player.amo2 = undefined;
    const id = player.id;
    killDP.add(id, player.killcnt);
    deadDP.add(id, player.death);
    nouhinDP.add(id, player.nouhin);
    stealDP.add(id, player.steal);
    iDP.add(id, player.idou);
    player.ld = undefined;
    player.ldName = undefined;
    player.runCommand(`camera @s clear`);
    for(const tag of remTags) {
        player.removeTag(tag);
    }
    unlock(player, 0);
    nupdate(player);
    iptpm(player, true);
}

reset1(gp());
system.runTimeout(() => {
    reset2(gp());
}, 5);

//for(let i=0; i<50; i++) msg(`\n`);

const stage_tp = (player, team, stage) => {
    player.addEffect("resistance", 100, {amplifier: 255});
    
    let info1, info2;
    if(stage==3) {
        if(tp_pos[stage*2+1][sub_state] == undefined) msg(`${sub_state}`);
        if(team == 1) {
            info1 = tp_pos[stage*2][sub_state][pos_red];
            info2 = tp_rot[stage*2][sub_state][pos_red];
            pos_red++;
            pos_red %= 8;
        } else {
            info1 = tp_pos[stage*2+1][sub_state][pos_blue];
            info2 = tp_rot[stage*2+1][sub_state][pos_blue];
            pos_blue++;
            pos_blue %= 8;
        }
    }
    else {
        //msg(`stage: ${stage}, pos_red: ${pos_red}, pos_blue: ${pos_blue}`);
        if(team == 0) {
            info1 = tp_pos[stage*2][pos_red];
            info2 = tp_rot[stage*2][pos_red];
            pos_red++;
            pos_red %= 8;
        }
        else {
            info1 = tp_pos[stage*2+1][pos_blue];
            info2 = tp_rot[stage*2+1][pos_blue];
            pos_blue++;
            pos_blue %= 8;
        }
    }

    const i1 = new vector(info1);
    i1.x += 0.5;
    i1.z += 0.5;
    tp(player, i1, info2);
    player.runCommand(`spawnpoint @s ${i1.x} ${i1.y} ${i1.z}`);
}

const gen_timer = new timerI();
const generate = (stage) => {
    const f = (arr) => {
        for(const v of arr) {
            const u = new vector(v); 
            u.x += 0.5;
            u.z += 0.5;
            itemDrop(u, "minecraft:carrot", random.getInt(4, 8));
        }
    }   
    if(stage==4) f(gen_pos[stage][sub_state]);
    else f(gen_pos[stage]);
}

const gen_pos = [
    [
        new vector(41, -37, 256),
        new vector(-36, -37, 256),
        new vector(12, -44, 214),
        new vector(-12, -44, 202),
        new vector(37, -37, 161),
        new vector(-37, -37, 161),
    ],
    [
        new vector(54, -27, 419),
        new vector(-61, -27, 422),
        new vector(-50, -27, 526),
        new vector(53, -27, 526),
        new vector(11, -46, 484),
        new vector(-12, -46, 461),
    ],
    [
        new vector(-139, -43, 124),
        new vector(-223, -43, 232),
        new vector(-180, -44, 176),
        new vector(-184, -44, 179),
        new vector(-180, -44, 182)
    ],
    [
        [
            new vector(-370, -37, 255),
            new vector(-408, -37, 255),
            new vector(-350, -37, 282),
            new vector(-429, -37, 282)
        ]
    ],
    [
        [
            new vector(-389, -37,  292),
        ]
    ],
    [
        [
            new vector(-351, -29, 254),
            new vector(-374, -29, 255),
            new vector(-404, -29, 255),
            new vector(-427, -29, 25),
        ]
    ],
    [
        [
            new vector(-394, -29, 292),
            new vector(-384, -29, 292)
        ]
    ],
    [
        [
            new vector(-371, -24, 234),
            new vector(-343, -23, 269),
            new vector(-407, -24, 234),
            new vector(-434, -23, 269),
            new vector(-384, -23, 292),
            new vector(-394, -23, 292)
        ]
    ]
]

const tp_pos = [
    [
        new vector(-4, -44, 315), new vector(-1, -44, 315),
        new vector(1, -44, 315), new vector(4, -44, 315),
        new vector(-4, -44, 312), new vector(-1, -44, 312),
        new vector(1, -44, 312), new vector(4, -44, 312)
    ],
    [
        new vector(1, -44, 102), new vector(-2, -44, 102),
        new vector(-4, -44, 102), new vector(-7, -44, 102),
        new vector(1, -44, 105), new vector(-2, -44, 105),
        new vector(-4, -44, 105), new vector(-7, -44, 105)
    ],
    [
        new vector(9, -45, 572), new vector(5, -45, 572),
        new vector(-5, -45, 572), new vector(-9, -45, 572),
        new vector(9, -45, 576), new vector(5, -45, 576),
        new vector(-5, -45, 576), new vector(-9, -45, 576),
    ],
    [
        new vector(-9, -45, 372), new vector(-5, -45, 372),
        new vector(5, -45, 372), new vector(9, -45, 372),
        new vector(-9, -45, 368), new vector(-5, -45, 368),
        new vector(5, -45, 368), new vector(9, -45, 368),
    ],
    [
        new vector(-186, -45, 235), new vector(-182, -45, 235),
        new vector(-178, -45, 235), new vector(-174, -45, 235),
        new vector(-186, -45, 239), new vector(-182, -45, 239),
        new vector(-178, -45, 239), new vector(-174, -45, 239),
    ],
    [
        new vector(-174, -45, 127), new vector(-178, -45, 127),
        new vector(-182, -45, 127), new vector(-186, -45, 127),
        new vector(-174, -45, 123), new vector(-178, -45, 123),
        new vector(-182, -45, 123), new vector(-186, -45, 123),
    ],
    [
        [
            new vector(-332, -37, 262), new vector(-332, -37, 259),
            new vector(-332, -37, 255), new vector(-332, -37, 252),
            new vector(-329, -37, 262), new vector(-329, -37, 259),
            new vector(-329, -37, 255), new vector(-329, -37, 252)//8
        ],
        [
            new vector(-353, -31, 276), new vector(-351, -31, 277),
            new vector(-350, -31, 279), new vector(-351, -31, 281),//
            new vector(-353, -31, 282), new vector(-355, -31, 281),
            new vector(-356, -31, 279), new vector(-355, -31, 277)
        ],
        [
            new vector(-355, -25, 277), new vector(-353, -25, 277),
            new vector(-351, -25, 277), new vector(-355, -25, 279),//
            new vector(-353, -25, 279), new vector(-351, -25, 279),
            new vector(-354, -25, 281), new vector(-352, -25, 281)//8
        ]
    ],
    [
        [
            new vector(-446, -37, 252), new vector(-446, -37, 255),
            new vector(-446, -37, 259), new vector(-446, -37, 262),//
            new vector(-449, -37, 252), new vector(-449, -37, 255),
            new vector(-449, -37, 259), new vector(-449, -37, 262)//8
        ],
        [
            new vector(-425, -31, 276), new vector(-427, -31, 277),
            new vector(-428, -31, 279), new vector(-427, -31, 281),//
            new vector(-425, -31, 282), new vector(-423, -31, 281),
            new vector(-422, -31, 279), new vector(-423, -31, 277)//8
        ],
        [
            new vector(-423, -44, 277), new vector(-425, -44, 277),
            new vector(-427, -44, 277), new vector(-423, -44, 279),//
            new vector(-425, -44, 279), new vector(-427, -44, 279),
            new vector(-424, -44, 281), new vector(-422, -44, 281)//8
        ]
    ]
];

const tp_rot = [
    [
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180),//
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180)//8
    ],
    [
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0),//
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0)//8
    ],
    [
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180),//
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180)//
    ],
    [
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0),//
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0)//
    ],
    [
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180),
        new rot(0, 180), new rot(0, 180)
    ],
    [
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0),
        new rot(0, 0), new rot(0, 0)
    ],
    [
        [
            new rot(270, 90), new rot(270, 90),
            new rot(270, 90), new rot(270, 90),
            new rot(270, 90), new rot(270, 90),
            new rot(270, 90), new rot(270, 90)
        ],
        [
            new rot(180, 90), new rot(210, 90),
            new rot(210, 90), new rot(195, 90),
            new rot(180, 90), new rot(165, 90),
            new rot(150, 90), new rot(150, 90)
        ],
        [
            new rot(150, 90), new rot(180, 90),
            new rot(210, 90), new rot(180, 90),
            new rot(180, 90), new rot(180, 90),
            new rot(180, 90), new rot(180, 90)
        ]
    ],
    [
        [
            new rot(90, 90), new rot(90, 90),
            new rot(90, 90), new rot(90, 90),
            new rot(90, 90), new rot(90, 90),
            new rot(90, 90), new rot(90, 90)
        ],
        [
            new rot(180, 90), new rot(150, 90),
            new rot(150, 90), new rot(165, 90),
            new rot(180, 90), new rot(195, 90),
            new rot(210, 90), new rot(210, 90)
        ],
        [
            new rot(210, 90), new rot(180, 90),
            new rot(150, 90), new rot(180, 90),
            new rot(180, 90), new rot(180, 90),
            new rot(180, 90), new rot(180, 90) 
        ]
    ]
];

const start = [
    "§l§25",
    "§l§a4",
    "§l§g3",
    "§l§62",
    "§l§c1"
];

const findPl = (player, red, blue) => {
    let res = undefined;
    let dis = 1e9;
    let arr;
    if(player.hasTag(`red`)) arr = blue;
    if(player.hasTag(`blue`)) arr = red;
    for(const elm of arr) {
        if(isSpec(elm)) continue;
        if(elm.id == player.id) continue;
        const u = new vector(elm.location);
        const v = new vector(player.location);
        const norm = (u.removed(v)).norm();
        if(norm < dis) {
            dis = norm;
            res = elm;
        }
    }

    if(dis != 1e9 && dis<16) {
        player.addEffect(`minecraft:speed`, 10, {amplifier: 0});
    }
    
    if(!res) return undefined
    const u = new vector(res.location);
    const v = new vector(player.location);
    const uv = (u.removed(v));
    uv.y = 0;
    let i = new vector(player.getViewDirection());//new vector(1, 0, 0);
    i.y = 0;
    i = i.normalize();
    let j = new vector(0, 0, 0);
    j.x = -i.z;
    j.z = i.x;
    j = j.normalize();
    const n1 = (uv.dot(i))/(uv.norm());
    const n2 = (uv.dot(j))/(uv.norm());
    const phi = Math.acos(n1);
    const theta = Math.acos(n2);
    const deg = (rad) => {
        return rad/Math.PI*180;
    }
    //msg(`${i} ${j}`);
    const phi1 = deg(phi);
    const theta1 = deg(theta);
    if(phi1<90 && theta1<90) return phi1;
    if(phi1<90 && theta1>=90) return -phi1+360;
    if(phi1>=90 && theta1<90) return phi1;
    if(phi1>=90 && theta1>=90) return -phi1+360;
}

const udtt = (player, red, blue) => {
    const res = findPl(player, red, blue);
    if(res) {
        const i = ((res+(360)/20000)/(360)*5000)+7500;
        player.setProperty("ya7:tracker", i%10000);
        if(res<=10 || 350<=res) player.addEffect("minecraft:speed", 10, {amplifier: 0})
        player.playAnimation(`animation.tracker`, {blendOutTime: 1e9})
    } else {
        player.playAnimation(`animation.tracker_invi`, {blendOutTime: 1e9});
    }
}

const isSpec = (player) => {
    const gamemode = player.getGameMode();
    return gamemode == "spectator";
}

const water_damage = (join) => {
    if(timeri.sc()) for(const player of join) {
        const l = player.location;
        const block = getBlock(l);
        const w = player.water;
        if(block?.typeId == "minecraft:water") {
            player.applyDamage(2);
            if(w) w.up();
        } else if(w) w.stop();
    }
}

const iupdate = (player) => {
    if(!isSpec(player)) {
        if(player.pre == undefined) {
            player.pre = new vector(player.location);
        }
        const pu = new vector(player.pre);
        const pv = new vector(player.location);
        const pnorm = (pu.removed(pv)).norm();
        const now =  iDP.getDP(`${player.id}`);
        //msg(`${now}`);
        player.idou += pnorm;
        player.pre = pv;
    } else player.pre = undefined;
}

let redAVL = new AVLTree();
let blueAVL = new AVLTree();
let joinAVL = new AVLTree();
system.runInterval(() => {
    const [tick, sec, min, hour] = timeri.det();
    const [Tick, Sec, Min, Hour] = timeri.tos();

    //for(const entity of c.getEntities()) {}
    const red_alive = gptc(["red"]);
    const blue_alive = gptc(["blue"]);
    const join = gpt(["join", "!totyuu"]);
    const njoin = gpt(["!join"]);
    const red = gpt(["red"]);
    const blue = gpt(["blue"]);
    //for(const player of gp()) udtt(player, red, blue);
    now_stage = wscore("now_stage", "count");

    for(const player of gp()) {
        if(!player.hasTag(`tracker`)) {
            player.playAnimation(`animation.tracker_invi`, {blendOutTime: 1e9});
            //if(player.name=='ya75jp') msg(`true`);
        }
        iupdate(player);
    }

    /*for(const p1 of gp()) {
        for(const p2 of gp()) {
            //p2[`hp`+ p1.id] = false;
            let flag = false;
            if(p1.id != p2.id) {
                if(p1.hasTag('in_lobby')) {
                    if(!p2[`hp`+p1.id]) p2.playAnimation(`animation.health_player_invi`, {players: [p1.name], blendOutTime: 0});
                    flag = true;
                } else {
                    if(p1.hasTag('red') && p2.hasTag('red')) {
                        if(!p2[`hp`+p1.id]) p2.playAnimation(`animation.health_player_invi`, {players: [p1.name], blendOutTime: 0});
                        flag = true;
                    }
                    if(p1.hasTag('blue') && p2.hasTag('blue')) {
                        if(!p2[`hp`+p1.id]) p2.playAnimation(`animation.health_player_invi`, {players: [p1.name], blendOutTime: 0});
                        flag = true;
                    }
                }
            }
            if(!flag) {
                p2.playAnimation(`animation.health_player_invi`, {players: [p1.name], blendOutTime:1e9});
            }
            p2[`hp`+p1.id] = flag;
        }
    }*/

    if(state==0) {
        if(join.length >= 1) {
            state++;
            timeri.down(20*1);
            msg(`§l§8≫ §f30秒後にゲーム開始が開始します。参加する人は§c参加登録§fをしてください`, njoin);
            msg(`§l§8≫ §fゲーム開始までしばらくお待ちください`, join);
        }
    }
    else if(state == 1) {
        if(timeri.sc() && 1<=sec && sec<=3) sound(`random.click`, join); 
        actionbar(`§l§f待機中... \ue10b${Min}:${Sec}`);
        if(timeri.get() == 0) {
            actionbar(`§l§f準備完了！`);
            arrange(join, now_stage);
            state++;
            timeri.down(20*2.5);
        }
        if(join.length < 1) {
            state--;
        }
    }
    else if(state==2) {
        if(timeri.get() == 0) {
            state++;
            timeri.down(20*5);
        }
    }
    else if(state==3) {
        if(timeri.get() == 0) {
            state++;
            sound(`random.explode`, join);
            title("§l§cFIGHT!!", join);
            timer_set();
            redAVL = new AVLTree();
            blueAVL = new AVLTree();
            joinAVL = new AVLTree();
            arrange2(join);
            gen_timer.up(0);
            c.runCommand(`tag @a remove totyuu`);
        } else if(timeri.sc()) {
            if(1<=sec && sec<=3) sound("note.pling", join);
            title(`${start[5-sec]}`, join);
        }
    }   
    else if(state==4) {
        if(gen_timer.get()%(20*10) == 0) generate(now_stage);
        water_damage(join);
        if(timer.get()==0) {
            gameInfo = new AVLTree();
            for(const player of join) {
                if(player.hasTag("red")) gameInfo.insert(player.id, {role: player.role, team: "red"});
                if(player.hasTag("blue")) gameInfo.insert(player.id, {role: player.role, team: "blue"});
                c.runCommand(`scoreboard players add ${roleInfo[player.role].object} Tselect 1`);
                player.runCommand(`scoreboard players add @s Tjoined 1`);
            }
        }
        if(timeri.get() == 0 || red_alive == 10 || blue_alive == 10) {
            if(now_stage == 3 && sub_state <= 3) {
                const struc = (f1, f2, t) => {
                    //msg(id);
                    c.runCommand(`clone ${f1.x} ${f1.y} ${f1.z} ${f2.x} ${f2.y} ${f2.z} ${t.x} ${t.y} ${t.z}`);
                }
                sub_state++;
                if(sub_state%2 ==0) {
                    //msg(`§d[!]`, join);
                    timeri.down(1/6*60*20);
                    const chara = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
                    const func = (i) => {
                        if(i-Math.floor(i)>=1e-9) return;
                        const u = new vector(-451, -24-Math.floor(i), 365), v = new vector(-451+125, -24-Math.floor(i), 365+75), w = new vector(-451, -24-Math.floor(i), 227); 
                        //const block = getBlock(u);
                        //if(block) msg(`${JSON.stringify(block.permutation)}`);
                        //if(block) c.setBlockPermutation(v, block.permutation);
                        struc(u, v, w);    
                    }
                    const func2 = (i) => {
                        const id = `map41${chara[Math.floor(i+12)]}0`;
                        struc(id, new vector(-451, -44+Math.floor(i), 227));
                    }
                    if(sub_state==2) lF(func, 1/20, 20);
                    //if(sub_state==4) lF(func2, 1/5, 5);
                } else {
                    msg(`§l§c[!]§d警報 §g非難用シャッターが開放されました。嵐に備えましょう！`, join);
                    timeri.down(1/6*60*20);
                }
            } else {
                title(`§l§c≫§gGame Over§c≪`, join);
                sound(`mob.blaze.shoot`, join);
                state++;
                reset1(join);
                timeri.down(20*5);
            }
        }
        c.runCommand(`effect @a[tag=red,tag=redc] wither 0 0`);
        c.runCommand(`effect @a[tag=blue,tag=bluec] wither 0 0`);

        if(now_stage==2) {
            if(rainTimer.get()==0) {
                const rnd = random.getInt(1, 5000);
                if(rnd == 1) {
                    msg(`§l§c[！]警報 §dもうすぐダメージ付きの大雨が降ります`, join);
                    //msg(`§l§c[！]警報 §dもうすぐダメージ付きの大雨が降ります`, watch);
                    rainTimer.stop(-1);
                    rainsystem = system.runTimeout(function() {
                        c.runCommand(`weather rain`);
                        //c.runCommand(`time set 12750`);
                        rainTimer.down(random.getInt(1500, 2000));
                        rainsystem = undefined;
                    }, 100);
                }
            } else if(rainTimer.get()>0) {
                if(rainTimer.get()==1) {
                    //c.runCommand(`time set noon`);
                    c.runCommand(`weather clear`);
                }
            }
        }
    }
    else if(state == 5) {
        if(timeri.get()==0) {
            let redWin = 0;
            const winArr = [];
            if(red_carrot>blue_carrot) {
                msg(`§l§c赤チームの勝利！！`);
                redWin = 1;
                const func = (node) => {
                    winArr.push(node.key);
                }
                redAVL.update(func);
            } else if(red_carrot==blue_carrot) {
                msg(`§l§7引き分け`);
                redWin = -1;
            } else {
                msg(`§l§9青チームの勝利！！`);
                redWin = 0;
                
                const func = (node) => {
                    winArr.push(node.key);
                }
                blueAVL.update(func);
            }

            const func = (node) => {
                joinDP.add(node.key, 1);
            }
            joinAVL.update(func);
            for(const id of winArr) winDP.add(id, 1); 
            state = 0;
            
            const result = () => {
                let str = [];
                let resultArr = [];
                const so = (arr) => {
                    let res = [];
                    for(const player of arr) {
                        if(player == undefined) continue;
                        const obj = {name: player.nameTag, kill: player.killcnt, death: player.death, nouhin: player.nouhin, lhas: player.lhas, steal: player.steal, red: player.hasTag('red')};
                        res.push(obj);
                    }
                    res.sort((x, y) => {
                        if(x.nouhin < y.nouhin) return true;
                        if(x.nouhin == y.nouhin) {
                            if(x.kill < y.kill) return true;
                            if(x.kill == y.kill) {
                                if(x.death > y.death) return true;
                            }
                        }
                        return false;
                    });
                    return res;
                }
                if(redWin == 1) {
                    const r1 = so(red);
                    const r2 = so(blue);
                    for(const e of r1) resultArr.push(e);
                    for(const e of r2) resultArr.push(e);
                }
                else if(redWin == 0) {
                    const r1 = so(blue);
                    const r2 = so(red);
                    for(const e of r1) resultArr.push(e);
                    for(const e of r2) resultArr.push(e);
                }
                else if(redWin == -1) {
                    const r1 = so(join);
                    resultArr = r1;
                }
                for(const elm of resultArr) {
                    let _str = "";
                    if(elm.red) _str += `§l§7\ue108`;
                    else _str += `§l§7\ue109`;
                    _str += `${elm.name}  \ue106 ${elm.kill}  \ue10a ${elm.death}  \ue113 ${elm.nouhin}  \ue10c ${elm.lhas}  \ue110 ${elm.steal}`;
                    str.push(_str);
                }
                return str;
            }
            const res = result();
            msg(`§l§7～～リザルト～～`);
            msg(`§l§6\ue108\ue107 ${red_carrot}  \ue109\ue107 ${blue_carrot}`);
            for(const str of res) msg(str);
            reset2(join);
        }
    }
    const players = gp();
    const template = `\ue108§l§7[${red_alive}] §6${red_carrot}\ue107    \ue109§7[${blue_alive}] §6${blue_carrot}\ue107  §f\ue10b${Min}:${Sec}\n`;
    actionbar(template, njoin);
    actionbar(template, gpt(["watch"]));
    for(const player of join) {
        if(state == 4) {
            const isTerra2 = (isRed) => {
                const v = player.location;
                v.y-=0.1;
                const bBlock = getBlock(v);
                if(!bBlock) return false;
                if(isRed) if(bBlock.typeId == "minecraft:red_terracotta") return true;
                if(!isRed) if(bBlock.typeId == "minecraft:blue_terracotta") return true;
                return false;
            }
            const isTerra = (isCatch) => {
                if(player.hasTag(`red`)) {
                    if(isCatch) {
                        if(blue_carrot <= 0) return false;
                        if(isTerra2(false)) return true;
                    }
                    if(!isCatch) if(isTerra2(true)) return true; 
                }
                if(player.hasTag(`blue`)) {
                    if(isCatch) {
                        if(red_carrot <= 0) return false;
                        if(isTerra2(true)) return true;
                    }
                    if(!isCatch) if(isTerra2(false)) return true;
                }
                return false;
            }
            player.nouhining = false;
            if(isTerra(false) && !isSpec(player)) {
                const amo = itemCount(player, "minecraft:carrot");
                if(player.hasTag(`red`)) {
                    red_carrot += amo;
                    player.runCommand(`clear @s carrot`);
                }
                if(player.hasTag(`blue`)) {
                    blue_carrot += amo;
                    player.runCommand(`clear @s carrot`);
                }

                if(player.hasTag('uni')) {
                    player.amo1 = 1;
                    player.amo2 = 1;
                }
                player.nouhining = true; 
                player.nouhin += amo;
            }
            
            if(!isTerra(true) || isSpec(player)) player.catch = undefined;
            if(player.catch == undefined) {
                player.catch = new timerI().down(20);
            }
            const steal = (isRed) => {
                let amount = 10;
                if(player.hasTag("thief")) {
                    amount = player.amo1;
                    player.amo1++;
                }
                player.catch = undefined;
                let base;
                if(isRed) base = red_carrot;
                else base = blue_carrot;
                const res = Math.min(amount, base);
                const container = cont(player);
                player.steal += res;
                container.addItem(new ItemStack(`minecraft:carrot`, res));
                addScore(player, "Tsteal", res);
                if(isRed) red_carrot = Math.max(0, red_carrot-res);
                else blue_carrot = Math.max(0, blue_carrot-res); 
            }
            if(player.catch.get() == 0) {
                if(red_carrot > 0) if(player.hasTag("blue")) steal(true);
                if(blue_carrot > 0) if(player.hasTag("red")) steal(false);
            }
        }
    
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
            
                
                if(!flag && player.invisibilityFlag!=undefined) {
                    player.runCommand(`playanimation @s animation.invisibility none 0`);
                    player.invisibilityFlag = undefined;
                }
            }
            
            if(rainTimer.get()%20==0) if(now_stage==2 && rainTimer.get()>0) {
                let flag = false;
                for(let i=player.location.y+1; i<=-26; i++) {
                    for(let p of raincheck) {
                        //let flag2 = false;
                        //for(let q of thro) {
                        //    if(world.getDimension("overworld").getBlock({x: player.location.x+p.dx, y: i, z: player.location.z+p.dz}).typeId==q) {
                        //        flag2 = true;
                        //    }
                        //}
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
        if(state==4) {
            iupdate(player);
            const dt = player.dt;
            if(dt) {
                const hukkatu = () => {
                    player.runCommand(`gamemode a`);
                    player.removeTag(`in_lobby`);
                    if(player.hasTag("hukurou")) {
                        const container = cont(player);
                        for(let i=0; i<36; i++) {
                            const item = container.getItem(i);
                            if(!item) continue;
                            if(item.typeId == 'minecraft:crossbow') {
                                container.setItem(i, crossbow2);
                                break;
                            }
                            if(i==35) {
                                player.runCommand("clear @s crossbow");
                                container.addItem(crossbow2);
                            }
                        }
                        player.at = new timerI().down(20*10);
                    }
                    system.run(() => {
                        player.addEffect(`minecraft:instant_health`, 1, {amplifier: 255, showParticles: false});
                    });
                    player.ld = undefined;
                    player.ldName = undefined;
                    dt.stop(0);
                }

                if(dt.sc() && dt.get()>0) {
                    const [tick1, sec1, min1, hour1] = dt.det(); 
                    title(sec1, [player]);
                    sound(`random.click`, [player]);
                    if(player.hasTag('aka')) {
                        const ld = player.ld;
                        if(ld?.dt.get()>0) {
                            const ll = ld.ll, lr = ld.lr;
                            tp(player, ll, lr);
                            hukkatu();
                        }
                    }
                }

                if(dt.sc() && dt.get() == 0) {
                    if(player.hasTag(`red`)) stage_tp(player, 0, now_stage);
                    if(player.hasTag(`blue`)) stage_tp(player, 1, now_stage);
                    hukkatu();
                }
                //msg(`${player.nameTag} ${dt.get()}`);
                if(dt.get() == 0 && !isSpec(player)) {
                    player.runCommand(`spawnpoint @s`);
                    player.ll = player.location;   
                    player.lr = player.getRotation();
                }
            }
            
            /*if(player.hasTag("tracker")) {
                player.playAnimation(`animation.tracker`, {players: [player.nameTag], blendOutTime: 1e9});
            }
            else {
                player.playAnimation(`animation.tracker_invi`, {players: [player.nameTag], blendOutTime: 1e9});
            }*/
            const at = player.at;
            //if(at) msg(`${at.get()}`);
            if(at) if(at.sc() && at.get() == 0) {
                const container = cont(player);
                if(player.hasTag(`hukurou`)) {
                    for(let i = 0; i<36; i++) {
                        const item = container.getItem(i);
                        if(item?.typeId == 'minecraft:crossbow') {
                            container.setItem(i, crossbow);
                            break;
                        }
                        if(i==35) {
                            player.runCommand(`clear @s crossbow`);
                            container.addItem(crossbow);
                        }
                    }
                }
                else {
                    const arrow = III("minecraft:arrow");
                    container.addItem(arrow);
                }
                at.stop(0);
            }
            player.arc = player.arc1;
            player.arc1 = itemCount(player, "minecraft:arrow");
            player.titleStack = template;
            player.titleStack += `\ue106 ${player.killcnt}  \ue10a ${player.death}  \ue10c ${itemCount(player, 'minecraft:carrot')}`;
                
            if(player.hasTag("warrior")) {
                player.titleStack += `  \ue10d ${at.det()[1]}`;
            }
            if(player.hasTag("archer")) {
                player.titleStack += `  \ue10d ${at.det()[1]}`;
            }
            if(player.hasTag("kikori")) {
                //player.titleStack += `  \ue10d ${player.coolSec}`;
            }
            if(player.hasTag("tracker")) {
                //player.titleStack += `  \ue10d ${player.coolSec}`;
                udtt(player, red, blue);
                player.runCommand(`camera @s set minecraft:first_person`);
            }
            if(player.hasTag("hukurou")) {
                player.titleStack += `  \ue10d ${at.det()[1]}`;
            }
            if(player.hasTag("thief")) {
                const jukuren = player.amo1;
                player.titleStack += `  \ue110 §u${jukuren}`;
            }
            if(player.hasTag("uni")) {
                const jukuren = player.amo2;
                player.titleStack += `  \ue112 §u${jukuren}`;
                cLI(player);
            }
            if(player.hasTag("ske")) {
                for(const w of sitai) {
                    const u = new vector(w);
                    u.y += 1;
                    try{particle(u, player, "minecraft:blue_flame_particle");} catch(e) {};
                }
            }
            actionbar(player.titleStack, [player]);
            //msg(`${player.titleStack}`, debug);
        }
    }
    for(const player of gpt(["watch"])) {
        if(inSpecArea(player)) {
            player.specAreal = player.location;
            player.specArear = player.getRotation();
        } else {
            tp(player, player.specAreal, player.specArear);
        }
        if(player.runCommand(`testfor @s[rxm=-90, rx=-89]`).successCount) {
            if(player.backLobby==undefined) player.backLobby = new timerI().down(100);
            if(player.backLobby.get()==0 && player.backLobby.sc()) {
                player.runCommand(`function backLobby`);
            }
        } else {
                player.backLobby = undefined;
        }
    }
    for(const player of gp()) {
        if(player.regWait == undefined) player.regWait = new timerI(); 
        const rw = player.regWait;
        if(rw.get() == 0) {
            if(player.regTimer == undefined) {
                if(!player.hasTag('uni')) player.regTimer = new timerI().down(reg_term);
                else player.regTimer = new timerI().down(10);
            }
            const effects = player.getEffects();
            let flag = false;
            for(let element of effects) {
                if(element.typeId == "wither") {
                    flag = true;
                }
            }
            if(flag) player.regTimer = new timerI().down(reg_term);
            const health = player.getComponent(`health`);
            if(player.regTimer.get() == 0) {
                if(player.hasTag('uni')) player.regTimer.down(10);
                else player.regTimer.down(reg_term);
                if(health.effectiveMax > health.currentValue) health.setCurrentValue(health.currentValue+1);
            }
        }
    }
}, 1);
function int(value) {
    return Math.floor(value);
}

function itemCount(player, itemId) {
    let res = 0;
    for(let i=0; i<36; i++) {
        const container = player.getComponent(`inventory`).container;
        const item = container.getItem(i);
        if(!item) continue;
        if(item.typeId != itemId) continue; 
        res += item.amount;
    }
    return res;
}

function itemDrop(location, itemId, amount) {
    for(let i=0; i<36; i++) {
        if(amount>=65) {
            amount-=64;
            try{c.spawnItem(new ItemStack(itemId, 64), {x: location.x, y: location.y, z: location.z})} catch(e) {};
        } else break;
    }
    for(let i=6; i>=0; i--) {
        if(amount>=carrots[i]) {
            amount-=carrots[i];
            try{c.spawnItem(new ItemStack(itemId, carrots[i]), {x: location.x, y: location.y, z:location.z})} catch(e) {}; //carrots[i]は2^iを要素に持つただの配列
        }
    }
}

system.runInterval(function() {
    if(rarmors.length==0) prepare();
}, 20)

system.runInterval(function() {
    const players = gp();
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

function equip (player) {
    const equippable = player.getComponent(`equippable`);
    let eqarr;
    if(player.hasTag(`red`)) eqarr = rarmors;
    if(player.hasTag(`blue`)) eqarr = barmors;
    const eqrArr = eqarr[player.role];
    for(let i=0; i<4; i++) {
        const es = equip_slot[i];
        const item = eqrArr[i];
        if(item == undefined) continue;
        equippable.setEquipment(es, eqrArr[i]);
    }

    const container = cont(player);
    const ritems = items[player.role];
    const siz = ritems.length;
    for(let i=0; i<siz; i++) {
        const item = ritems[i];
        if(item == undefined) continue;
        container.addItem(item);
    }
}

function arf(player, cool)  { // arf = arrow_reload_func
    if(player.regWait?.get()>0) if(player.hasTag(`hukurou`)) cool += 40;
    player.at = new timerI().down(cool); // at=:arrow_timer;
}

system.afterEvents.scriptEventReceive.subscribe((ev) => {
    const {id, sourceEntity, message} = ev;
    switch(id) {
        case 'ya7:syuukeishow': {
            const scores = world.scoreboard.getObjective(message).getScores();
            for(const element of scores) {
                tellraw("@a[tag=debug]", `${element.participant.displayName}, ${element.participant.id}, ${element.score}`);
            }
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
        case 'ya7:joinWorld': {
            joinWorld(sourceEntity)
            break;
        }
        case 'ya7:showHPBAR': {
            hpbar(sourceEntity);
            break;
        };
        case 'ya7:showNAME': {
            nameform(sourceEntity);
            break;
        };
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
            equip(sourceEntity);
        break;
        case 'ya7:role':
            const role = Number(message);
            sourceEntity.role = role;
            if(roleInfo[role].tag != "") sourceEntity.addTag(roleInfo[role].tag);
            msg(`§l§8≫ §7あなたは${roleInfo[role].name}§7を選びました`, [sourceEntity]);
            let dt;
            if(state == 2) dt = new timerI().down(5*20+5*20+timeri.get());
            if(state == 3) dt = new timerI().down(5*20+timeri.get());
            if(state == 4) dt = new timerI().down(5*20);
            if(dt) {
                c.runCommand(`scoreboard players add ${roleInfo[role].object} Tselect 1`);
                if(state!=4) sourceEntity.addTag("totyuu");
                arrange([sourceEntity], now_stage);
                arrange2([sourceEntity]);
                //equip(sourceEntity);
                sourceEntity.dt = dt;
                sourceEntity.runCommand("/gamemode spectator");
                let label;
                if(sourceEntity.hasTag("red")) label = "§c";
                if(sourceEntity.hasTag("blue")) label = "§9";
                msg(`§l§8≫ ${label}${sourceEntity.nameTag} §7が途中参加しました`);
            }
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
                const stage = getRI(3, 3);
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

        case 'ya7:removeInLobby': {
            system.runTimeout(function() {
                sourceEntity.runCommand(`tag @s remove in_lobby`);
            }, 100)
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

const updateAs = (de) => {
    if(de.typeId == 'minecraft:arrow') {
        let update = [];
        for(const arrow of arrows) {
            if(arrow.id != de.id) update.push(arrow);
        }
        arrows = update;
        return;
    }
}
    
const dead = (damageSource, deadEntity) => {
    const de = deadEntity;
    if(de) updateAs(de);
    de.runCommand(`/gamemode spectator`);
    de.dt = new timerI().down(100); // dt=death_time 復活までの時間
    de.addTag(`death`);
    de.addTag(`in_lobby`);
    de.prepos = undefined;
    if(de.hasTag('uni')) {
        de.amo1 = 1;
        de.amo2 = 1;
    }
    const dd = damageSource.damagingEntity;
    var ddl = ""; // ddロール
    var del = ""; // deadロール
    let l;
    if(de.hasTag("red")) del = "§c";
    else if(de.hasTag("blue")) del = "§9";
    let uniAmount;
    let selfDeath = false;
    if(de.typeId=="minecraft:player") {
        l = de.location;
        const ld = de.ld;
        const f = (ld) => {
            if(ld) if(de.nagied) ld.nagi++;
            if(ld) {
                const v = new vector(de.location);
                v.y += 1;
                sitai.push(v);
            }
            if(ld != undefined && de.id) ld.killcnt++;
            deadEntity.death++;
            if(ld) {
                if(ld.runCommand) {
                    ld.runCommand(`scoreboard players add @s Tkill 1`);
                    ld.runCommand(`scoreboard players add @s point 30`);
                    if(!ld.hasTag("red")) ddl = "§9";
                    else if(!ld.hasTag("blue")) ddl = "§c";
                }
            }

            if(ld == undefined) selfDeath = true;
            if(ld) if(ld.id == de.id) selfDeath = true;
            if(ld) {
                if(ld.hasTag('uni')) {
                    uniAmount = ld.amo2;
                    const pre1 = ld.amo1;
                    const pre2 = ld.amo2;
                    ld.amo1 = Math.min(pre1+pre2, 144);
                    ld.amo2 = Math.min(pre1, 144);
                }
            }
        }
        if(dd != undefined) f(dd);
        else f(ld);
        de.runCommand(`scoreboard players add @s death 1`);
        de.runCommand(`scoreboard players add @s Tdeath 1`);
        //const count = itemCount(deadEntity, "carrot");

        //itemDrop(l, "carrot", count);
        if(selfDeath) {
            msg(`§l\ue10a ${del}${de.nameTag}`);
        }
        else {
            const Disted = Math.floor(de.arrowDisted*10)/10;
            const addInfo = Disted?Disted+"m":"";
            if(dd!=undefined) msg(`§l${ddl}${dd.nameTag} §8>> ${del}${de.nameTag} §c${addInfo}`);
            else if(de.ldName!=undefined) msg(`§l${ddl}${de.ldName} §8>> ${del}${de.nameTag} §c${addInfo}`);
            de.arrowDisted = undefined;
        }
        //de.ld=undefined;
        //de.ldName=undefined;
    }
    DeadClearRun(de, "lclock");
    DeadClearRun(de, "lberries");
    DeadClearRun(de, "lkohakutou");
    DeadClearRun(de, "conPower");
    DeadClearRun(de, "lbullet");
    DeadClearRun(de, "lsouten");
    DeadClearRun(de, "lrensya");
    
    let amount = random.getInt(4, 8);
    let v = l;
    if(dd) if(uniAmount>0) {
        amount = uniAmount;
        v = dd.location;
    }
    const amo = itemCount(de, "minecraft:carrot");
    itemDrop(l, "minecraft:carrot", amo);
    itemDrop(v, "minecraft:carrot", amount);
    de.runCommand(`clear @s carrot`);
    de.runCommand(`clear @s ya7:sweet_berries`);
    de.runCommand(`clear @s dragon_breath`);
    de.runCommand(`clear @s ya7:kohakutou`);

    try{de.runCommand(`scoreboard players set @s cooltime 0`)} catch(e) {};
    if(de.hasTag("sword")) cont(de).addItem(berries);
    if(de.hasTag("pharm")) cont(de).addItem(magic);

    if(de.hasTag("fight")) {
        de.damagec = undefined;
        de.dc = undefined;
    }
    if(de.hasTag("hukurou")) {
        de.at.set(-1);
    }
    resetCooltime(deadEntity);
    effect_init(deadEntity);
}

const cLI = (player) => {
    const container = cont(player);
    let arr = [];
    for(let i=0; i<36; i++) {
        const item = container.getItem(i);
        if(item) if(item?.typeId == "minecraft:carrot")
        if(item.lockMode != 'inventory') {
            const amo = item.amount;
            arr.push(III("minecraft:carrot", amo));
            const air = Item("minecraft:air");
            const chest = getBlock({x:-12, y:-48, z:27});
            const ccont = cont(chest);
            container.transferItem(i, ccont);
        }
    }
    for(const item of arr) {
        container.addItem(item);
    }
}

world.afterEvents.entityDie.subscribe((ev) => {
    const {damageSource, deadEntity} = ev;
    dead(damageSource, deadEntity);
})

function kakutou_attack(player) {
    player.runCommand(`event entity @s attack_damage${int(player.dc*3/4)}`);
}

let arrows = [];
world.afterEvents.entitySpawn.subscribe((ev) => {
    const {entity} = ev;
    if(entity.typeId == 'minecraft:arrow') {
        arrows.push(entity);
    }
});

system.runInterval(() => {
    for(const entity of arrows) {
        if(entity.pre == undefined) {
            entity.pre = new vector(entity.location);
            entity.dist = 0;
            continue;
        }
        const u = new vector(entity.pre);
        const v = new vector(entity.location);
        const dist = (u.removed(v)).norm();
        entity.dist += dist;
        entity.pre = v;
    }
}, 1)

world.afterEvents.projectileHitEntity.subscribe((ev) => {
    const {source, projectile, location, hitVector} = ev;
    //if(source.hasTag(`archer`)) arf(source, 0);
    if(source.hasTag(`hukurou`)) arf(source, 0);
    updateAs(projectile);
    const pro = projectile;
    if(pro.pre==undefined) pro.pre = source.location;
    if(pro.dist==undefined) pro.dist = 0;
    const u = new vector(pro.pre);
    const v = new vector(location);
    const add = (u.removed(v)).norm();
    const dist = pro.dist+add;
    const damage = 4+(dist/28.75)*20;
    const he = ev.getEntityHit().entity;
    if(he == undefined) return;
    if(source.hasTag("archer")) {
        if(source.id != he.id) arf(source, 0);
        else arf(source, 20);
    }
    let h = new vector(hitVector);
    h.y = 0;
    if(source.hasTag(`archer`)) {
        h = h.normalize();
        const mul = (256-itemCount(he))/256;
        if(mul>0) he.applyKnockback(h.scaled(mul), 0);
    }
    if(team(source, he)) return;
    sound(`random.orb`, [source]);
    if(source.hasTag(`archer`)) {
        if(dist>=40) unlock(source, 4);
        if(dist>=30) he.arrowDisted = dist;
        he.ld = source;
        he.ldName = source.nameTag;
        if(pro.typeId == 'minecraft:arrow') he.applyDamage(damage, {cause: "entityAttack"});
    } else if(source.hasTag(`hukurou`)) {
        let j = new vector(location);
        let i = new vector(source.location); 
        i = i.remove(j);
        i = i.normalize();
        i.scale(kbMul);
        he.applyKnockback(i, 0);
    }
});

world.afterEvents.entityHurt.subscribe((ev) => {
    hurt(ev);
});

const hurt = (ev) => {
    const {damageSource, hurtEntity, damage} = ev;
    //msg(`${damage}`);
    const he = hurtEntity;
    const dd = damageSource.damagingEntity;
    const dcause = damageSource.cause;
    let useditem = undefined;
    /*if(he.hasTag("fight") && (dcause == "entityAttack" || dcause == "projectile")) {
        if(he.damagec[_match] == undefined) he.damagec[_match] = damage;
        else he.damagec[_match] += damage; // ダメージが1tick中に二度当たる可能性を考慮しています
        he.dc += damage;
        kakutou_attack(he);
    }*/
    he.regWait = new timerI().down(100);
    let l = he.location;
    if(dd!=undefined) {
        if(!team(dd, he)) {
            //msg(`${dd.nameTag}`);
            he.ld = dd;
            he.ldName = dd.nameTag;
        }
        const GI = dd.getComponent("inventory").container.getItem(dd.selectedSlotIndex);
        if(GI!=undefined) useditem = GI.typeId;
        if(!team(dd, he)) {
            if(useditem=="ya7:stone_axe" && he.rangeA==undefined) {
                dd.runCommand(`execute as @s at @s anchored eyes run particle ya7:simple_range_attack ^ ^-0.5 ^1`);
                let players;
                if(dd.hasTag("red")) players = gp({
                    location: he.location,
                    maxDistance: 4,
                    tags: ["blue"]
                });
                if(dd.hasTag("blue")) players = gp({
                    location: he.location,
                    maxDistance: 4,
                    tags: ["red"]
                });
                for(const player of players) {
                    if(!judge_front(dd, player) && player.id!=he.id) {
                        player.rangeA = true;
                        player.applyDamage(5, {cause: "entityAttack", damagingEntity: dd});
                        player.nagied = true;
                        system.runTimeout(() => {
                            player.nagied = false;
                        }, 5)
                    }
                }
            } else if(dd.hasTag("fight")) {
            //hurtEntity.applyDamage(Math.floor(dd.dc), {cause: "entityAttack"});
            } else if(dcause=="projectile" && dd.hasTag("hukurou") && !team(hurtEntity, dd)) {
            /*const hurtl = hurtEntity.location, ddl = dd.location;
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
            hurtEntity.applyKnockback(dx/dl, dz/dl, Math.min(Math.sqrt(dx*dx+dz*dz)*kbMul*0.5, kbMul*0.5), 0);
            */} else if(dd.hasTag("thief")) {
                if(useditem != 'ya7:stone_sword') {
                    const jukuren = dd.amo1;
                    const hascarrotHurt = itemCount(he, "minecraft:carrot");
                    const amo = Math.min(hascarrotHurt, jukuren);
                    dd.runCommand(`give @s minecraft:carrot ${amo}`);
                    he.runCommand(`clear @s carrot 0 ${amo}`);
                    stealDP.add(`${dd.id}`, amo);
                    if(hascarrotHurt>0) dd.amo1++;
                }
            } else if(dd.hasTag("ske")) {
                const new_sitai = [];
                for(const pos of sitai) {
                    const u = new vector(dd.location);
                    const v = new vector(pos);
                    const uv = u.removed(v);
                    const norm = uv.norm(); 
                    v.y += 1;
                    if(norm > 8) {
                        new_sitai.push(pos);
                    } else {
                        const w = new vector(he.location);
                        w.y += 1;
                        he.applyDamage(2, {cause: "selfDestruct"});
                        for(const player of gp()) line(pos, w, player, "minecraft:blue_flame_particle");
                    }
                }
                sitai = new_sitai;
            }
        }
    }
    he.rangeA = undefined;
}

world.afterEvents.playerLeave.subscribe((ev) => {
    const {playerName, playerId} = ev;
    const players = gp();
    players.forEach((player) => {
        if(player.id == playerId) {
            if(player.hasTag(`join`)) {
                dead(player);
            }
            resetPl(player);
        }
    })
})

function apk(source, rot, mul) { // ノックバックを与える関数です(apk = pplyKnockback)
    const xr = trans3D(rad(rot.y), rad(rot.x+180), mul, "x", {x: 0, y: 0, z: 0}), yr = trans3D(rad(rot.y), rad(rot.x+180), mul, "y", {x: 0, y: 0, z: 0}), zr = trans3D(rad(rot.y), rad(rot.x+180), mul, "z", {x: 0, y: 0, z: 0});
    source.applyKnockback(xr, zr, floor2(dist({x: 0, y: 0, z: 0}, {x: xr, y: 0, z: zr})), yr/1.5);
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
    } else if(item.typeId == 'minecraft:bow') {
        const now = itemCount(source, "minecraft:arrow");
        //msg(`${source.arc}`);
        if(now == source.arc-1) {
            if(source.hasTag('warrior')) arf(source, 60);
            //if(source.hasTag('archer')) arf(source, 40);
            //if(source.hasTag('hukurou')) arf(source, 100);
        }
    } 
})

world.afterEvents.projectileHitBlock.subscribe((ev) => {
    const {location, source} = ev;

    let u = new vector(location);
    const v = new vector(source.location);
    u.remove(v);
    u = u.normalize();
    u.scale(kbMul);
    if(source.hasTag("hukurou")) {
        const hasCarrot = Math.min(itemCount(source, "minecraft:carrot"), 256);
        u.scale((256-hasCarrot)/256);
        if(hasCarrot < 256) source.applyKnockback(u, 0);
        arf(source, 50);
    }
    if(source.hasTag(`archer`)) {
        arf(source, 20);
    }
})

world.beforeEvents.chatSend.subscribe((ev) => {
    const {sender, message} = ev;
    let color = "", teamchat = "", chatTarget = [];
    const lower = message.toLowerCase() ;
    //msg(`<${sender.nameTag}> ${message}`);
    if(lower == "!teamchat" || lower == "!tc") {
        if(sender.teamchat == undefined) {
            sender.teamchat = true;
            msg(`§aチームチャット§bです`, [source]);
        } else if (sender.teamchat == true) {
            sender.teamchat = undefined;
            msg(`§gジェネラルチャット§bです`, [source]);
        }
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

        for(const player of gp()) {
            let flag = false;
            if(chatTarget.length==0) {
                flag = true;
            } else for(const tag of chatTarget) {
                if(player.hasTag(tag)) {
                    flag = true;
                    break;
                }
            }
            if(flag) msg(`${color}<${sender.nameTag}> §r${teamchat}${message}`, [player]);
        }
    }
    ev.cancel = true;
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
        }, 900)
        updateCooltime(source, 900, 20);
    }
})

//荒らし対策です-->
world.beforeEvents.playerPlaceBlock.subscribe((ev) => {
    const {itemStack, player} = ev;
    const l = player.location;
    if(!player.hasTag('build')) {
        c.runCommand(`tellraw ya75jp {"rawtext":[{"text":"§l§8≫ §c${player.nameTag} さんがブロックを置きました §7[${itemStack}, (${l.x}, ${l.y} ${l.z})]"}]}`);
        player.runCommand(`tag @s add kick`);
        ev.cancel = true;
    }
})
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    const {player} = ev;
    const l = player.location;
    if(!player.hasTag('build')) {
        c.runCommand(`tellraw ya75jp {"rawtext":[{"text":"§l§8≫ §c${player.nameTag} さんがブロックを壊しました §7[(${l.x}, ${l.y} ${l.z})]"}]}`);
        player.runCommand(`tag @s add kick`);
        ev.cancel = true;
    }
})
//<--
});