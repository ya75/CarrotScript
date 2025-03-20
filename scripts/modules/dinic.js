export const edge = function(to, cap, rev) {
    this.to = to;
    this.cap = cap;
    this.rev = rev;
}
  
export const queue = function() {
    let head = 0;
    let tail = 0;
    let max = 1100100;
    let q = [];
  
    this.size = () => {
        if(tail >= head) return tail-head;
        else return tail+max-head;
    }
  
    this.front = () => {
        return q[head];
    }

    this.back = () => {
        return q[(tail-1+max)%max];
    }
  
    this.pop = () => { // pop_front
        if(head == tail) return;
        head = (head+1)%max; // head -> tail
    }
  
    this.push = (x) => { // push_back
        if(head == (tail+1)%max) console.log("Error: queue is full.");
        else {
            q[tail] = x;
            tail = (tail+1)%max; // head [tail] ->
        }
    }

    this.pop_back = () => {
        if(head == tail) return;
        tail = (tail-1+max)%max; // head <- tail
    }

    this.push_front = (x) => {
        if(tail == (head-1+max)%max) console.log("Error: queue is full.");
        else {
            head = (head-1+max)%max; // <- [head] tail
            q[head] = x;
        }
    }
  
    this.empty = () => {
        if(head == tail) return true;
        else return false;
    }

    this.clear = () => {
        head = tail;
    }
}
  
export const mf_graph = function(n) {
    const INF = 1e9;
  
    this.n = n;
    this.G = [];
    for(let i=0; i<this.n; i++) this.G[i] = [];
    this.level = [];
    this.iter = [];
  
    this.add_edge = (from, to, cap) => {
        this.G[from].push(new edge(to, cap, this.G[to].length));
        this.G[to].push(new edge(from, 0, this.G[from].length-1));
    }
  
    this.bfs = (s) => {
        for(let i=0; i<this.n; i++) this.level[i] = -1;
        const que = new queue();
        this.level[s] = 0;
        que.push(s);
        while(!que.empty()) {
            let v = que.front(); que.pop();
            world.sendMessage(`${v}`);
            for(let i=0; i<this.G[v].length; i++) {
                const e = this.G[v][i];
                if(e.cap > 0 && this.level[e.to] < 0) {
                    this.level[e.to] = this.level[v] +1;
                    que.push(e.to);
                }
            }
        }
    }
  
    this.dfs = (v, t, f) => {
        if(v == t) return f;
        for(; this.iter[v] < this.G[v].length; this.iter[v]++) {
            const e = this.G[v][this.iter[v]];
            if(e.cap > 0 && this.level[v] < this.level[e.to]) {
                let d = this.dfs(e.to, t, Math.min(f, e.cap));
                if(d > 0) {
                    e.cap -= d;
                    this.G[e.to][e.rev].cap += d;
                    return d;
                }
            }
        }
        return 0;
    }
  
    this.max_flow = (s, t) => {
        let flow = 0;
        for(;;) {
            this.bfs(s);
            if(this.level[t] < 0) return flow;
            for(let i=0; i<n; i++) this.iter[i] = 0;
            let f;
            while((f = this.dfs(s, t, INF)) > 0) {
                flow += f;
            }
        }
    }
  }