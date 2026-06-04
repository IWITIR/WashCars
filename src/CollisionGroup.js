// RAPIER의 충돌 마스크 설정입니다.
// 첫 16비트가 현재 그룹, 뒤 16비트가 충돌할 그룹입니다.

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
