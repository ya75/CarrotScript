import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from '@minecraft/server-ui';
import {AVLTree} from './modules/avl.js'; // AVLTreeについては、海外の方のモノをお借りした都合で、uploadはしません！

var c = world.getDimension("overworld"); // 記述を簡略化する為です

var carrots = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const clickItemId = "minecraft:compass";
const clickItemId2 = "minecraft:clock";
var rarmors = [];
var barmors = [];
var items = [];
var thro = [
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
    "minecraft:double_plant"
];
var roleName = [
    "§l§c兵士",
    "§l§g採掘者",
    "§l§6弓兵",
    "§l§a後継者",
    "§l§b剣士",
    "§l§2木こり",
    "§l§f白兎",
    "§l§d薬師",
    "§l§c格闘家",
    "§l§7骸骨",
    "§l§4暗殺者",
    "§l§j重剣士"
];
var star;
var berries;
var clock;
var magic;
var ruby;
var glow_berries = [];
var spawncarrot = [];
var spawncarrot2 = [];

function HoldItem(player) { // 今手にしているアイテムを返します
    return player.getComponent("inventory").container.getItem(player.selectedSlot);
}

function menu1(player) {
    var players = world.getPlayers();
    var playerl = [];
    var playerp = [];
    players.forEach((player) => {
        if(player.hasTag("join")){
            if(player.hasTag("red")) {
                playerl.push("§l§c"+player.nameTag);
                playerp.push(player.nameTag);
            } else if(player.hasTag("blue")) {
                playerl.push("§l§9"+player.nameTag);
                playerp.push(player.nameTag);
            }
        }
    })
    playerl.push("観戦をやめる");
    new ModalFormData()
    .title("観戦する人を、選んでください")
    .dropdown("観戦をやめる を選択で戻れます", playerl)
    .show(player).then((res) => {
        if(res.isCanceled == true) return;
        if(res.formValues[0]!=playerp.length) {
            var check = 0;
            try{check = c.runCommand(`testfor @a[name="${playerp[res.formValues[0]]}",tag=join]`).successCount} catch(e) {};
            if(check) {
                player.watch = playerp[res.formValues[0]];
                try{player.runCommand(`tellraw @s {"rawtext":[{"text":"§l§8≫ §7${playerl[res.formValues[0]]}さんを観戦します"}]}`)} catch(e) {};
                try{player.runCommand(`inputpermission set @s movement disabled`)} catch(e) {};
            } else return;
        } else {
            exitwatch(player);
            return;
        }
    })
}

function exitwatch(player) {
    try{player.runCommand(`tellraw @s {"rawtext":[{"text":"§l§8≫ §7観戦を終了しました"}]}`)} catch(e) {};
    player.watch = undefined;
    try{player.runCommand(`clear @s compass`)} catch(e) {};
    try{player.runCommand(`camera @s clear`)} catch(e) {};
    try{player.runCommand(`inputpermission set @s movement enabled`)} catch(e) {};
    try{player.runCommand(`tp @s 0 -48 0 0 0`)} catch(e) {};
    try{player.runCommand(`tag @s remove watch`)} catch(e) {};
}

function rad(deg) { // degree(度)で与えられた角度の情報を単位をradianにして返します
    return deg/180*Math.PI;
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
}

function resetCooltime(player) { // 死亡したときなどに、Cooltimeの更新を止めます
    try{player.runCommand(`scoreboard players set @s cooltime 0`)} catch(e) {};
    if(player.updatect!=undefined)system.clearRun(player.updatect);
    player.updatect = undefined;
}

function updataCooltime(player, tick, p) { // updateCooltimeの初期化(?)みたいなもので、本体はupdataCooltimeHelperの方です
    try{player.runCommand(`scoreboard players set @s cooltime ${Math.floor(tick/20)}`)} catch(e) {};
    updataCooltimeHelper(player, tick, p);
}

// クールタイムの表示を更新する為の関数です
// 引数はそれぞれ、更新する人、クールの長さ(tick)、更新するピッチ(tick)であり、tick%p==0 が入力の時点で保証されるものとします
function updataCooltimeHelper(player, tick, p) {
    let check = 0;
    try{check = player.runCommand(`scoreboard players set @s[scores={cooltime=${Math.floor(tick/20)}..}] cooltime ${Math.floor(tick/20)}`).successCount} catch(e) {}; // 例えば、クールタイムが死亡時に0にリセットされる。というシステムを実装したときに、この更新を継続させない為です
    if(tick>=p && check) player.updatect = system.runTimeout(function() {
        updataCooltimeHelper(player, tick-p, p);
    }, p)
    return;
}

