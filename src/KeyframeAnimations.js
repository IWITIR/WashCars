import * as THREE from 'three';

// 차고 문, 차 이동, 연료 보충 애니메이션(AnimationsClip)을 생성하는 함수들과 애니메이션을 재생하는 함수입니다.
export const GARAGE_DOOR_MOVE_DURATION = 1.1;
export const CAR_MOVE_DURATION = 2.2;
export const RELOAD_DURATION = 0.85;

const DEFAULT_SAMPLE_COUNT = 12;
const RELOAD_SAMPLE_COUNT = 20;
const RELOAD_MOTION_END = 0.65;
const RELOAD_OUT_END = 0.25;
const RELOAD_IN_START = 0.35;
const RELOAD_IN_DURATION = 0.3;
const RELOAD_FILL_START = 0.65;
const RELOAD_FILL_DURATION = 0.35;

// 차고문이 움직이는 애니메이션 클립을 생성합니다. fromY와 toY는 차고문의 시작과 끝 Y좌표입니다.
export function createGarageDoorMoveClip(fromY, toY, basePosition) {
    return createPositionClip(
        'garageDoorMove',
        new THREE.Vector3(basePosition.x, fromY, basePosition.z),
        new THREE.Vector3(basePosition.x, toY, basePosition.z),
        GARAGE_DOOR_MOVE_DURATION
    );
}

// 차가 움직이는 애니메이션 클립을 생성합니다. from과 to는 차의 시작과 끝 위치입니다.
export function createCarMoveClip(from, to) {
    return createPositionClip('carMove', from, to, CAR_MOVE_DURATION);
}

// 연료 보충 애니메이션 클립을 생성합니다. basePosition과 baseRotation은 애니메이션이 적용될 모델의 기본 위치와 회전입니다. 애니메이션은 연료통이 살짝 뒤로 빠졌다가 앞으로 나오는 모션과 함께, 회전도 약간 추가되어 있습니다.
export function createReloadFuelClip(basePosition, baseRotation) {
    const times = [];
    const positionValues = [];
    const quaternionValues = [];

    for (let i = 0; i <= RELOAD_SAMPLE_COUNT; i += 1) {
        const progress = i / RELOAD_SAMPLE_COUNT;
        const reloadMotionProgress = Math.min(progress / RELOAD_MOTION_END, 1);
        const outProgress = easeOut(Math.min(progress / RELOAD_OUT_END, 1));
        const inProgress = easeInOut(Math.min(Math.max((progress - RELOAD_IN_START) / RELOAD_IN_DURATION, 0), 1));
        const holdAmount = outProgress * (1 - inProgress);
        const spinAmount = -Math.sin(reloadMotionProgress * Math.PI);
        const rotation = new THREE.Euler(
            baseRotation.x + Math.PI * 1.4 * spinAmount,
            baseRotation.y,
            baseRotation.z + Math.PI * 0.25 * spinAmount
        );
        const quaternion = new THREE.Quaternion().setFromEuler(rotation);

        times.push(RELOAD_DURATION * progress);
        positionValues.push(
            basePosition.x,
            basePosition.y - 0.55 * holdAmount,
            basePosition.z + 0.12 * holdAmount
        );
        quaternionValues.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }

    return new THREE.AnimationClip('reloadFuel', RELOAD_DURATION, [
        new THREE.VectorKeyframeTrack('.position', times, positionValues),
        new THREE.QuaternionKeyframeTrack('.quaternion', times, quaternionValues),
    ]);
}

// 재장전 애니메이션 진행률을 구해줍니다. washGun에서 물 충전 타이밍을 잴때 사용합니다.
export function getReloadFillProgress(progress) {
    return easeInOut(Math.max((progress - RELOAD_FILL_START) / RELOAD_FILL_DURATION, 0));
}

// 애니메이션 클립을 한번 재생하는 함수입니다. target은 애니메이션이 적용될 모델이고, clip은 재생할 애니메이션 클립입니다. onFinished는 애니메이션이 끝났을 때 호출되는 콜백 함수입니다. 
export function playClipOnce(target, clip, onFinished) {
    const mixer = new THREE.AnimationMixer(target);
    const action = mixer.clipAction(clip);

    mixer.addEventListener('finished', () => onFinished?.());
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.reset().play();

    return { mixer, action };
}

// 위치 보간을 통해 클립을 생성하는 헬퍼함수입니다.
function createPositionClip(name, from, to, duration) {
    const times = [];
    const values = [];

    for (let i = 0; i <= DEFAULT_SAMPLE_COUNT; i += 1) {
        const progress = i / DEFAULT_SAMPLE_COUNT;
        const t = easeInOut(progress);

        times.push(duration * progress);
        values.push(
            THREE.MathUtils.lerp(from.x, to.x, t),
            THREE.MathUtils.lerp(from.y, to.y, t),
            THREE.MathUtils.lerp(from.z, to.z, t)
        );
    }

    return new THREE.AnimationClip(name, duration, [
        new THREE.VectorKeyframeTrack('.position', times, values),
    ]);
}

function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
    return t * t * (3 - 2 * t);
}
