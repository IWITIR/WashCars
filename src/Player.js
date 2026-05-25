import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { collisionPlayer } from './CollisionGroup.js';
import { WashGun } from './WashGun.js';

export class Player {
    constructor({
        scene,
        camera,
        renderer,
        world,
        startPos = { x: 0, y: 0, z: 0 },
        collisionGroups = collisionPlayer
    }) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;

        // --- 1. 물리 스펙 (플레이어 크기 및 속도) ---
        this.speed = 30.0;
        this.speedMultiplier = 1.0; // 이동 속도 배율 (Shift 키로 달리기)
        this.jumpForce = 50.0; // 조율된 값
        this.gravity = world.gravity.y * 4.0; // 기존 대비 2배 빠른 점프를 위해 중력은 4배
        this.jumpCutMultiplier = 0.45; // 점프 중 키를 떼면 상승 속도를 즉시 줄여 짧은 점프 구현
        this.velocity = new THREE.Vector3();
        this.crouching = false; // 앉기 상태 플래그

        // 캡슐 형태의 콜라이더
        const halfHeight = 8;
        const radius = 3;
        this.eyeHeightOffset = halfHeight * 1.8; // 눈높이를 캡슐 상단 근처로 설정

        // --- 2. Rapier 플레이어 물리 바디 세팅 (Kinematic) ---
        // 캐릭터는 중력에 의해 마구 굴러가면 안 되므로 'KinematicPositionBased'를 사용합니다.
        const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(startPos.x, startPos.y + halfHeight, startPos.z);
        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
            .setCollisionGroups(collisionGroups);
        this.collider = this.world.createCollider(colliderDesc, this.rigidBody);

        // Rapier 내장 캐릭터 컨트롤러 (벽 미끄러짐, 바닥 감지 등 자동화)
        const offset = 0.01; // 벽과의 여유 간격
        this.characterController = this.world.createCharacterController(offset);
        // 계단 오르기 허용 (높이 0.5 이하의 턱은 자동으로 부드럽게 올라감)
        this.characterController.enableAutostep(0.5, 0.2, true);

        // --- 3. Three.js 시점 제어 (PointerLock) ---
        this.controls = new PointerLockControls(this.camera, renderer.domElement);
        // 앉아있는 경우를 고려해 눈높이 조정 (기본적으로 캡슐 상단 근처)
        this.camera.position.set(startPos.x, startPos.y + this.eyeHeightOffset, startPos.z);

        // --- 4. 키보드 입력 상태 ---
        this.moveState = { forward: false, backward: false, left: false, right: false };
        this.isJumping = false;

        // --- 5. WashGun 세팅 ---
        this.washGun = new WashGun({ player: this });