function getRI(min, max) { // min以上max以下の整数を返します
    return min + Math.floor(Math.random() *(max-min+1));
}

function notTeam(p1, p2) { // ある2人の情報が与えられたときに、同じチームか?を返します
    if(p1==undefined || p2==undefined) return false;
    return !((p1.hasTag("red") && p2.hasTag("red")) || (p1.hasTag("blue") && p2.hasTag("blue")));
}

function tellraw(target, rawtext) { // tellrawを簡単にするために作りました 使用例です: tellraw("@a", `ぎゃー！`);
    try{c.runCommand(`tellraw ${target} {"rawtext":[{"text":"${rawtext}"}]}`)} catch(e) {};
}

function score(target, object) { // scoreを簡単に取得する為の関数です
    if(target.scoreboardIdentity==undefined) return 0;
    return world.scoreboard.getObjective(object).getScore(target.scoreboardIdentity);
}

function floor2(value) { // valueの絶対値があまりにも小さいときに、0とみなします
    if(value>0) return (value >= 0.0001) ? value : 0;
    else return (value <= -0.0001) ? value : 0;
}

world.afterEvents.itemUse.subscribe(({source, itemStack}) => {
    if(itemStack.typeId === clickItemId) { // コンパスです
        menu1(source);
    }
    else if(itemStack.typeId === clickItemId2 && source.hasTag("trick")) { // 時計です
        try{source.runCommand(`clear @s clock`)} catch(e) {};
        if(!source.pcount>=100) source.getComponent("inventory").container.addItem(clock);
        if(source.pasti!=undefined) if(source.pcount>=100) {
            source.tryTeleport(source.pasti.min().location, {rotation: source.pasti.min().rotate});
            source.pasti = undefined;
            source.pcount = undefined;
            updataCooltime(source, 300, 20);
            source.lclock = system.runTimeout(function() {
                source.getComponent("inventory").container.addItem(clock);
                source.lclock = undefined;
            }, 300)
            //tellraw("@a", `${source.lclock}`);
        }
    } else if(itemStack.typeId === "minecraft:dragon_breath" && source.hasTag("pharm")) { // 魔法のビンです
        var check = 0;
        try{check = source.runCommand(`testfor @s[hasitem={item=carrot,quantity=20..}]`).successCount} catch(e) {};
        if(check) {
            try{source.runCommand(`clear @s dragon_breath`)} catch(e) {};
            try{source.runCommand(`clear @s carrot 0 20`)} catch(e) {};
            source.getComponent("inventory").container.addItem(glow_berries[getRI(0, 2)]);
            updataCooltime(source, 300, 20);
            source.lcomp = system.runTimeout(function() {
                source.getComponent("inventory").container.addItem(magic);
                source.lcomp = undefined;
            }, 300) // comp の由来はcompounding です
        }
    } else if(source.hasTag("ansatu") && itemStack.typeId === "ya7:ruby") if(source.haigeki==undefined) { // ルビーです
        var players;
        if(source.hasTag("red")) players = world.getDimension("overworld").getPlayers({
            location: source.location,
            closest: 1,
            maxDistance: 9,
            excludeTags: ["red"]
        });
        if(source.hasTag("blue")) players = world.getDimension("overworld").getPlayers({
            location: source.location,
            closest: 1,
            maxDistance: 9,
            excludeTags: ["blue"]
        });
        if(players.length!=0) {
            var check = 0;
            const sourceRotation = players[0].getRotation();
            const theta = (-1)*rad(sourceRotation.y); // 水平方向の角度[rad]です
            let phi; // 下の探索が終わった時に、最終的に飛ぶ座標として、使います
            for(let ddir=0; ddir>=-45; ddir-=15) {
                phi = rad(ddir);
                for(let i=1; i<=4; i++) {
                    check = 0;
                    for(let j=0; j<thro.length; j++) {
                        // 視点の情報から三次元極座標の変換をして、飛べる座標の候補(0度, 15度, 30度, 45度の4通り)の探索をしています
                        try{check += players[0].runCommand(`testforblock ~${floor2((-1)*Math.sin(theta)*Math.cos(phi)*i)} ~${floor2((-1)*Math.sin(phi)*i+1)} ~${floor2((-1)*Math.cos(theta)*Math.cos(phi)*i)} ${thro[j]}`).successCount} catch(e) {};
                    }
                    if(!check) break;
                }
                if(check) break; // 今のddirの場所に飛べるなら(phiを今の値のままにする為に(?))打ち切ります
            }
            try{source.runCommand(`clear @s ya7:ruby`)} catch(e) {};
            if(!check) source.runCommand(`kill @s`); // もし候補が全て不可能なら自信をキルします
            else {
                players[0].runCommand(`tp @a[name="${source.nameTag}"] ~${floor2((-1)*Math.sin(theta)*Math.cos(phi)*2)} ~${floor2((-1)*Math.sin(phi)*2+1)} ~${floor2((-1)*Math.cos(theta)*Math.cos(phi)*2)} facing ~ ~1 ~`);
                const effects = source.getEffects();
                let value = -1;
                let duration = 0;
                for(let element of effects) { // 今ついているエフェクトを全て調べます
                    if(element.typeId=="strength") {
                        value = element.amplifier;
                        duration = element.duration;
                    }
                }
                source.runCommand(`effect @s strength 3 ${value+1} false`); // エフェクトを上書きする仕組みです
                if(value>=0 && duration>60) source.conPower = system.runTimeout(function() {
                    source.addEffect("strength", duration-60, {amplifier: value, showParticles: true}); // 3秒後、もともとついていたエフェクトに戻します
                    source.conPower = undefined;
                }, 60)
                source.haigeki = 1500;
                updataCooltime(source, 1500, 20);
                source.lruby = system.runTimeout(function() {
                    source.getComponent("inventory").container.addItem(ruby);
                    source.lruby = undefined;
                }, 1500)
            }
        }
    }
})

