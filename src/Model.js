import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { collisionALL } from './CollisionGroup.js';

const gltfLoader = new GLTFLoader();

// 주어진 GLB 모델을 로드하여 씬에 추가하고, Rapier 콜라이더도 함께 생성하는 클래스입니다.
export class Model {
    constructor({
        world,
        path,
        isHollow = false,
        collisionGroups = collisionALL,
        castShadow = false,
        receiveShadow = false,
        materialOverride = null,
        preserveMaterialMaps = false,
        preserveMaterialState = true,
        scale = 1,
        startVisible = true,
    }) {
        this.world = world;
        this.group = new THREE.Group();
        this.model = null;
        this.isLoaded = false;
        this.isHollow = isHollow;
        this.collisionGroups = collisionGroups; // 충돌 그룹 저장
        this.rigidBody = null;
        this.scale = scale;
        this.localBoundsBox = new THREE.Box3();
        this.localBoundsMeshBox = new THREE.Box3();
        this.inverseGroupMatrix = new THREE.Matrix4();
        this.groupWorldPosition = new THREE.Vector3();
        this.groupWorldQuaternion = new THREE.Quaternion();
        // 메인 함수에서 모델 로드 완료를 대기하기 위한 콜백 프로미스입니다. 
        // LoadModels에서 한번 더 묶인다음 main에서 대기됩니다.
        this.ready = new Promise((resolve, reject) => {
            this.resolveReady = resolve;
            this.rejectReady = reject;
        });

        gltfLoader.load(
            path,
            (gltf) => {
                this.model = gltf.scene;
                this.applyShadowSettings(castShadow, receiveShadow);
                this.applyMaterialOverride(materialOverride, preserveMaterialMaps, preserveMaterialState);
                this.rescale(this.scale, { rebuildPhysics: false });
                this.group.add(this.model);
                this.isLoaded = true;
                this.setupPhysics();
                this.onModelLoaded(); // 콜백 함수 호출 : WashableModel에서 사용
                this.model.visible = startVisible;
                this.resolveReady(this);
            },
            undefined,
            (error) => {
                console.error('Garage GLB load error:', error);
                this.rejectReady(error);
            }
        );
    }

