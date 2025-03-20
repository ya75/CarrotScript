import { world, system } from "@minecraft/server";

let Random = [];

export const random = function() {
    const a = 48271;
    const m = 2147483647;
    let seed = (((new Date()).getTime())%m+m)%m;
    //線形合同法による乱数生成-->
    //このサイトを参考にしました https://computing2.vdslab.jp/docs/random/lcg
    
    Random.push(this);
    this.random = () => {
        const q = Math.floor(m/a);
        const r = m%a;
        const hi = Math.floor(seed/q);
        const lo = seed%q;
        const test = a*lo -r*hi;
        if(test>0) seed = test;
        else seed = test+m;
        return seed/m;
    }

    this.get = () => {
        return this.random();
    }

    this.getInt = (min, max) => {
        this.random();
        return min+Math.floor(this.random()*(max-min+1));
    }

    this.getPlayers = (target) => {
        return this.randomPerm(world.getPlayers(target == undefined? {}: target));
    }

    this.randomPerm = (array) => {
        let res = [];
        for(const elm of array) res.push({key: elm, value: this.random()});
        
        res.sort((a, b) => {
            if(a.value < b.value) return 1;
            else return 0;
        })

        let res2 = [];
        for(const elm of res) res2.push(elm.key);
        return res2;
    }

    this.elm = (array) => {
        return array[this.getInt(0, array.length-1)];
    }
}

system.runInterval(() => {
    for(const elm of Random) {
        elm.random();
    }
}, 1)