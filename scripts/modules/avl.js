///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//This source code refers to https://learnersbucket.com/tutorials/data-structures/avl-tree-in-javascript/#google_vignette//
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const Node = function(key, p) {
    this.key = key;
    this.height = 1;
    this.date = p;
    this.left = null;
    this.right = null;
}

export const AVLTree = function() {
    let root = null;

    this.height = (v) => {
        if(v===null) {
            return 0;
        }
        return v.height;
    }

    this.rightRotate = (y) => {
        let x = y.left;
        let T2 = x.right;
        x.right = y;
        y.left = T2;
        y.height = Math.max(this.height(y.left), this.height(y.right))+1;
        x.height = Math.max(this.height(x.left), this.height(x.right))+1;
        return x;
    }

    this.leftRotate = (x) => {
        let y= x.right;
        let T2 = y.left;
        y.left = x;
        x.right = T2;
        x.height = Math.max(this.height(x.left), this.height(x.right))+1;
        y.height = Math.max(this.height(y.left), this.height(y.right))+1;
        return y;
    }

    this.getBalanceFactor = (v) => {
        if(v == null) {
            return 0;
        }
        return this.height(v.left)-this.height(v.right);
    }

    const insertNodeHelper = (node, key, p) => {
        if(node == null) return (new Node(key, p));

        if(key < node.key) {
            node.left = insertNodeHelper(node.left, key, p);
        } else if (key > node.key) {
            node.right = insertNodeHelper(node.right, key, p);
        } else return node;

        node.height = 1+Math.max(this.height(node.left), this.height(node.right));

        let balanceFactor = this.getBalanceFactor(node);

        if(balanceFactor > 1) {
            if(key < node.left.key) {
                return this.rightRotate(node);
            } else if (key > node.left.key) {
                node.left = this.leftRotate(node.left);
                return this.rightRotate(node);
            }
        }

        if(balanceFactor < -1) {
            if(key > node.right.key) {
                return this.leftRotate(node);
            } else if (key < node.right.key) {
                node.right = this.rightRotate(node.right);
                return this.leftRotate(node);
            }
        }
        return node;
    }

    this.insert = (key, p) => {
        root = insertNodeHelper(root, key, p);
    }

    this.nodeWithMinium = (node) => {
        let now = node;
        while(now.left != null) {
            now = now.left;
        }
        return now;
    }

    const deleteNodeHelper = (root, key) => {
        if(root == null) return root;
        if(key < root.key) {
            root.left = deleteNodeHelper(root.left, key);
        } else if(key > root.key) {
            root.right = deleteNodeHelper(root.right, key)
        } else {
            if(root.left == null || root.right==null) {
                let temp = null;
                if(temp == root.left) temp = root.right;
                else temp = root.left;

                if(temp == null) {
                    temp == root;
                    root = null;
                } else root = temp;
            } else {
                let temp = this.nodeWithMinium(root.right);
                root.key = temp.key;
                root.right = deleteNodeHelper(root.right, temp.key);
            }
        }
        if(root==null) return root;

        root.height = Math.max(this.height(root.left), this.height(root.right))+1;
        let balanceFactor = this.getBalanceFactor(root);
        if(balanceFactor > 1) {
            if(this.getBalanceFactor(root.left) >= 0) {
                return this.rightRotate(root);
            } else {
                root.left = this.leftRotate(root.left);
                return this.rightRotate(root);
            }
        }
        if(balanceFactor < -1) {
            if(this.getBalanceFactor(root.right) <= 0) {
                return this.leftRotate(root);
            } else {
                root.right = this.rightRotate(root.right);
                return this.leftRotate(root);
            }
        }
        return root;
    }

    this.delete = (key) => {
        root = deleteNodeHelper(root, key)
    }

    this.find = (key) => {
        if(key==undefined) return undefined;
        let now = root;
        if(now === null) return undefined;
        while(now.key != key) {
            if(now.key>=key) {
                if(now.left === null) return undefined;
                now = now.left;
            } else {
                if(now.right === null) return undefined;
                now = now.right;
            }
        }
        return now;
    }

    this.min = () => {
        let now = root;
        if(now==null) return undefined;
        while(now.left !== null) {
          now = now.left;
        }
        return now;
    }

    this.max = () => {
        let now = root;
        if(now==null) return undefined;
        while(now.right != null) {
            now = now.right;
        }
        return now;
    }

    this.length = () => {
        if(root===null) return 0;
        return lengthHelper(root);
    }

    const lengthHelper = (node) => {
        let count = 1;
        if(node.left === null && node.right === null) return 1;
        if(node.left !== null) {
            count += lengthHelper(node.left);
        }
        if(node.right !== null) {
            count += lengthHelper(node.right);
        }
        return count;
    }

    this.update = (_func) => {
        updateHelper(root, _func);
    }

    const updateHelper = (node, _func) => {
        if(node) {
            _func(node);
            updateHelper(node.left, _func);
            updateHelper(node.right, _func);
        }
    }

    this.preOrder = () => {
        preOrderHelper(root);
    }

    const preOrderHelper = (node) => {
        if(node) {
            console.log(node.key, node.date, node.rotate);
            preOrderHelper(node.left);
            preOrderHelper(node.right);
        }
    }
}

/*let tree = new AVLTree();
tree.insert(1, {x: 2, y: 8, z: 1}, {x: 5, y:10});
tree.preOrder();
tree.delete(1);*/

/*let tree = new AVLTree();
tree.insert(1, {x: 5, y: 7, z: 3}, {x: 9, y:8});
tree.insert(2, {x: 0, y: 2, z: 4}, {x: 7, y:2});
tree.insert(3, {x: 2, y: 8, z: 1}, {x: 5, y:10});
tree.insert(4, {x: 8, y: 7, z: 5}, {x: 4, y:7});
tree.insert(5, {x: 2, y: 8, z: 1}, {x: 5, y:10});
tree.preOrder();
console.log(tree.min().rotate);*/