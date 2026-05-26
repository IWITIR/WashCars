import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { Player } from './Player.js';
import { loadModels } from './LoadModels.js';
import { setupLighting } from './SetupLighting.js';
import { loadSounds } from './LoadSounds.js';
import { LaptopUpgradeUI } from './LaptopUpgradeUI.js';
import { CameraManager } from './CameraManager.js';
import { WashGun } from './WashGun.js';
import * as Collision from './CollisionGroup.js';
import RAPIER from '@dimforge/rapier3d-compat';

// 0. stats 세팅 (성능 모니터링)
const stats = new Stats();
document.body.appendChild(stats.dom);

// 1. 기본 씬, 카메라, 렌더러 세팅
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 조명 세팅
setupLighting(scene);

// 클락 세팅
const clock = new THREE.Clock();

// 물리 월드 세팅
await RAPIER.init({});
const gravity = { x: 0, y: -30, z: 0 }; // 중력은 플레이적으로 조율된 값
const world = new RAPIER.World(gravity);

// 모델 임포트
const { laptop_scrn, washableModels } = loadModels({ scene, world });

// 사운드 세팅
const audioManager = await loadSounds(camera);
// 볼륨 슬라이더
const masterVolumeSlider = document.getElementById('master-volume');
const masterVolumeValue = document.getElementById('master-volume-value');

if (masterVolumeSlider && masterVolumeValue) {
    const updateMasterVolume = () => {
        const volume = Number(masterVolumeSlider.value) / 100;
        audioManager.setMasterVolume(volume);
        masterVolumeValue.textContent = `${masterVolumeSlider.value}%`;
    };

    // Init
    masterVolumeSlider.addEventListener('input', updateMasterVolume);
    updateMasterVolume();
}

// 플레이어 세팅
const player = new Player({
    world,
    startPos: new THREE.Vector3(30, 8, 5), // 플레이어 시작 위치 (원점에서 약간 뒤쪽)
    collisionGroups: Collision.collisionPlayer,
    audioManager,
});
const washGun = new WashGun({ player, camera, scene });

// 2. 레이캐스터 (수압 총) 세팅
const raycaster = new THREE.Raycaster();
const centerPos = new THREE.Vector2(0, 0); // 화면 정중앙
const mousePos = new THREE.Vector2(0, 0);
let isWashing = false;
const sprayTarget = new THREE.Vector3();
const maxSprayDistance = 50;
const menuPopup = document.getElementById('menu');
const menuVolumePanel = document.getElementById('menu-volume-panel');

const laptopUpgradeUI = new LaptopUpgradeUI({
    laptopScreen: laptop_scrn,
});


function getCurrentWashRadius() {
    return 30;
}

// 게임 모드 세팅 (플레이어 조작 모드, 랩탑 UI 모드, 일시정지 모드)
const cameraManager = new CameraManager({
    scene,
    player,
    camera,
    domElement: renderer.domElement,
    washGun,
    laptopUpgradeUI,
    menuPopup,
    menuVolumePanel,
    audioManager,
    onStopWashing: () => {
        isWashing = false;
    },
});
// 좌클릭을 누르고 있을 때 물을 쏜다고 판정
window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;

    if (!cameraManager.handlePrimaryMouseDown(raycaster, centerPos, mousePos)) {
        isWashing = false;
        return;
    }

    isWashing = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) isWashing = false; });


// 4. 게임 메인 루프
function gameUpdate() {
    requestAnimationFrame(gameUpdate);

    const delta = clock.getDelta();
    player.update(delta, cameraManager.viewQuaternion);
    cameraManager.update();
    washGun.update(delta);

    // 커서 기준 물줄기 타겟 계산 (히트가 없으면 전방 고정 거리)
    raycaster.setFromCamera(centerPos, camera);
    sprayTarget.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, maxSprayDistance);

    // 물을 쏘고 있을 때의 충돌(때 지우기) 연산
    if (cameraManager.mode === 'world' && isWashing && washGun.waterFillLevel > 0) {
        washGun.waterFillLevel = Math.max(0, washGun.waterFillLevel - delta * 0.50);
        audioManager.play('water_hose', { position: player.rigidBody.translation() });

        const washMeshes = washableModels.flatMap((model) => model.getWashMeshes());
        const intersects = raycaster.intersectObjects(washMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const washableModel = hit.object.washableModel;

            if (washableModel) {
                sprayTarget.copy(hit.point);
                washableModel.wash(hit, getCurrentWashRadius());
                audioManager.play('water_hit', { position: hit.point });
            }
        } else {
            audioManager.stop('water_hit');
        }
    } else {
        audioManager.stop('water_hose');
        audioManager.stop('water_hit');
    }

    washGun.updateWaterStream(
        cameraManager.mode === 'world' && isWashing && washGun.waterFillLevel > 0,
        sprayTarget
    );

    for (const model of washableModels) {
        model.update(delta, cameraManager.camera);
    }
    laptopUpgradeUI.update();

    stats.update();
    renderer.render(scene, cameraManager.camera);
    world.step(); // 물리 시뮬레이션 한 스텝 진행
}

// 창 크기 변경 대응
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

gameUpdate();



