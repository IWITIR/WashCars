import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WashableObject } from './WashableObject.js';
import { Model } from './Model.js';
import { Player } from './Player.js';
import * as Collision from './CollisionGroup.js';
import RAPIER from '@dimforge/rapier3d-compat';

// 0. stats 세팅 (성능 모니터링)
const stats = new Stats();
document.body.appendChild(stats.dom);

// 1. 기본 씬, 카메라, 렌더러 세팅
// 원점 세팅
const basicOffset = new THREE.Vector3(0, -15, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 조명 세팅
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
// 1) 맵 중앙 상공에서 아래로 넓게 비추는 스포트라이트
// Blender 크기 (160, 240, 80, Z-up) 기준을 Three(Y-up)로 보면
// 대략 가로 X=160, 세로 높이 Y=80, 깊이 Z=240 스케일로 간주.
const mapCenterSpot = new THREE.SpotLight(0xffffff, 10, 500, Math.PI / 4, 0.45, 0.1);
mapCenterSpot.position.set(0, basicOffset.y + 70, 20); // 맵 중앙에서 살짝 문쪽
mapCenterSpot.target.position.set(0, basicOffset.y, 20); // 수직 ㅇ아래
scene.add(mapCenterSpot);
scene.add(mapCenterSpot.target);
// 2) 컴퓨터 위 + 살짝 앞에서 컴퓨터 쪽 강조 스포트라이트
const laptopSpot = new THREE.SpotLight(0x9fd2ff, 2.4, 180, Math.PI / 7, 0.35, 0.1);
laptopSpot.position.set(basicOffset.x + 50, basicOffset.y + 80, basicOffset.z - 90);
// "앞" 방향은 씬 축에 따라 +Z/-Z가 다를 수 있으니 필요하면 z 부호만 바꿔 미세조정
laptopSpot.target.position.set(basicOffset.x + 50, basicOffset.y + 8, basicOffset.z - 100);
scene.add(laptopSpot);
scene.add(laptopSpot.target);



// 클락 세팅
const clock = new THREE.Clock();

// 물리 월드 세팅
await RAPIER.init({});
const gravity = { x: 0, y: -30, z: 0 }; // 중력은 플레이적으로 조율된 값
const world = new RAPIER.World(gravity);

// 모델 임포트
const garage = new Model({
    world,
    path: './glb/Garage.glb',
    isHollow: true,
    collisionGroups: Collision.collisionSM,
});
garage.group.position.copy(basicOffset);
scene.add(garage.group);

const garageDoor = new Model({
    world,
    path: './glb/GarageDoor.glb',
    isHollow: false,
    collisionGroups: Collision.collisionSM,
});
garageDoor.group.position.copy(basicOffset);
scene.add(garageDoor.group);

const table = new Model({
    world,
    path: './glb/PlasticTable.glb',
    isHollow: false,
    collisionGroups: Collision.collisionSM,
});
table.group.position.copy(basicOffset);
scene.add(table.group);

const laptop = new Model({
    world,
    path: './glb/laptop.glb',
    isHollow: false,
    collisionGroups: Collision.collisionSM,
});
laptop.group.position.copy(basicOffset);
scene.add(laptop.group);

const laptop_scrn = new Model({
    world,
    path: './glb/laptop_scrn.glb',
    isHollow: false,
    collisionGroups: Collision.collisionInteractable,
});
laptop_scrn.group.position.copy(basicOffset);
scene.add(laptop_scrn.group);

// 플레이어 세팅
const player = new Player({
    scene,
    camera,
    renderer,
    world,
    startPos: basicOffset.clone().add(new THREE.Vector3(0, 0, 5)), // 플레이어 시작 위치 (원점에서 약간 뒤쪽)
    collisionGroups: Collision.collisionPlayer
});

// 2. 세차할 대상(WashableObject) 씬에 추가
// 일단은 기본 Box(큐브)를 사용합니다. 나중에 GLTF 지오메트리로 교체하면 됩니다.
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const washableBox = new WashableObject(boxGeometry);
scene.add(washableBox.group);

// 3. 레이캐스터 (수압 총) 세팅
const raycaster = new THREE.Raycaster();
const centerPos = new THREE.Vector2(0, 0); // 화면 정중앙
let isWashing = false;

// 좌클릭을 누르고 있을 때 물을 쏜다고 판정
window.addEventListener('mousedown', (e) => { if (e.button === 0) isWashing = true; });
window.addEventListener('mouseup', (e) => { if (e.button === 0) isWashing = false; });

// 4. 게임 메인 루프
function gameUpdate() {
    requestAnimationFrame(gameUpdate);

    const delta = clock.getDelta();
    player.update(delta);
    

    // 물을 쏘고 있을 때의 충돌(때 지우기) 연산
    if (isWashing) {
        raycaster.setFromCamera(centerPos, camera); // 화면 정중앙에서 광선을 쏨
        
        // 때 메쉬(dirtMesh)와 부딪혔는지 검사
        const intersects = raycaster.intersectObject(washableBox.dirtMesh);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.uv) {
                washableBox.washAt(hit.uv); // 맞은 곳의 UV 좌표 전달
            }
        }
    }

    // 큐브가 회전하는 모습 (테스트용)
    washableBox.group.rotation.x += 0.005;
    washableBox.group.rotation.y += 0.005;

    stats.update();
    renderer.render(scene, camera);
    world.step(); // 물리 시뮬레이션 한 스텝 진행
}

// 창 크기 변경 대응
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

gameUpdate();


// 5. 그래픽 헬퍼 (디버그)
const helperRoot = new THREE.Group();
scene.add(helperRoot);

let showHelpers = false;
window.addEventListener('keydown', (e) => {
    console.log('Helper toggle key pressed');
    if (e.code === 'KeyH') {
        showHelpers = !showHelpers;
        helperRoot.traverse((child) => {
                child.visible = showHelpers;
        });
    }
});


helperRoot.add(new THREE.SpotLightHelper(mapCenterSpot));
helperRoot.add(new THREE.SpotLightHelper(laptopSpot));
