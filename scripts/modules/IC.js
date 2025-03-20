import {world, system} from '@minecraft/server';
import { AVLTree } from './avl';

export const InteractCanceler = function() {
}

const avl = new AVLTree();
const arr = [
    "spruce_trapdoor",
    "pale_oak_trapdoor"
];
for(const elm of arr) avl.insert("minecraft:"+elm);
world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
    const {player, block, itemStack} = ev;
    if(player.hasTag('join')) ev.cancel = true;
    if(player.hasTag('op') && player.getGameMode() == 'creative') return;
    if(avl.find(block.typeId) != undefined) ev.cancel = true;
});