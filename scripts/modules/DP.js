import {world, system} from '@minecraft/server';
import { lazyFor, msg, wait, gp } from './utility_function';
import { AVLTree } from './avl';

export const DP = function(pre, singlePre, DPmanager) {
    this.res = new AVLTree();
    this.DPmanager = DPmanager;
    this.nowPre = pre;
    this.prePre = singlePre;
    this.parent = null;
    this.children = {};
    this.childPre = []; // childrenの接頭辞のみを集める

    this.output = () => {
        world.sendMessage(`output`);
        const f = (node) => {
            //const elm = node;
            msg(`[${node.key}, ${node.date}]`);
        }
        this.res.update(f);
        //lazyFor(f, 20, this.res.length);
    }
    
    this.set = (str, value) => {
        this.DPmanager.set(this.nowPre+str, value);
        //world.sendMessage(`${this.nowPre+str}: ${value}`);
        //for(const player of gp()) if(player.id == str) msg(`${value}`, [player])
    }

    this.setHelp = (str, value, update) => {
        const newPre = this.nowPre+str;
        if(update == undefined || update == true) world.setDynamicProperty(newPre, value);
        const nowValue = this.res.find(str);
        if(nowValue != undefined) this.res.delete(str);
        this.res.insert(str, value);
        if(this.parent !== null) this.parent.setHelp(this.prePre+str, value, false);
    }

    this.get = (str) => {
        const newPre = this.nowPre+str;
        return this.DPmanager.get(newPre);
    }
    
    this.getDP = (str) => {
        const res =  this.res.find(str)?.date;
        return res?res:0
    }

    this.add = (str, value) => {
        const nowValue = this.res.find(str)?.date;
        const v = value?value:0;
        if(nowValue != undefined) this.set(str, nowValue+v);
        else this.set(str, v);
    }

    this.remove = (str, value) => {
        this.add(str, -value);
    }

    this.clear = (str) => {
        this.set(str, undefined);
        this.res.delete(str);
    }

    this.clearAll = () => {
        const arr = [];
        const func = (node) => {
            //msg(`${node.property}`);
            arr.push(node.property);
        }
        this.res.update(func);
        for(const elm of arr) this.clear(elm);
    }
}

export const DPmanager = function() {
    const DPIds = world.getDynamicPropertyIds();
    this.manager = {};
    const base = new DP('', null, this);
    this.manager[''] = base;

    this.set = (str, value, update) => {
        let now = "", all = "", redume = [], address = this.manager[''];
        for(const p of str) {
            if(p != ':') now += p;
            else {
                all += now + ":";
                //world.sendMessage(all);
                if(address.children[now] == undefined) {
                    const dp = new DP(all, now+":", this);
                    address.children[now] = dp;
                    address.children[now].parent = address;
                    address.childPre.push(now+":");
                }
                address = address.children[now];
                now = "";
            }
        }
        if(update == undefined) update = true;
        address.setHelp(now, value, update);
    }

    const f = (i) => {
        const name = DPIds[i];
        this.set(name, world.getDynamicProperty(name), false);
    }
    lazyFor(f, 200, DPIds.length, () => {msg(`ダイナミックプロパティ§g読み込み完了！`)});

    this.get = (str) => {
        let now = "", all = "", address = this.manager[''];
        for(const p of str) {
            if(p != ':') now += p;
            else {
                all += now + ":";
                if(address.children[now] == undefined) { 
                    const dp = new DP(all, now+":", this);
                    address.children[now] = dp;
                    address.children[now].parent = address;
                    address.childPre.push(now+":");
                }
                address = address.children[now];
                now = "";
            }
        }
        return address;
    }

    this.add = (str, value) => {
        const nowValue = world.getDynamicProperty(str);
        if(nowValue == undefined) this.set(str, value);
        else this.set(str, nowValue+value);
    }

    this.remove = (str, value) => {
        this.add(str, -value);
    }

    this.clear = (str) => {
        this.set(str, undefined);
    }

    this.clearAll = () => {
        const f = (i) => {
            const name = DPIds[i];
            this.clear(name);
        }
        const lastF = () => {
            world.clearDynamicProperties();
            msg(`ダイナミックプロパティの内容を§aクリア§rしました`);
        }
        lazyFor(f, 200, DPIds.length, lastF);
    }

    this.getDP = (str) => {
        return world.getDynamicProperty(str);
    }

    this.output = () => {
        const base = this.get('');
        base.output();
    }
}