        this._initInput();
    }

    // 보안정책 때문에 락 해제 후 1.5초 쿨다운동안은 바로 락이 안됨
    control_lock() {
        if (this.mouseCanLock) {
            this.controls.lock();
        } else {
            console.log('Mouse lock is temporarily disabled due to recent unlock. Please wait a moment before trying again.');
        }
    }

    control_unlock() {
        console.log('mouse unlock requested: menu open');
        this.menuPopup.classList.add('show');
        this.menuOpen = true; // 메뉴가 열렸다고 상태 업데이트
        this.mouseCanLock = false; // 마우스가 풀리면 즉시 잠금 차단

        // 브라우저 쿨다운(1.5초)이 지나면 다시 잠금 허용
        setTimeout(() => {
            this.mouseCanLock = true;
        }, 1500);
    }

    _initInput() {

        // 이동 관련
        window.addEventListener('keydown', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveState.forward = true;
                    break;
                case 'KeyS':
                    this.moveState.backward = true;
                    break;
                case 'KeyA':
                    this.moveState.left = true;
                    break;
                case 'KeyD':
                    this.moveState.right = true;
                    break;
                case 'KeyR':
                    this.washGun?.reload();
                    break;
                case 'Space':
                    // 바닥에 닿아있을 때만 점프 허용
                    if (this.characterController.computedGrounded()) {
                        this.velocity.y = this.jumpForce;
                    }
                    break;
                case 'ShiftLeft':
                    // Shift 키를 누르면 이동 속도가 2배 빨라짐 (달리기)
                    this.speedMultiplier = 2;
                    break;
                case 'KeyC':
                    // C 키를 누르면 앉기 토글
                    if (this.crouching) {
                        // 일어서기
                        this.crouching = false;
                        this.speedMultiplier = 1.0;
                    } else {
                        // 앉기
                        this.crouching = true;
                        this.speedMultiplier = 0.5;
                    }
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.moveState.forward = false; break;
                case 'KeyS': this.moveState.backward = false; break;
                case 'KeyA': this.moveState.left = false; break;
                case 'KeyD': this.moveState.right = false; break;
                case 'Space':
                    if (this.velocity.y > 0) {
                        // 키를 일찍 떼면 상승 속도를 즉시 줄여 짧은 점프 구현
                        this.velocity.y *= this.jumpCutMultiplier;
                    }
                    break;
                case 'ShiftLeft':
                    // Shift 키에서 손을 떼면 이동 속도 원래대로
                    this.speedMultiplier = 1;
                    break;
                }
        });

        // 마우스 락
        this.mouseCanLock = true; // 초기에는 마우스 잠금 허용 상태
        this.menuPopup = document.getElementById('menu');
        this.menuVolumePanel = document.getElementById('menu-volume-panel');
        this.menuOpen = false; // 메뉴는 기본적으로 닫혀있음

        window.addEventListener('click', () => {
            if (!this.controls.isLocked && !this.menuOpen) {
                this.control_lock();
            }
        });

        this.menuPopup.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.menuVolumePanel.contains(e.target)) return;

            this.menuPopup.classList.remove('show');
            this.menuOpen = false;
            this.control_lock();
        });

        this.controls.addEventListener('unlock', () => {
            this.control_unlock();
        });
    }

    // 매 프레임마다 호출되어야 하는 업데이트 함수
    update(delta) {
        this.washGun?.update(delta);

        if (!this.controls.isLocked) return; // 게임 중지 상태면 안 움직임

        // --- [A] 키보드 입력으로 목표 이동 벡터 계산 ---
        const moveDir = this.camera.getWorldDirection(new THREE.Vector3());
        moveDir.z = Number(this.moveState.backward) - Number(this.moveState.forward);
        moveDir.x = Number(this.moveState.right) - Number(this.moveState.left);
        moveDir.normalize(); // 대각선 이동 시 빨라짐 방지

        // 카메라가 바라보는 방향을 기준으로 로컬 벡터를 월드 벡터로 변환
        const camQuat = new THREE.Quaternion();
        camQuat.copy(this.camera.quaternion);
        // Y축(상하) 회전은 무시하고 바닥(XZ평면) 방향만 추출
        const euler = new THREE.Euler().setFromQuaternion(camQuat, 'YXZ');
        euler.x = 0; euler.z = 0;
        moveDir.applyEuler(euler);
        moveDir.multiplyScalar(this.speed * this.speedMultiplier * delta);

        // --- [B] 중력 연산 ---
        this.velocity.y += this.gravity * delta;

        // 이동할 총 변위량 (X, Z는 WASD 이동 / Y는 중력+점프)
        const desiredTranslation = {
            x: moveDir.x,
            y: this.velocity.y * delta,
            z: moveDir.z
        };

        // --- [C] Rapier 캐릭터 컨트롤러 충돌 연산 ---
        // 벽을 뚫지 않고 미끄러지도록 최종 허용된 이동량을 계산
        this.characterController.computeColliderMovement(this.collider, desiredTranslation);
        const correctedMovement = this.characterController.computedMovement();

        // 바닥에 닿았다면 중력 가속도 초기화 (계속 떨어지는 것 방지)
        if (this.characterController.computedGrounded()) {
            this.velocity.y = Math.max(0, this.velocity.y);
        }

        // --- [D] 연산 결과를 실제 바디와 카메라에 적용 ---
        const currentPos = this.rigidBody.translation();
        const nextPos = {
            x: currentPos.x + correctedMovement.x,
            y: currentPos.y + correctedMovement.y,
            z: currentPos.z + correctedMovement.z
        };

        // 물리 바디 이동
        this.rigidBody.setNextKinematicTranslation(nextPos);

        // 카메라는 물리 바디의 눈높이에 따라감. 앉기 상태에 따라 눈높이 조정
        const eyeHeight = this.crouching ? this.eyeHeightOffset * 0.5 : this.eyeHeightOffset;
        this.camera.position.set(nextPos.x, nextPos.y + eyeHeight, nextPos.z);
    }
}
