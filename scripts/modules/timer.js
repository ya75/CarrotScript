import {world, system} from '@minecraft/server';

let now = 0;

export const timer = function(time = 0) {
    this.time = time;
    this.called = now;
    this.delta = 1;
    this.pre = this.time-this.delta;

    this.get = () => {
        const res = this.time+this.delta*(now-this.called);
        return Math.max(res, 0);
    }

    this.up = (time=this.get()) => {
        this.time = time;
        this.delta = 1;
        this.called = now;
        return this;
    }
    
    this.down = (time=this.get()) => {
        this.time = time;
        this.delta = -1;
        this.called = now;
        return this;
    }

    this.stop = (time=this.get()) => {
        this.time = time;
        this.delta = 0;
        this.called = now;
        return this;
    }

    this.set = (time=this.time) => {
        this.time = time;
        this.called = now;
        return this;
    }
    
    this.sc = () => {
        if(this.delta == 0) return false;
        return (this.get()%20 == 0);
    }

    this.det = () => {
        let tmp  = this.get();
        const tick = tmp%20; tmp/=20; tmp = Math.floor(tmp);
        const sec = tmp%60; tmp/=60; tmp = Math.floor(tmp);
        const min = tmp%60; tmp/=60; tmp = Math.floor(tmp);
        const hour = tmp;
        return [tick, sec, min, hour]; 
    }

    this.tos = () => {
        const [tick, sec, min, hour] = this.det();
        return [('00'+tick).slice(-2), ('00'+sec).slice(-2), ('00'+min).slice(-2), ('000'+hour).slice(-3)];
    }
}

system.runInterval(() => {
    now++;
}, 1)