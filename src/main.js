import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { Player } from './Player.js';
import { loadModels } from './LoadModels.js';
import { setupLighting } from './SetupLighting.js';
import { loadSounds } from './LoadSounds.js';
import { LaptopUpgradeUI } from './ui/LaptopUpgradeUI.js';
import { CameraManager } from './CameraManager.js';
import { WashGun } from './WashGun.js';
import { MoneyUI } from './ui/MoneyUI.js';
import { InstructionUI } from './ui/InstructionUI.js';
import { MoneyEffect } from './ui/MoneyEffect.js';
import { EconomyManager } from './EconomyManager.js';
import { CarChange } from './CarChange.js';
import { EndingManager } from './EndingManager.js';
import { loadShader } from './util/loadShader.js';
import { createMaterialFromShader } from './util/createMaterialFromShader.js';
import * as Collision from './CollisionGroup.js';
import RAPIER from '@dimforge/rapier3d-compat';

// stats 세팅 (성능 모니터링)
const stats = new Stats();
document.body.appendChild(stats.dom);

// 기본 씬, 카메라, 렌더러 세팅
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 포스트 프로세싱용 쉐이더와 렌더 타겟 세팅
const postVertexShader = await loadShader('./shaders/vert.glsl');
const postFragmentShader = await loadShader('./shaders/shellshading_frag.glsl');

const postProcessTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMaterial = createMaterialFromShader({
    vertexShader: postVertexShader,
    fragmentShader: postFragmentShader,
    uniforms: {
        tDiffuse: { value: postProcessTarget.texture },
        uTime: { value: 0 },
    },
    materialOptions: {
        depthTest: false,
        depthWrite: false,
    },
});
const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
postScene.add(postQuad);

// 시작 화면 html 가져오기
const startOverlay = document.getElementById('start-overlay');
const startMessage = document.getElementById('start-message');
const startButton = document.getElementById('start-button');

// 조명 세팅
setupLighting(scene, camera);

// 클락 세팅
const clock = new THREE.Clock();

// 물리 월드 세팅
await RAPIER.init({});
const gravity = { x: 0, y: -30, z: 0 }; // 중력은 플레이적으로 조율된 값
const world = new RAPIER.World(gravity);

// 모델 임포트
const {
    garageDoor,
    laptop_scrn,
    washableModels,
    ready: modelsReady,
} = loadModels({ scene, world });

// 사운드 세팅
const audioManager = await loadSounds(camera);
await modelsReady;

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
    audioManager,
});
const washGun = new WashGun({ player, camera, scene });

// 레이캐스터 (수압 총) 세팅
const raycaster = new THREE.Raycaster();
const centerPos = new THREE.Vector2(0, 0); // 화면 정중앙
const mousePos = new THREE.Vector2(0, 0);
let isWashing = false;
const sprayTarget = new THREE.Vector3();
const maxSprayDistance = 50;

// 일시정지 화면 html 가져오기
const menuPopup = document.getElementById('menu');
const menuVolumePanel = document.getElementById('menu-volume-panel');

// UI 세팅
const moneyUI = new MoneyUI({ camera });
const economyManager = new EconomyManager({ moneyUI });
const laptopUpgradeUI = new LaptopUpgradeUI({
    laptopScreen: laptop_scrn,
    getUpgradeState: (key) => economyManager.getUpgradeState(key),
    onBuyUpgrade: (key) => economyManager.tryBuyUpgrade(key),
});
const instructionUI = new InstructionUI({ camera });
const moneyEffect = new MoneyEffect({ scene });
const carChange = new CarChange({
    cars: washableModels,
    garageDoor,
    audioManager,
    economyManager,
    moneyEffect,
});

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

// 시작 및 로딩 화면을 구성합니다.
cameraManager.mode = 'start';
player.setInputEnabled(false);
camera.position.copy(player.getEyePosition());
camera.quaternion.copy(cameraManager.viewQuaternion);

function startGame() {
    if (cameraManager.mode !== 'start') return;

    startOverlay?.classList.add('hide');
    cameraManager.mode = 'world';
    player.setInputEnabled(true);
    cameraManager.lockPointer();
}

if (startMessage && startButton) {
    startMessage.textContent = 'Wash Cars';
    startButton.hidden = false;
    startOverlay?.addEventListener('click', startGame);
}

// 엔딩 매니저 추가
const endingManager = new EndingManager({
    scene,
    camera,
    cameraManager,
    player,
    washGun,
    washableModels,
    economyManager,
    audioManager,
});

// 레이캐스트를 위한 마우스 위치 업데이트
window.addEventListener('mousemove', (e) => {
    mousePos.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});

let bgmStarted = false;

// 좌클릭 처리 cameraManager에 전달.
window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (cameraManager.mode === 'start') return;

    if (bgmStarted === false) {
        audioManager.play('bgm');
        bgmStarted = true;
    }

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
    cameraManager.update(delta);
    washGun.setMaxWaterAmount(economyManager.getMaxWaterAmount());
    washGun.update(delta);
    moneyEffect.update(delta);
    if (!endingManager.isStarted) {
        carChange.update(delta);
    }
    endingManager.update(delta);

    // 커서 기준 물줄기 타겟 계산 (히트가 없으면 전방 고정 거리)
    raycaster.setFromCamera(centerPos, camera);
    sprayTarget.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, maxSprayDistance);

    // 물을 쏘고 있을 때의 충돌(때 지우기) 연산
    if (!endingManager.isStarted && cameraManager.mode === 'world' && !carChange.isChanging && isWashing && washGun.waterAmount > 0) {
        washGun.consumeWater(delta * 0.5);
        audioManager.play('water_hose', { position: player.rigidBody.translation() });

        const activeCar = carChange.getActiveCar();
        const washMeshes = activeCar ? activeCar.getWashMeshes() : [];
        const intersects = raycaster.intersectObjects(washMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const washableModel = hit.object.washableModel;

            if (washableModel) {
                sprayTarget.copy(hit.point);
                const cleanedAmount = washableModel.wash(
                    hit,
                    economyManager.getWashRadius(),
                    economyManager.getWashStrengthMultiplier(),
                    delta,
                );
                const reward = economyManager.calculateWashReward(cleanedAmount);
                economyManager.addMoney(reward);
                moneyEffect.trySpawn(hit.point, reward);
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
        !endingManager.isStarted && cameraManager.mode === 'world' && !carChange.isChanging && isWashing && washGun.waterAmount > 0,
        sprayTarget,
        economyManager.getWashRadius()
    );

    for (const model of washableModels) {
        model.update(delta, cameraManager.camera);
    }
    if (!laptopUpgradeUI.isReady) {
        laptopUpgradeUI.tryInitialize();
    }
    laptopUpgradeUI.updateUI();

    stats.update();
    // 게임 카메라가 postProcessTarget에 먼저 렌더하고 postCamera가 전체 화면 쿼드로 postProcessTarget에 쉐이더를 적용하여 렌더하는 방식입니다.
    postMaterial.uniforms.uTime.value += delta;
    renderer.setRenderTarget(postProcessTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
    world.step(); // 물리 시뮬레이션 한 스텝 진행
    // console.log(renderer.info.render); 
}

// 창 크기 변경 대응
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postProcessTarget.setSize(window.innerWidth, window.innerHeight);
    moneyUI.updateLayout();
    instructionUI.updateLayout();
    endingManager.updateLayout();
});

// 돈 치트
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
        economyManager.addMoney(1000000);
    }
});

gameUpdate();



