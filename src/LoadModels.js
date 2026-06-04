import * as THREE from 'three';
import { Model } from './Model.js';
import { WashableModel } from './WashableModel.js';
import * as Collision from './CollisionGroup.js';

// 모델 에셋 로드 부분을 보기 편하게 분리했습니다.
export function loadModels({ scene, world }) {
    const garage = new Model({
        world,
        path: './glb/Garage.glb',
        isHollow: true,
        collisionGroups: Collision.collisionSM,
        receiveShadow: true,
    });
    scene.add(garage.group);

    const garageDoor = new Model({
        world,
        path: './glb/GarageDoor.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
    });
    scene.add(garageDoor.group);

    const table = new Model({
        world,
        path: './glb/PlasticTable.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
    });
    scene.add(table.group);

    const laptop = new Model({
        world,
        path: './glb/laptop.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
    });
    scene.add(laptop.group);

    const laptop_scrn = new Model({
        world,
        path: './glb/laptop_scrn.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
    });
    scene.add(laptop_scrn.group);

    const lamp = new Model({
        world,
        path: './glb/Lamp.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
    });
    scene.add(lamp.group);

    const muscle_car = new WashableModel({
        world,
        path: './glb/muscle_car.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
        castShadow: true,
        preserveMaterialMaps: true,
        // 투명 재질 제거 (에셋 호환 문제)
        preserveMaterialState: false,
        materialOverride: () => new THREE.MeshStandardMaterial({
            side: THREE.FrontSide,
            transparent: false,
            opacity: 1,
            depthWrite: true,
            alphaTest: 0,
        }),
        cleanTargetScore: 32000,
        hideProgressBar: false,
        washRadiusScale: 1.0,
    });
    muscle_car.rescale(6.0);
    muscle_car.setPosition(0, 0, 0);
    scene.add(muscle_car.group);

    const dacia = new WashableModel({
        world,
        path: './glb/dacia.glb',
        isHollow: false,
        collisionGroups: Collision.collisionSM,
        castShadow: true,
        preserveMaterialMaps: true,
        // 투명 재질 제거 (에셋 호환 문제)
        preserveMaterialState: false,
        materialOverride: () => new THREE.MeshStandardMaterial({
            side: THREE.FrontSide,
            transparent: false,
            opacity: 1,
            depthWrite: true,
            alphaTest: 0,
        }),
        cleanTargetScore: 20000,
        hideProgressBar: true,
        washRadiusScale: 0.6,
        startVisible: false, // 두 번째 차량은 처음에 보이지 않도록 설정 (CarChange.js에서 제어)
    });
    dacia.setRotation(0, Math.PI / 2, 0);
    dacia.setPosition(0, 0, 300);
    dacia.rescale(18.0);
    scene.add(dacia.group);

    const models = [
        garage,
        garageDoor,
        table,
        laptop,
        laptop_scrn,
        lamp,
        muscle_car,
        dacia,
    ];

    return {
        garageDoor,
        laptop_scrn,
        washableModels: [muscle_car, dacia],
        // main에서 모델 로드 완료를 대기하기 위한 프로미스입니다.
        ready: Promise.all(models.map((model) => model.ready)),
    };
}
