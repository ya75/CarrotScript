import {world, system} from '@minecraft/server';
import {ActionFormData, ModalFormData, MessageFormData} from '@minecraft/server-ui';
import { box } from './utility_function';
import { vector } from './vector';

const causeMap = {1: "§a設置者", 2: "§b編集φ", 3: "§c破壊", 4: "§6ロック中の破壊", 5: "§gロック", 6: "§dロック解除"};
let DP = null;
export const commandBlockTracker = function(DPmanager) {
    this.DPmanager = DPmanager;
    this.cnt = this.DPmanager.getDP('commandBlockTracker:cnt');
    this.DPcbt = this.DPmanager.get('commandBlockTracker:');
    DP = DPmanager;

    this.show = (player) => {
        const form = new ActionFormData();
        form.title('調べるコマンドブロックを選んでください');
        //world.sendMessage(`${JSON.stringify(this.DPcbt.childPre.length)}`);
        /*this.DPcbt.childPre.sort((a, b) => {
            const dateA = this.DPcbt.get(a);
            const dateB = this.DPcbt.get(b);
            if(dateA.getDP('UpperDigit') < dateB.getDP('UpperDigit')) return 1;
            else if(dateA.getDP('UpperDigit') == dateB.getDP('UpperDigit') && dateA.getDP('LowerDigit') <= dateB.getDP('LowerDigit')) return 1;
            return 0;
        })*/
        
        for(const name of this.DPcbt.childPre) {
            const DPcbti = this.DPcbt.get(name);
            const date = DPcbti.getDP('lastUpdate');
            form.button(`最終更新[${date}]`);
        }
        
        function ToVector(str) {
            //world.sendMessage(`${str}`);
            const str2 = str.replace(/:$/g, "");
            const array = JSON.parse(str2); 
            const res = new vector(array[0]+0.5, array[1]+1, array[2]+0.5);
            //world.sendMessage(`${JSON.stringify(res)}`);
            return res;
        }
        form.button(`戻る`);
        form.show(player).then((res) => {
            if(res.selection == this.cnt) return;
            const DPcbti = this.DPcbt.get(this.DPcbt.childPre[res.selection]);
            const func = (player) => {
                const form2 = new ActionFormData().title('コマンドブロック情報');
                let str = `§l場所 ${this.DPcbt.childPre[res.selection].replace(/\,/g, ", ").replace(/:$/g, "")}§r\n`;
                const DPcbtiNum = DPcbti.getDP('num');
                for(let j=0; j<DPcbtiNum; j++) {
                    const DPcbtij = DPcbti.get(String(j+1)+':');
                    const name = DPcbtij.getDP('name');
                    const cause = DPcbtij.getDP('case');
                    const time = DPcbtij.getDP('time');
                    str += `${causeMap[cause]} ${name} ${time}\n`;
                }
                form2.body(str);
                form2.button('コマブロへtp');
                form2.button('戻る');
                form2.show(player).then((res2) => {
                    if(res2.selection == 0) player.tryTeleport(ToVector(this.DPcbt.childPre[res.selection]));
                    else this.show(player);
                })
            }
            func(player);
        });
    }
}

function f(str) {
    const res = str.replace(/\"\D\"\:/g, "").replace(/^\{/, "[").replace(/\}$/, "]");
    return res;
}

function addInfo(player, block, cause) {
    let type = -1;
    switch(block.typeId) {
        case 'minecraft:command_block': type=0;
        case 'minecraft:chain_command_block': type=1;
        case 'minecraft:repeating_command_block': type=2;
    }
    if(type == -1) return; //world.sendMessage(`${block.typeId}`);
    const d = new Date();
    d.setHours(d.getHours()+9);
    d.setMonth(d.getMonth()+1);
    const DPcbt = DP.get('commandBlockTracker:');
    const loc = f(JSON.stringify(block.location));
    const DPcbti = DPcbt.get(loc+':');
    
    const dstr = `${d.getFullYear()}年${d.getMonth()}月${d.getDate()}日 ${d.getHours()}時${d.getMinutes()}分${d.getSeconds()}秒`;
    DPcbti.set(`lastUpdate`, dstr);
    const upperStr = `${d.getFullYear()}${d.getMonth()}${d.getDate()}`, upperNum = Number(upperStr);
    const lowerStr = `${d.getHours()}${d.getMinutes()}${d.getSeconds()}`, lowerNum = Number(lowerStr);
    DPcbti.set(`UpperDigit`, upperNum);
    DPcbti.set(`LowerDigit`, lowerNum);
    DPcbti.add('num', 1);
    const num = DPcbti.getDP('num');

    const DPcbtij = DPcbti.get(`${String(num)}:`);
    const name = player.name;
    DPcbtij.set('name', name);
    DPcbtij.set('time', dstr);
    if(cause == 3) {
        const lockMode = DPcbti.getDP('lock');
        if(lockMode) {
            cause = 4;
            player.sendMessage(`このコマンドブロックは§6ロック中§rです`);
        }
    }
    if(cause == 5) {
        if(DPcbti.getDP('lock') == undefined) DPcbti.set('lock', false);
        const lockMode = DPcbti.getDP('lock');
        if(lockMode == false) {
            cause = 5;
            player.sendMessage('コマンドブロックを§aロック§rしました');
        } else {
            cause = 6;
            player.sendMessage('コマンドブロックのロックを§c解除§rしました');
        }
        DPcbti.set('lock', !lockMode);
    }
    DPcbtij.set('case', cause);
    return DPcbti.getDP('lock');
}

function HoldItem(player) {
    return player.getComponent("inventory").container.getItem(player.selectedSlotIndex);
}

world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
    const { player, block, itemStack } = ev;
    if(/*!player.isOP() ||*/ player.getGameMode() != 'creative') return;
    else addInfo(player, block, 2);
});

world.afterEvents.playerPlaceBlock.subscribe((ev) => {
    const{player, block} = ev;
    addInfo(player, block, 1);
})

world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    const {player, block, itemStack} = ev;
    if(itemStack?.typeId == 'minecraft:stick') {
        if(addInfo(player, block, 5) != undefined) ev.cancel = true;
    } else {
        const res = addInfo(player, block, 3);
        if(res) ev.cancel = true;
    }
})

system.runInterval(() => {
    for(const player of world.getPlayers()) {
        if(player.getGameMode() == 'creative') {
            if(HoldItem(player)?.typeId == 'minecraft:stick') {
                const v = new vector(player.location), range = 3;
                for(let x = v.x-range; x<=v.x+range; x++) {
                    for(let y = v.y-range; y<v.y+range; y++) {
                        for(let z = v.z-range; z<v.z+range; z++) {
                            const str = `[${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}]:`;
                            const u = new vector(x, y, z);
                            const DPcbt = DP.get("commandBlockTracker:");
                            const DPcbti = DPcbt.get(str);
                            if(DPcbti.getDP('lock')) {
                                box(u, player);
                            }
                        }
                    }
                }
            }
        }
    }
}, 4);