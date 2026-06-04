// 렌더링 순서를 확실하게 구분하기 위해 값을 정의해놓았습니다.
// 높은 순서일수록 나중에 렌더링됩니다. 예를 들어, UI 요소는 항상 월드 요소보다 나중에 렌더링되어야 하므로 UI_BASE는 WORLD_BASE보다 높은 값을 가집니다.
const WORLD_BASE = 0;
const WORLD_CAR = 10;
const WORLD_CAR_DIRT = 11;
const WORLD_LAPTOP = 20;
const WORLD_LAPTOP_SCREEN = 21;

const WASHGUN_GLASS = 200;
const WASHGUN_WATER = 201;
const WASHGUN_STREAM = 210;

const UI_BASE = 300;
const UI_BILLBOARD = 320;

export {
    WORLD_BASE,
    WORLD_CAR,
    WORLD_CAR_DIRT,
    WORLD_LAPTOP,
    WORLD_LAPTOP_SCREEN,
    WASHGUN_GLASS,
    WASHGUN_WATER,
    WASHGUN_STREAM,
    UI_BASE,
    UI_BILLBOARD,
};