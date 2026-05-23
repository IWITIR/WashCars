// Rapier's collision groups are defined as bitmasks.
// channel belongs to: first 16 bit
// channel collides with: second 16 bit

const GROUP_PLAYER = 0x0001;
const GROUP_STATICMESH = 0x0002;
const GROUP_INTERACTABLE = 0x0004;
const GROUP_WASH = 0x0008;

const collisionNone = 0x00000000;
const collisionALL = 0xFFFFFFFF;
const collisionPlayer = 
    GROUP_PLAYER << 16 | GROUP_STATICMESH | GROUP_INTERACTABLE; 

const collisionSM = 
    GROUP_STATICMESH << 16 | GROUP_PLAYER | GROUP_INTERACTABLE;

const collisionWash = 
    GROUP_WASH << 16 | GROUP_STATICMESH | GROUP_INTERACTABLE;

const collisionInteractable =
    GROUP_INTERACTABLE << 16 | GROUP_PLAYER | GROUP_WASH | GROUP_STATICMESH;


export { 
    collisionALL, 
    collisionPlayer, 
    collisionSM,
    collisionWash, 
    collisionInteractable
};