var heir;
var _match = 0;
system.runInterval(function() {
    for(let i=carrots.length-1; i>=0; i--) { // 納品するときに、インベントリに入るニンジンの数が高々2^12個なのを利用して、高速で処理しています
        try{c.runCommand(`execute as @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add "red_carrot" count ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s carrot ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add "blue_carrot" count ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`execute as @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] run scoreboard players add @s carrot ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`clear @a[tag=red,tag=redc,hasitem={item=carrot,quantity=${carrots[i]}..}] carrot 0 ${carrots[i]}`)} catch(e) {};
        try{c.runCommand(`clear @a[tag=blue,tag=bluec,hasitem={item=carrot,quantity=${carrots[i]}..}] carrot 0 ${carrots[i]}`)} catch(e) {};
    }
    
    try{c.runCommand(`execute as @a[tag=!redc,tag=!bluec] run scoreboard players reset @s catch_time`)} catch(e) {};
    try{c.runCommand(`execute as @a[tag=blue,tag=redc] if score "red_carrot" count matches 10.. run scoreboard players add @s catch_time 1`)} catch(e) {};
    try{c.runCommand(`execute as @a[tag=red,tag=bluec] if score "blue_carrot" count matches 10.. run scoreboard players add @s catch_time 1`)} catch(e) {};
    try{c.runCommand(`execute as @a[tag=blue,tag=redc,scores={catch_time=20}] if score "red_carrot" count matches 10.. run give @s carrot 10`)} catch(e) {};
    try{c.runCommand(`execute as @a[tag=red,tag=bluec,scores={catch_time=20}] if score "blue_carrot" count matches 10.. run give @s carrot 10`)} catch(e) {};
    try{c.runCommand(`execute as @a[tag=blue,tag=redc,scores={catch_time=20}] if score "red_carrot" count matches 10.. run scoreboard players remove "red_carrot" count 10`)} catch(e) {};
    try{c.runCommand(`execute as @a[tag=red,tag=bluec,scores={catch_time=20}] if score "blue_carrot" count matches 10.. run scoreboard players remove "blue_carrot" count 10`)} catch(e) {};
    try{c.runCommand(`execute as @a run scoreboard players operation @s catch_time %= "n20" num`)} catch(e) {};

    try{c.runCommand(`effect @a[tag=red,tag=redc] wither 0 0`)} catch(e) {};
    try{c.runCommand(`effect @a[tag=blue,tag=bluec] wither 0 0`)} catch(e) {};
    try{c.runCommand(`tag @a remove redc`)} catch(e) {};
    try{c.runCommand(`tag @a remove bluec`)} catch(e) {};
    if(c.runCommand(`scoreboard players test "gamerun" count 3 3`).successCount) _match++;
    heir = [];
    var players = world.getPlayers();
    players.forEach((player) => {
        if(player.hasTag("suc") && player.heir==undefined) {
            var check = 0;
            try{check = player.runCommand(`execute if score "gamerun" count matches 3 run testfor @s[hasitem={item=nether_star,quantity=0}]`).successCount} catch(e) {};
            if(check) heir.push(player); // ネザースターを使った(持っていない)場合、後継する人の候補に入れます
        }
        if(player.hasTag("fight")) { // 格闘家のダメージカウントです
            if(player.damagec==undefined) player.damagec=[];
            if(player.dc==undefined) player.dc = 0;
            if(_match-200>=0) {
                if(player.damagec[_match-200]!=undefined) {
                    player.dc -= player.damagec[_match-200];
                    player.damagec[_match-200] = undefined;
                }
            }
        }
        if(player.hasTag("hwarrior")) { //重戦士
            if(player.weight == undefined) player.weight = 0;
            const equips = player.getComponent("equipment_inventory");
            let count = 0;
            if(equips.getEquipment("chest") != undefined) count++;
            if(equips.getEquipment("legs") != undefined) count++;
            if(equips.getEquipment("feet") != undefined) count++;
            if(player.weight > count) player.runCommand(`effect @s slowness 0 0 true`);
            if(count > 0) player.runCommand(`effect @s slowness 1 ${count-1} true`);
            player.weight = count;
        }
        if(player.hasTag("ansatu")) { // 暗殺者の背襲のクールを減らします
            if(player.haigeki!=undefined) player.haigeki--;
            if(player.haigeki==0) player.haigeki = undefined;
        }
    })
    if(heir.length>=2) {
        for(let i=0; i<heir.length; i++) {
            heir[i].getComponent("inventory").container.addItem(star);
        } // 後継者の候補が2人以上の場合は、こっそりネザースターを返却しています
    } else if(heir.length==1) { // 後継者の候補が1人ならば、
        //players = world.getPlayers();
        players.forEach((player) => {
            if(player.hasTag("heired")) { // player.jsonファイルでインタラクトを受けた人にheiredタグを付けているので、それを使っています
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

}, 1);

system.runInterval(function() {
    var players = world.getPlayers(); // 白兎の時を戻す能力の部分です。ほとんどAVLTreeでの処理をしています
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
                player.pasti.insert(player.pcount, player.location, player.getRotation());
                player.pcount++;
                //let info = player.pasti.min();
                //try{player.runCommand(`tellraw @s {"rawtext":[{"text":"${info.key}, ${info.height}, {x: ${info.location.x}, y: ${info.location.y}, z:${info.location.z}}, {${info.rotate}}"}]}`)} catch(e) {};
            }
        }
    })
}, 1)

