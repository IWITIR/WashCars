import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { collisionALL, collisionPlayer, collisionWash } from './CollisionGroup.js';

const gltfLoader = new GLTFLoader();

export class Model {
  constructor({ world, path, isHollow = false, collisionGroups = collisionALL }) {
    this.world = world;
    this.group = new THREE.Group();
    this.model = null;
    this.isLoaded = false;
    this.isHollow = isHollow;
    this.collisionGroups = collisionGroups; // 충돌 그룹 저장
    this.rigidBody = null;

    gltfLoader.load(
      path,
      (gltf) => {
        this.model = gltf.scene;
        this.group.add(this.model);
        this.isLoaded = true;
        this.setupPhysics();
      },
      undefined,
      (error) => {
        console.error('Garage GLB load error:', error);
      }
    );
  }

  setupPhysics() {
    if (!this.world || !this.model) return;

    const box = new THREE.Box3().setFromObject(this.model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
    this.rigidBody.setTranslation({ x: this.group.position.x, y: this.group.position.y, z: this.group.position.z }, true);

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
}