    // 로컬 좌표계 기준으로 모델의 경계를 계산합니다. 콜라이더 생성 시 사용됩니다.
    computeLocalBounds() {
        this.localBoundsBox.makeEmpty();
        this.group.updateWorldMatrix(true, true);
        this.inverseGroupMatrix.copy(this.group.matrixWorld).invert();

        this.model.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;

            child.geometry.computeBoundingBox();
            this.localBoundsMeshBox.copy(child.geometry.boundingBox);
            this.localBoundsMeshBox.applyMatrix4(child.matrixWorld);
            this.localBoundsMeshBox.applyMatrix4(this.inverseGroupMatrix);
            this.localBoundsBox.union(this.localBoundsMeshBox);
        });

        return this.localBoundsBox;
    }

    // 그룹 로컬 좌표계 기준으로 현재 모델을 감싸는 박스 모양의 콜라이더를 생성합니다.
    setupPhysics() {
        if (!this.world || !this.model) return;

        const box = this.computeLocalBounds();
        if (box.isEmpty()) return;

        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        this.group.getWorldPosition(this.groupWorldPosition);
        this.group.getWorldQuaternion(this.groupWorldQuaternion);

        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(
                this.groupWorldPosition.x,
                this.groupWorldPosition.y,
                this.groupWorldPosition.z
            )
            .setRotation({
                x: this.groupWorldQuaternion.x,
                y: this.groupWorldQuaternion.y,
                z: this.groupWorldQuaternion.z,
                w: this.groupWorldQuaternion.w,
            });
        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const hX = size.x / 2;
        const hY = size.y / 2;
        const hZ = size.z / 2;

        // isHollow 옵션에 따라 충돌체를 다르게 설정하되, collisionGroups는 항상 적용되도록 합니다.
        if (!this.isHollow) {
            // 속이 꽉 찬 충돌 설정
            const padding = 1.02;
            const colliderDesc = RAPIER.ColliderDesc.cuboid(hX * padding, hY * padding, hZ * padding)
                .setTranslation(center.x, center.y, center.z)
                .setCollisionGroups(this.collisionGroups);

            this.world.createCollider(colliderDesc, this.rigidBody);
        } else {
            // 속이 빈 충돌 설정
            const wallThickness = 0.2;
            const hT = wallThickness / 2;

            const floorDesc = RAPIER.ColliderDesc.cuboid(hX, hT, hZ)
                .setTranslation(center.x, center.y - hY - hT, center.z)
                .setCollisionGroups(this.collisionGroups);
            this.world.createCollider(floorDesc, this.rigidBody);

            const ceilingDesc = RAPIER.ColliderDesc.cuboid(hX, hT, hZ)
                .setTranslation(center.x, center.y + hY + hT, center.z)
                .setCollisionGroups(this.collisionGroups);
            this.world.createCollider(ceilingDesc, this.rigidBody);

            const leftWallDesc = RAPIER.ColliderDesc.cuboid(hT, hY, hZ)
                .setTranslation(center.x - hX - hT, center.y, center.z)
                .setCollisionGroups(this.collisionGroups);
            this.world.createCollider(leftWallDesc, this.rigidBody);

            const rightWallDesc = RAPIER.ColliderDesc.cuboid(hT, hY, hZ)
                .setTranslation(center.x + hX + hT, center.y, center.z)
                .setCollisionGroups(this.collisionGroups);
            this.world.createCollider(rightWallDesc, this.rigidBody);

            const backWallDesc = RAPIER.ColliderDesc.cuboid(hX, hY, hT)
                .setTranslation(center.x, center.y, center.z - hZ - hT)
                .setCollisionGroups(this.collisionGroups);
            this.world.createCollider(backWallDesc, this.rigidBody);
        }
    }

    // GLB 모델의 머테리얼을 일괄적으로 오버라이드하는 함수
    applyMaterialOverride(materialOverride, preserveMaterialMaps, preserveMaterialState = true) {
        if (!this.model || !materialOverride) return;

        this.model.traverse((child) => {
            if (!child.isMesh) return;

            // 머테리얼이 배열인 경우 각 요소에 대해 오버라이드 적용
            if (Array.isArray(child.material)) {
                child.material = child.material.map((originalMaterial) =>
                    this.buildOverrideMaterial(child, originalMaterial, materialOverride, preserveMaterialMaps, preserveMaterialState)
                );
                return;
            }

            // 머테리얼이 단일인 경우 바로 오버라이드 적용
            child.material = this.buildOverrideMaterial(
                child,
                child.material,
                materialOverride,
                preserveMaterialMaps,
                preserveMaterialState
            );
        });
    }

    applyShadowSettings(castShadow, receiveShadow) {
        if (!this.model) return;

        this.model.traverse((child) => {
            if (!child.isMesh) return;
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
        });
    }

    // 오버라이드 될 머테리얼이 glb에 맞는 프로퍼티를 유지하도록 설정
    buildOverrideMaterial(mesh, originalMaterial, materialOverride, preserveMaterialMaps, preserveMaterialState = true) {

        // materialOverride를 함수로 받아서 메시마다 다른 머테리얼을 적용할 수 있도록 지원
        const nextMaterial = typeof materialOverride === 'function'
            ? materialOverride({ mesh, originalMaterial })
            : materialOverride.clone();

        if (!nextMaterial) {
            return originalMaterial;
        }

        if (preserveMaterialMaps) {
            this.copyMaterialMaps(originalMaterial, nextMaterial);
        }

        if (originalMaterial.color && nextMaterial.color) {
            nextMaterial.color.copy(originalMaterial.color);
        }

        if (originalMaterial.emissive && nextMaterial.emissive) {
            nextMaterial.emissive.copy(originalMaterial.emissive);
            nextMaterial.emissiveIntensity = originalMaterial.emissiveIntensity;
        }

        if (preserveMaterialState) {
            nextMaterial.transparent = originalMaterial.transparent;
            nextMaterial.opacity = originalMaterial.opacity;
            nextMaterial.alphaTest = originalMaterial.alphaTest;
            nextMaterial.side = originalMaterial.side;
        }

        nextMaterial.needsUpdate = true;

        return nextMaterial;
    }

    copyMaterialMaps(originalMaterial, nextMaterial) {
        const mapKeys = [
            'map',
            'alphaMap',
            'aoMap',
            'bumpMap',
            'displacementMap',
            'emissiveMap',
            'lightMap',
            'metalnessMap',
            'normalMap',
            'roughnessMap',
        ];

        for (const key of mapKeys) {
            if (originalMaterial[key] && nextMaterial[key] == null) {
                nextMaterial[key] = originalMaterial[key];
            }
        }
    }

    // 모델의 크기를 조절하는 함수입니다. physics까지 같이 설정해줍니다.
    rescale(factor, { rebuildPhysics = true } = {}) {
        this.scale = factor;

        if (!this.model) return;

        this.model.scale.set(factor, factor, factor);
        this.model.updateMatrixWorld(true);

        if (!rebuildPhysics || !this.world) return;

        if (this.rigidBody) {
            this.world.removeRigidBody(this.rigidBody);
            this.rigidBody = null;
        }

        this.setupPhysics();
    }

    // 모델의 위치를 바꾸는 함수입니다. Rapier 콜라이더는 Three와 별개로 수정해야 해서
    // 모델을 이동 후 콜라이더에도 적용해주는 방식으로 구현했습니다.
    setPosition(x = 0, y = 0, z = 0) {
        this.group.position.set(x, y, z);
        this.group.updateMatrixWorld(true);

        if (!this.rigidBody) return;

        this.group.getWorldPosition(this.groupWorldPosition);
        this.rigidBody.setTranslation(this.groupWorldPosition, true);
    }

    // 마찬가지로, 모델을 회전한뒤 콜라이더에 적용해주는 방식을 구현했습니다.
    setRotation(x = 0, y = 0, z = 0, { rebuildPhysics = true } = {}) {
        this.group.rotation.set(x, y, z);
        this.group.updateMatrixWorld(true);

        if (!rebuildPhysics || !this.world || !this.model) return;

        if (this.rigidBody) {
            this.world.removeRigidBody(this.rigidBody);
            this.rigidBody = null;
        }

        this.setupPhysics();
    }

    onModelLoaded() {}
}