function int(value) { // 記述の簡略化の為です
    return Math.floor(value);
}

function hascarrot(player) { // hasitemを用いた二分探索で持っているニンジンの数を取得する関数です
    if(player.hasTag("join")) {
        var mi = 0;
        var ma = 2304;
        for(let i=0; i<12; i++) {
            var check = 0;
            var mid = int((mi+ma)/2);
            try{check = player.runCommand(`testfor @s[hasitem={item=carrot,quantity=${int(mid)}..}]`).successCount} catch(e) {};
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

system.runInterval(function() { // さきほどのhascarrot関数はここで使われています
    if(rarmors.length==0) prepare();
    var players = world.getPlayers();
    players.forEach((player) => {
        if(player.hasTag("join")) {
            try{player.runCommand(`scoreboard players set @s hascarrot ${hascarrot(player)}`)} catch(e) {};
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

var equip_slot = [
    "head",
    "chest",
    "legs",
    "feet"
]
system.afterEvents.scriptEventReceive.subscribe((ev) => {
    const {id, sourceEntity, message} = ev;
    switch(id) {
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
                        if(rarmors[sourceEntity.role][j]!=undefined) sourceEntity.getComponent("equipment_inventory").setEquipment(equip_slot[j], rarmors[sourceEntity.role][j]);
                    }
                    else if(sourceEntity.hasTag("blue")) {
                        if(barmors[sourceEntity.role][j]!=undefined) sourceEntity.getComponent("equipment_inventory").setEquipment(equip_slot[j], barmors[sourceEntity.role][j]);
                    }
                }
                for(let j=0; j<items[sourceEntity.role].length; j++) {
                    if(items[sourceEntity.role][j]!=undefined) sourceEntity.getComponent("inventory").container.addItem(items[sourceEntity.role][j]);
                }
        break;
        case 'ya7:role':
            sourceEntity.role = Number(message);
            try{sourceEntity.runCommand(`tellraw @s {"rawtext":[{"text":"§l§8≫ §7あなたは${roleName[Number(message)]}§7を選びました"}]}`)} catch(e) {};
        break;
        case 'ya7:reset':
            {
                _match = 0;
                try{c.runCommand(`camera @a clear`)} catch(e) {};
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
                    resetCooltime(player);
                })
            }
        break;
        case 'ya7:carrot':
            const l = message.split(' ');
            try{c.spawnItem(spawncarrot[getRI(1, 4)], {x: Number(l[0]), y: Number(l[1]), z: Number(l[2])})} catch(e) {};
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
                system.runTimeout(function() {
                    sourceEntity.getComponent("inventory").container.addItem(ruby);
                }, 100)
            }
        break;
    }
});

world.afterEvents.entityDie.subscribe((ev) => {
    const {damageSource, deadEntity} = ev;
    try{deadEntity.runCommand(`scoreboard players set @s death_time 100`)} catch(e) {};
    try{deadEntity.runCommand(`tag @s add death`)} catch(e) {};
    try{deadEntity.runCommand(`tag @s add in_lobby`)} catch(e) {};
    const dd = damageSource.damagingEntity;
    var ddl = "";
    var del = "";
    let l;
    if(deadEntity!=undefined) return;
    if(deadEntity.hasTag("red")) del = "§c";
    else if(deadEntity.hasTag("blue")) del = "§9";
    if(deadEntity.typeId=="minecraft:player") {
        l = deadEntity.location;
        if(dd!=undefined) {
            if(dd.nameTag != deadEntity.nameTag) if(notTeam(dd, deadEntity)) {
                try{dd.runCommand(`scoreboard players add @s kill 1`)} catch(e) {};
                if(dd.hasTag("red")) ddl = "§c";
                else if(dd.hasTag("blue")) ddl = "§9";
            }
        } else if(deadEntity.ld!=undefined) {
            try{c.runCommand(`scoreboard players add @a[name="${deadEntity.ld}"] kill 1`)} catch(e) {};
            if(deadEntity.hasTag("red")) ddl = "§9";
            else if(deadEntity.hasTag("blue")) ddl = "§c";
        }
        try{deadEntity.runCommand(`scoreboard players add @s death 1`)} catch(e) {};
        let count = 0;
        for(let i=carrots.length-1; i>=0; i--) {
            let check = false;
            try{check = c.runCommand(`testfor @a[name="${deadEntity.nameTag}",hasitem={item=carrot,quantity=${carrots[i]}..}]`).successCount} catch(e) {};
            if(check) {
                count+=carrots[i];
                try{deadEntity.runCommand(`clear @s carrot 0 ${carrots[i]}`)} catch(e) {};
            }
        }
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

            for(let i=0; i<36; i++) {
                if(count>=65) {
                    count-=64;
                    try{c.spawnItem(spawncarrot2[6], {x: l.x, y: l.y, z: l.z})} catch(e) {}; //spawncarrot2[6]は64個のニンジンのデータ
                } else break;
            }
            for(let i=6; i>=0; i--) {
                if(count>=carrots[i]) {
                    count-=carrots[i];
                    try{c.spawnItem(spawncarrot2[i], {x: l.x, y: l.y, z:l.z})} catch(e) {}; //spawncarrot2[i]は2^i個のニンジンのデータ
                }
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
    if(deadEntity.lclock!=undefined) {
        system.clearRun(deadEntity.lclock);
        deadEntity.lclock= undefined;
    }
    if(deadEntity.lberries!=undefined) {
        system.clearRun(deadEntity.lberries);
        deadEntity.lberries= undefined;
    }
    if(deadEntity.lcomp!=undefined) {
        system.clearRun(deadEntity.lcomp);
        deadEntity.lcomp= undefined;
    }
    if(deadEntity.lruby!=undefined) {
        system.clearRun(deadEntity.lruby);
        deadEntity.lruby= undefined;
    }
    if(deadEntity.conPower!=undefined) {
        system.clearRun(deadEntity.conPower);
        deadEntity.conPower= undefined;
    }
    try{c.spawnItem(spawncarrot[getRI(5, 8)], {x: l.x, y: l.y, z: l.z})} catch(e) {};
    try{deadEntity.runCommand(`clear @s clock`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:sweet_berries`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:glow_berries1`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:glow_berries2`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:glow_berries3`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s dragon_breath`)} catch(e) {};
    try{deadEntity.runCommand(`clear @s ya7:ruby`)} catch(e) {};

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
    resetCooltime(deadEntity);
})

world.afterEvents.entityHurt.subscribe((ev) => {
    const {damageSource, hurtEntity, damage} = ev;
    const dd = damageSource.damagingEntity;
    const dcause = damageSource.cause;
    var useditem = undefined;
    if(hurtEntity.hasTag("fight") && (dcause == "entityAttack" || dcause == "projectile")) {
        if(hurtEntity.damagec[_match] == undefined) hurtEntity.damagec[_match] = damage;
        else hurtEntity.damagec[_match] += damage; // ダメージが1tick中に二度当たる可能性を考慮しています;
        hurtEntity.dc += damage;
    }
    if(hurtEntity.hasTag("ansatu") && !(dcause == "entityAttack" || dcause == "projectile" || dcause == "fall")) {
        hurtEntity.runCommand(`kill @s`);
    }
    
    if(dd!=undefined) {
        if(notTeam(dd, hurtEntity)) hurtEntity.ld = dd.nameTag;
        let GI = dd.getComponent("inventory").container.getItem(dd.selectedSlot)
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
                let b = world.getDimension("overworld").getBlock({x: l.x, y: l.y, z: l.z}).typeId;
                for(let j=0; j<thro.length; j++) {
                    if(thro[j]==b) {
                        br = false;
                    }
                }
                if(br) {
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
                if(player.nameTag!=hurtEntity.nameTag) {
                    player.rangeA = true;
                    player.applyDamage(2, {cause: "entityAttack", damagingEntity: dd});
                }
            })} catch(e) {};
        } else if(useditem=="ya7:iron_sword" && dd.hasTag("trick")) {
            if(getRI(0, 3)==0 && notTeam(hurtEntity, dd)) hurtEntity.setOnFire(3, true);
        } else if(notTeam(hurtEntity, dd) && dd.hasTag("fight")) {
            hurtEntity.applyDamage(Math.floor(dd.dc), {cause: "entityAttack"});
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

world.afterEvents.itemReleaseUse.subscribe((ev) => {
    if(ev.itemStack.typeId=="minecraft:bow") {
        try{ev.source.runCommand(`clear @s arrow`)} catch(e) {};
        if(ev.source.hasTag("archer")) {
            updataCooltime(ev.source, 40, 20);
            system.runTimeout(function() {
                try{ev.source.runCommand(`execute if score "gamerun" count matches 3 run give @s arrow 1 0 {"item_lock":{"mode":"lock_in_inventory"}}`)} catch(e) {};
            }, 40)
        } else if(ev.source.hasTag("warrior")) {
            updataCooltime(ev.source, 60, 20);
            system.runTimeout(function() {
                try{ev.source.runCommand(`execute if score "gamerun" count matches 3 run give @s arrow 1 0 {"item_lock":{"mode":"lock_in_inventory"}}`)} catch(e) {};
            }, 60)
        }
    }
})

// 剣士のベリーの回復はここでしています
world.afterEvents.itemCompleteUse.subscribe((ev) => {
    const {itemStack, source, useDuration} = ev;
    if(itemStack.typeId=="ya7:sweet_berries") {
        source.lberries = system.runTimeout(function() {
            source.getComponent("inventory").container.addItem(berries);
        }, 1200)
        updataCooltime(source, 1200, 20);
    }
})
