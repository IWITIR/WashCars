import * as THREE from 'three';
import { Model } from './Model.js';
import { WashableModel } from './WashableModel.js';
import * as Collision from './CollisionGroup.js';

export function loadModels({ scene, world }) {
    const garage = new Model({
        world,
        path: './glb/Garage.glb',
        isHollow: true,
        collisionGroups: Collision.collisionSM,
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
        ready: Promise.all(models.map((model) => model.ready)),
    };
}
