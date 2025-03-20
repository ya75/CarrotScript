export class vector {
    constructor(a, b, c) {
        if(b == undefined && c == undefined) {
            this.x = a.x;
            this.y = a.y;
            this.z = a.z;
        } else { 
            this.x = a;
            this.y = b;
            this.z = c;
        }
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    added(v) {
        const res = new vector(this);
        return res.add(v);
    }

    remove(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    removed(v) {
        const res = new vector(this);
        return res.remove(v);
    }

    scale(k) {
        this.x *= k;
        this.y *= k;
        this.z *= k;
        return this;
    }

    scaled(k) {
        return new vector(this).scale(k);
    }

    dot(v) {
        return this.x*v.x+this.y*v.y+this.z*v.z;
    }
    
    norm() {
        return Math.sqrt(this.dot(this));
    }

    normalize() {
        const norm = this.norm();
        if(norm == 0) return undefined;
        return new vector(this.x/norm, this.y/norm, this.z/norm);
    }

    reverse() {
        return this.scale(-1);
    }

    cross(v) {
        return new vector(this.y*v.z-this.z*v.y, this.z*v.x-this.x*v.z, this.x*v.y-this.y-v.x);
    }

    toString(digit){
        if(digit == undefined) digit = 9;
        const res = `[${this.x.toFixed(digit)}, ${this.y.toFixed(digit)}, ${this.z.toFixed(digit)}]`;
        return res;
    }

    e() {
        const ex = new vector(this.x < 0 ? -1 : 1, 0, 0);
        const ey = new vector(0, this.y < 0 ? -1 : 1, 0);
        const ez = new vector(0, 0, this.z < 0 ? -1 : 1);
        return [ex, ey, ez];
    }

    lMt(Mt) {
        const res = new vector(this.x*Mt.a[0][0]+this.y*Mt.a[0][1]+this.z*Mt.a[0][2], this.x*Mt.a[1][0]+this.y*M.a[1][1]+this.z*Mt.a[1][2], this.x*Mt.a[2][0]+this.y*Mt.a[2][1]+this.z*Mt.a[2][2]);
        this.x = res.x;
        this.y = res.y;
        this.z = res.z;
        return this;
    }

    lMted(Mt) {
        return new vector(this).lMt(Mt);  
    }

    rotateCalc(v, rad, pole) {
        const res = new vector(v);
        res[pole[0]] = v[pole[0]];
        res[pole[1]] = v[pole[1]]*Math.cos(rad)+v[pole[2]]*Math.sin(rad);
        res[pole[2]] = -v[pole[1]]*Math.sin(rad)+v[pole[2]]*Math.cos(rad);
        v.x = res.x;
        v.y = res.y;
        v.z = res.z;
    }

    rotateHelper(v, center, rad, pole) {
        const res = v;
        res.remove(center);
        this.rotateCalc(res, rad, pole);
        res.add(center);
        return res;
    }

    rotateX(center, rad) { return this.rotateHelper(this, center, rad, ["x", "y", "z"]); }
    rotateY(center, rad) { return this.rotateHelper(this, center, rad, ["y", "z", "x"]); }
    rotateZ(center, rad) { return this.rotateHelper(this, center, rad, ["z", "x", "y"]); }
    rotatedX(center, rad) { return (new vector(this)).rotateX(center, rad); }
    rotatedY(center, rad) { return (new vector(this)).rotateY(center, rad); }
    rotatedZ(center, rad) { return (new vector(this)).rotateZ(center, rad); }
}

export class rot {
    constructor(a, b) {
        if(b==undefined) {
            this.x = a.x;
            this.y = a.y;
        } else {
            this.x = a;
            this.y = b;
        }
    }
}