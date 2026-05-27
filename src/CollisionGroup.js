// Rapier's collision groups are defined as bitmasks.
// channel belongs to: first 16 bit
// channel collides with: second 16 bit

const GROUP_PLAYER = 0x0001;
const GROUP_STATICMESH = 0x0002;
const GROUP_INTERACTABLE = 0x0004;

const collisionNone = 0x00000000;
const collisionALL = 0xFFFFFFFF;
const collisionPlayer =
    GROUP_PLAYER << 16 | GROUP_STATICMESH;

const collisionSM =
    GROUP_STATICMESH << 16 | GROUP_PLAYER;


export {
    collisionALL,
    collisionNone,
    collisionPlayer,
    collisionSM,
};
