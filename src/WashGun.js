import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMaterialFromShader } from './util/createMaterialFromShader.js';
import { loadShader } from './util/loadShader.js';

export class WashGun {
    constructor({ player, camera = player?.camera, scene = player?.scene }) {
        if (!camera) {
            throw new Error('WashGun requires a player or camera.');
        }

        this.player = player;
        this.camera = camera;
        this.scene = scene;
        this.gltfLoader = new GLTFLoader();
        this.parts = {};

        // 워터볼
        this.waterBallMesh = null;
        this.waterBallUniforms = null;
        this.worldUpFromWaterball = new THREE.Vector3(0, 1, 0); // 워터볼 기준 월드 업벡터
        this.inverseWorldQuaternion = new THREE.Quaternion(); // 월드->워터볼 좌표 변환용 쿼터니언 캐시 변수
        this.waterFillLevel = 1;

        // bobbing
        this.bobPhase = 0;
        this.bobAmount = 0;

        // 재장전
        this.reloadTime = 0;
        this.isReloading = false;
        this.reloadStartFillLevel = 1; // 재장전 시작 시점의 fill level을 저장하는 변수
        this.fuelBasePosition = new THREE.Vector3(); // 코드레벨 애니메이션을 위해 위치 캐시
        this.fuelBaseRotation = new THREE.Euler();

        // 물줄기
        this.muzzlePoint = null;
        this.streamGroup = null;
        this.streamConeMesh = null;
        this.streamSprayPoints = null;
        this.streamSprayPositions = null;
        this.streamSpraySeeds = null;
        this.streamSprayCount = 50;
        this.baseWashRadius = 30;
        this.streamWidthScale = 1;
        this.baseSpraySize = 0.072;
        this.streamStart = new THREE.Vector3();
        this.streamEnd = new THREE.Vector3();
        this.streamDirection = new THREE.Vector3();
        this.streamMidPoint = new THREE.Vector3();
        this.streamTime = 0;

        // WashGun 전체 트랜스폼 설정
        this.basePosition = new THREE.Vector3(2, -2, -2);
        this.baseRotation = new THREE.Euler(0, 0, 0);
        this.baseScale = 0.45;
        this.group = new THREE.Group();
        this.group.name = 'WashGun';
        this.group.position.copy(this.basePosition);
        this.group.rotation.copy(this.baseRotation);
        this.group.scale.setScalar(this.baseScale);

        this.attachToCamera();
        this.createWaterStreamEffect();
        this.loadParts();
    }

    attachToCamera() {
        if (this.scene && !this.camera.parent) {
            this.scene.add(this.camera);
        }

        this.camera.add(this.group);
    }

    // 쉐이더와 glb를 로드하고, 워터볼에 셰이더 머테리얼을 적용합니다.
    async loadParts() {
        const entries = Object.entries({
            ball: './glb/WashGunBall.glb',
            body: './glb/WashGunBody.glb',
            fuel: './glb/WashGunFuel.glb',
        });

        try {
            const [loadedParts, vertexShader, fragmentShader] = await Promise.all([
                Promise.all(
                    entries.map(async ([name, path]) => {
                        const gltf = await this.gltfLoader.loadAsync(path);
                        const part = gltf.scene;
                        part.name = `WashGun_${name}`;
                        this.preparePart(part);
                        return [name, part];
                    })
                ),
                loadShader('./shaders/waterball_vert.glsl'),
                loadShader('./shaders/waterball_frag.glsl'),
            ]);

            for (const [name, part] of loadedParts) {
                if (name === 'ball') {
                    this.applyWaterBallMaterial(part, { vertexShader, fragmentShader });
                }

                this.parts[name] = part;
                this.group.add(part);
            }

            this.cacheFuelTransform();

            // 총구 위치 추적용 Object3D 생성
            this.muzzlePoint = new THREE.Object3D();
            this.muzzlePoint.name = 'MuzzlePoint';
            this.parts.body.add(this.muzzlePoint);
            this.muzzlePoint.position.set(0, 3, -7); // 총구 위치에 맞게 조정

        } catch (error) {
            console.error('WashGun asset load error:', error);
        }
    }

    // 물줄기 이펙트를 생성합니다. 이펙트는 Cone 메시와 Spray 파티클로 구성됩니다.
    createWaterStreamEffect() {
        // 콘 메시
        const coneGeometry = new THREE.CylinderGeometry(2.415, 0.0345, 1, 14, 1, true);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0x8fd7ff,
            transparent: true,
            opacity: 0.24,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });

        this.streamConeMesh = new THREE.Mesh(coneGeometry, coneMaterial);
        this.streamConeMesh.name = 'WashGunWaterStreamCone';
        this.streamConeMesh.frustumCulled = false;

        // 스프레이 파티클
        const sprayGeometry = new THREE.BufferGeometry();
        this.streamSprayPositions = new Float32Array(this.streamSprayCount * 3); // x, y, z
        this.streamSpraySeeds = new Float32Array(this.streamSprayCount);
        for (let i = 0; i < this.streamSprayCount; i += 1) {
            this.streamSpraySeeds[i] = Math.random(); // 파티클별 다른 이동량을 위한 시드
        }
        sprayGeometry.setAttribute('position', new THREE.BufferAttribute(this.streamSprayPositions, 3));

        const sprayMaterial = new THREE.PointsMaterial({
            color: 0x9fe2ff,
            size: this.baseSpraySize,
            transparent: true,
            opacity: 0.66,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        });

        this.streamSprayPoints = new THREE.Points(sprayGeometry, sprayMaterial);
        this.streamSprayPoints.name = 'WashGunWaterStreamSpray';
        this.streamSprayPoints.frustumCulled = false;

        // 그룹화
        this.streamGroup = new THREE.Group();
        this.streamGroup.name = 'WashGunWaterStream';
        this.streamGroup.visible = false;
        this.streamGroup.renderOrder = 10; // 다른 메시에 덮어씌워지지 않게 높은 우선순위
        this.streamGroup.add(this.streamConeMesh);
        this.streamGroup.add(this.streamSprayPoints);

        if (this.scene) {
            this.scene.add(this.streamGroup);
        }
    }

    preparePart(part) {
        part.traverse((child) => {
            if (!child.isMesh) return;

            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = false;
        });
    }

    // 워터볼 glb는 바깥 유리공간으로 쓰고, 내부 물은 circle geometry로 별도 생성하여 쉐이더 머테리얼을 적용
    applyWaterBallMaterial(ballPart, { vertexShader, fragmentShader }) {
        const waterBallUniforms = {
            uTime: { value: 0 },
            uFillLevel: { value: this.waterFillLevel },
            uWaterColor: { value: new THREE.Color(0x35b7ff) },
            uWorldUp: { value: new THREE.Vector3(0, 1, 0) },
            uBallCenter: { value: new THREE.Vector3() },
            uBallRadius: { value: 1 },
        };

        const waterBallMaterial = createMaterialFromShader({
            vertexShader,
            fragmentShader,
            uniforms: waterBallUniforms,
            materialOptions: {
                transparent: true,
                depthWrite: false,
            },
        });

        const glassBallMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        let glassMesh = null;

        ballPart.traverse((child) => {
            if (!child.isMesh) return;

            glassMesh ??= child;
            child.material = glassBallMaterial;
        });

        if (!glassMesh) return;

        glassMesh.geometry.computeBoundingSphere();
        const ballCenter = glassMesh.geometry.boundingSphere.center.clone();
        const ballRadius = glassMesh.geometry.boundingSphere.radius;

        // 내부 물 메쉬는 별도 구체로 만들어 유리 안에 배치
        const innerMesh = new THREE.Mesh(
            new THREE.SphereGeometry(ballRadius, 24, 16),
            waterBallMaterial
        );
        innerMesh.material = waterBallMaterial;
        innerMesh.renderOrder = 1; // 내부 워터볼이 유리보다 나중에 렌더링되도록 설정
        glassMesh.add(innerMesh);

        glassMesh.renderOrder = 0;

        waterBallUniforms.uBallCenter.value.copy(ballCenter);
        waterBallUniforms.uBallRadius.value = ballRadius;

        this.waterBallMesh = innerMesh;
        this.waterBallUniforms = waterBallUniforms;
    }

    cacheFuelTransform() {
        const fuel = this.parts.fuel;
        if (!fuel) return;

        this.fuelBasePosition.copy(fuel.position);
        this.fuelBaseRotation.copy(fuel.rotation);
    }

    update(delta) {
        this.updateReload(delta);
        this.updateWaterBall(delta);
        this.updateBob(delta);
    }

    updateWaterStream(isActive, targetPoint) {
        if (!this.streamGroup || !this.streamConeMesh || !this.streamSprayPoints) {
            return;
        }

        if (!isActive || !targetPoint) {
            this.streamGroup.visible = false;
            return;
        }

        if (this.muzzlePoint == null) {
            return;
        }

        const muzzleWorldPos = new THREE.Vector3();
        this.muzzlePoint.getWorldPosition(muzzleWorldPos);
        if (!muzzleWorldPos) {
            this.streamGroup.visible = false;
            return;
        }
        this.streamStart.copy(muzzleWorldPos);
        this.streamEnd.copy(targetPoint);
        this.streamDirection.subVectors(this.streamEnd, this.streamStart);

        const length = this.streamDirection.length();
        if (length < 0.01) {
            this.streamGroup.visible = false;
            return;
        }

        this.streamTime += 0.08;
        this.streamDirection.normalize();
        this.streamMidPoint.copy(this.streamStart).add(this.streamEnd).multiplyScalar(0.5);

        // 스트림 그룹을 총구에서 타겟 방향 물줄기에 맞게 이동
        this.streamGroup.visible = true;
        this.streamGroup.position.copy(this.streamMidPoint);
        // 스트림 방향이 Y축이 되도록 회전 (콘 메시가 스프레이 방향으로 돌려짐)
        this.streamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.streamDirection);

        // 그룹 내 콘 메시 조정
        this.streamConeMesh.position.set(0, 0, 0);
        this.streamConeMesh.scale.set(
            this.streamWidthScale,
            length,
            this.streamWidthScale
        );

        // 스프레이 위치 연출
        const sprayPos = this.streamSprayPoints.geometry.attributes.position;
        for (let i = 0; i < this.streamSprayCount; i += 1) {
            const seed = this.streamSpraySeeds[i];
            // 총구에서 타겟 사이의 거리 비율 (시드 기반 랜덤)
            const travel = 1 - (seed * 1.234 + this.streamTime * 5.678 + i * 9.10) % 1;
            // y 방향이 스프레이 진행 방향
            const y = -length * 0.5 + travel * length;
            // 타겟에 가까울수록 퍼짐이 심함 (스프레이)
            const spread = (0.05 + 2.45 * travel) * this.streamWidthScale;
            // 파티클이 xz방향으로 날아가는 각도
            const angle = seed * Math.PI * 2;

            this.streamSprayPositions[i * 3 + 0] = Math.cos(angle) * spread;
            this.streamSprayPositions[i * 3 + 1] = y;
            this.streamSprayPositions[i * 3 + 2] = Math.sin(angle) * spread;
        }
        sprayPos.needsUpdate = true;
    }

    // 플레이어가 움직일때 자연스럽게 흔들리는 효과(bobbing) update.
    updateBob(delta) {
        const isMoving = this.isPlayerMoving();
        const targetBob = isMoving ? 1 : 0;
        const settleSpeed = isMoving ? 10 : 7;

        this.bobAmount += (targetBob - this.bobAmount) * Math.min(delta * settleSpeed, 1);
        this.bobPhase += delta * 9 * (this.player?.speedMultiplier ?? 1);

        const swing = Math.sin(this.bobPhase);
        const bob = Math.sin(this.bobPhase * 2 + Math.PI / 2);
        const amount = this.bobAmount;

        // 로컬 x/y 축만 흔듬
        this.group.position.set(
            this.basePosition.x + swing * 0.035 * amount,
            this.basePosition.y + bob * 0.025 * amount,
            this.basePosition.z
        );
        this.group.rotation.copy(this.baseRotation);
    }

    // waterBall 쉐이더 유니폼 변수 업데이트
    updateWaterBall(delta) {
        if (!this.waterBallUniforms) return;

        this.waterBallUniforms.uTime.value += delta;
        this.waterBallUniforms.uFillLevel.value = this.waterFillLevel;

        if (!this.waterBallMesh) return;

        // 월드 업 벡터를 워터볼의 로컬좌표계로 변환하여 쉐이더에 전달
        this.waterBallMesh.getWorldQuaternion(this.inverseWorldQuaternion).invert();
        this.worldUpFromWaterball.set(0, 1, 0).applyQuaternion(this.inverseWorldQuaternion).normalize();
        this.waterBallUniforms.uWorldUp.value.copy(this.worldUpFromWaterball);
    }

    // 재장전을 성공적으로 시작하면 true, 아니면 false를 반환
    reload() {
        if (this.isReloading || !this.parts.fuel) return false;

        this.reloadTime = 0;
        this.reloadStartFillLevel = this.waterFillLevel;
        this.isReloading = true;
        return true;
    }

    // 코드레벨에서 애니메이션 부여
    updateReload(delta) {
        const fuel = this.parts.fuel;
        if (!this.isReloading || !fuel) return;

        this.reloadTime += delta;

        const progress = Math.min(this.reloadTime / 0.85, 1);
        // 65%까지 탄창 모션을 끝내고, 이후는 물 차오르는 구간으로 둡니다.
        const reloadMotionProgress = Math.min(progress / 0.65, 1);
        // outProgress: 전체 reload의 25%까지 탄창이 빠짐
        const outProgress = this.easeOut(Math.min(progress / 0.25, 1));
        // inProgress: 35%부터 65%까지 탄창이 다시 들어감 (clamp 0~1)
        const inProgress = this.easeInOut(Math.min(Math.max((progress - 0.35) / 0.3, 0), 1));
        // holdAmount: 0->1->0, 탄창이 빠져 있는 정도
        const holdAmount = outProgress * (1 - inProgress);
        const spinAmount = -Math.sin(reloadMotionProgress * Math.PI);
        // fillAmount: 65%부터 0->1 ease inOut
        const fillProgress = this.easeInOut(Math.max((progress - 0.65) / 0.35, 0));
        // 재장전 전 fillLevel부터 1까지 보간
        this.waterFillLevel = THREE.MathUtils.lerp(this.reloadStartFillLevel, 1, fillProgress);

        fuel.position.set(
            this.fuelBasePosition.x,
            this.fuelBasePosition.y - 0.55 * holdAmount,
            this.fuelBasePosition.z + 0.12 * holdAmount
        );

        fuel.rotation.set(
            this.fuelBaseRotation.x + Math.PI * 1.4 * spinAmount,
            this.fuelBaseRotation.y,
            this.fuelBaseRotation.z + Math.PI * 0.25 * spinAmount
        );

        if (progress >= 1) {
            fuel.position.copy(this.fuelBasePosition);
            fuel.rotation.copy(this.fuelBaseRotation);
            this.isReloading = false;
            this.waterFillLevel = 1;
        }
    }

    // Tweening 헬퍼 함수들
    easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInOut(t) {
        return t * t * (3 - 2 * t);
    }

    // 할당된 player가 움직이는지 판단하는 헬퍼함수.
    isPlayerMoving() {
        const moveState = this.player?.moveState;
        if (!moveState || !this.player?.controls?.isLocked) return false;

        return moveState.forward || moveState.backward || moveState.left || moveState.right;
    }
}
