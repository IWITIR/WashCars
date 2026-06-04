import * as THREE from 'three';

// 게임 내 카메라 관련 상태와 입력을 처리합니다.
export class CameraManager {
    constructor({
        scene,
        player,
        camera,
        domElement,
        washGun,
        laptopUpgradeUI,
        menuPopup,
        menuVolumePanel,
        audioManager = null,
        onStopWashing = null,
    }) {
        this.scene = scene;
        this.player = player;
        this.camera = camera;
        this.domElement = domElement;
        this.washGun = washGun;
        this.laptopUpgradeUI = laptopUpgradeUI;
        this.menuPopup = menuPopup;
        this.menuVolumePanel = menuVolumePanel;
        this.audioManager = audioManager;
        this.onStopWashing = onStopWashing;
        this.mode = 'world';
        this.mouseCanLock = true;
        this.mouseLockCooldownTimer = null;
        this.isPointerLocked = false;
        this.viewYaw = 0;
        this.viewPitch = 0;
        this.viewQuaternion = new THREE.Quaternion();

        // laptop UI 모드로 전환할때 사용될 변수들입니다.
        this.laptopScreenCenter = new THREE.Vector3();
        this.laptopViewCached = false;
        this.laptopViewPosition = new THREE.Vector3();
        this.laptopViewQuaternion = new THREE.Quaternion();
        // 카메라 회전을 계산할 임시 카메라입니다. 실제로는 사용하지 않습니다.
        this.laptopViewCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        this.upgradeTransitionTime = 0;
        this.upgradeTransitionDuration = 0.45;
        this.upgradeTransitionNextMode = 'world';
        this.upgradeTransitionFromPosition = new THREE.Vector3();
        this.upgradeTransitionToPosition = new THREE.Vector3();
        this.upgradeTransitionFromQuaternion = new THREE.Quaternion();
        this.upgradeTransitionToQuaternion = new THREE.Quaternion();

        // 튜토리얼 카메라 연출 관련 변수들
        this.tutorialFocusTime = 0;
        this.tutorialFocusPhase = 'go'; // go, hold, back
        this.tutorialFocusCallback = null;
        // 카메라 위치/회전 계산용 임시 카메라입니다. 실제로는 사용하지 않습니다.
        // From -> to -> back 순으로 위치/회전이 보간됩니다.
        this.tutorialFocusCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.tutorialFocusDirection = new THREE.Vector3();
        this.tutorialFocusToPosition = new THREE.Vector3();
        this.tutorialFocusToQuaternion = new THREE.Quaternion();
        this.tutorialFocusFromPosition = new THREE.Vector3();
        this.tutorialFocusFromQuaternion = new THREE.Quaternion();
        this.tutorialFocusBackPosition = new THREE.Vector3();
        this.tutorialFocusBackQuaternion = new THREE.Quaternion();

        this.scene.add(this.camera);
        this.player.setInputEnabled(false);
        this.viewQuaternion.setFromEuler(
                new THREE.Euler(this.viewPitch, this.viewYaw, 0, 'YXZ')
        );
        
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.domElement;
            
            if (this.isPointerLocked && this.mode === 'world') {
                this.player.setInputEnabled(true);
            }

            if (!this.isPointerLocked && this.mode === 'world' && this.player.inputEnabled) {
                this.enterPause();
            }
        });

        // world 모드 (플레이어 조작 모드) 시에만 화면 회전 가능
        document.addEventListener('mousemove', (e) => {
            if (this.mode !== 'world' || !this.isPointerLocked) return;

            this.viewYaw -= e.movementX * 0.002;
            this.viewPitch -= e.movementY * 0.002;
            this.viewPitch = THREE.MathUtils.clamp(
                this.viewPitch,
                -Math.PI * 0.49,
                Math.PI * 0.49
            );
            
            this.viewQuaternion.setFromEuler(
                new THREE.Euler(this.viewPitch, this.viewYaw, 0, 'YXZ')
            );
        });

        document.addEventListener('keydown', (e) => {
            // 아무 버튼이나 누르면 exitLaptop 시도 (랩탑 UI 모드에서만 효과)
            if (this.mode === 'laptop' && this.exitLaptop()) return;
        });

        // 재장전 소리 재생; 카메라 책임과 함께 washGun 참조가 여기에 있어서 여기에서 처리
        document.addEventListener('keydown', (e) => {
            if (this.mode === 'world' && e.code === 'KeyR' && this.washGun.reload()) {
                this.audioManager.playOneShot('reload');
            }
        });

        // 퍼즈 팝업 클릭시 처리
        this.menuPopup?.addEventListener('click', (e) => {
            e.stopPropagation();
            // 볼륨 슬라이더 수정은 무시
            if (this.menuVolumePanel?.contains(e.target)) return;

            this.exitPause();
        });
    }

    // 마우스 클릭으로 인한 카메라 모드 변경 처리
    handlePrimaryMouseDown(raycaster, centerPos, mousePos) {
        if (this.mode === 'pause') return false;

        raycaster.setFromCamera(centerPos, this.camera);

        if (this.mode === 'world' && !this.isPointerLocked) {
            this.lockPointer();
            return false;
        }

        if (this.mode === 'world' && this.laptopUpgradeUI.isHit(raycaster)) {
            this.enterLaptop();
            return false;
        }

        if (this.mode === 'laptop') {
            this.audioManager?.playOneShot('mouse_click');
            raycaster.setFromCamera(mousePos, this.camera);
            this.laptopUpgradeUI.handleClick(raycaster);
            return false;
        }

        return this.mode === 'world';
    }

    update(delta) {
        if (this.mode === 'transition') {
            this.updateUpgradeTransition(delta);
            return;
        }

        if (this.mode === 'tutorial') {
            this.updateTutorialFocus(delta);
            return;
        }

        if (this.mode !== 'world') return;

        this.camera.position.copy(this.player.getEyePosition());
        this.camera.quaternion.copy(this.viewQuaternion);
    }

    // 월드 -> 랩탑 UI 모드 전환
    enterLaptop() {
        if (!this.laptopViewCached && !this.cacheLaptopViewTransform()) return false;

        this.onStopWashing?.();
        // 플레이어 이동 listen 끄기
        this.player.setInputEnabled(false);
        // 랩탑 UI 모드에서는 마우스 락 해제하여 커서 보이도록
        document.exitPointerLock();
        // 물총 숨기기
        this.washGun.group.visible = false;
        this.startTransition(this.laptopViewPosition, this.laptopViewQuaternion, 'laptop');
        return true;
    }

    // 랩탑 UI -> 월드 모드 전환
    exitLaptop() {
        if (this.mode !== 'laptop') return false;

        const worldPosition = this.player.getEyePosition();

        this.washGun.group.visible = true;
        this.lockPointer();
        this.startTransition(worldPosition, this.viewQuaternion, 'world');
        return true;
    }

    // 월드 -> 퍼즈 모드 전환 (랩탑 UI에서는 ESC시 나가짐)
    enterPause() {
        if (this.mode !== 'world') return;

        this.mode = 'pause';
        this.onStopWashing?.();
        this.player.setInputEnabled(false);
        this.startMouseLockCooldown();
        this.menuPopup?.classList.add('show');
    }

    // 퍼즈 -> 월드 모드 전환
    exitPause() {
        if (this.mode !== 'pause') return;

        this.mode = 'world';
        this.player.setInputEnabled(true);
        this.menuPopup?.classList.remove('show');
        this.lockPointer();
    }

    // 멱등성있는 마우스 락 쿨다운 함수
    startMouseLockCooldown() {
        this.mouseCanLock = false;
        if (this.mouseLockCooldownTimer) {
            clearTimeout(this.mouseLockCooldownTimer);
        }

        this.mouseLockCooldownTimer = setTimeout(() => {
            this.mouseCanLock = true;
            this.mouseLockCooldownTimer = null;
        }, 1500);
    }

    // 브라우저 보안 설계로 인해 1.5초 정도 마우스 락 쿨다운이 있습니다.
    lockPointer() {
        if (!this.mouseCanLock) {
            console.log('Mouse lock is temporarily disabled due to recent unlock. Please wait a moment before trying again.');
            return;
        }

        this.domElement.requestPointerLock();
    }

    // 월드 조작 복귀를 위한 공통 진입점입니다.
    returnToWorldMode() {
        this.mode = 'world';
        this.player.setInputEnabled(false);
        this.lockPointer();
    }

    // 카메라 위치/회전 전환 트랜지션 시작
    startTransition(toPosition, toQuaternion, nextMode) {
        this.upgradeTransitionFromPosition.copy(this.camera.position);
        this.upgradeTransitionFromQuaternion.copy(this.camera.quaternion);
        this.upgradeTransitionToPosition.copy(toPosition);
        this.upgradeTransitionToQuaternion.copy(toQuaternion);
        this.upgradeTransitionNextMode = nextMode;
        this.upgradeTransitionTime = 0;
        this.mode = 'transition';
    }

    // 트랜지션 모드인 경우 정해진 From/To 위치와 회전을 보간합니다.
    updateUpgradeTransition(delta) {
        this.upgradeTransitionTime += delta;
        const progress = Math.min(this.upgradeTransitionTime / this.upgradeTransitionDuration, 1);
        const eased = progress * progress * (3 - 2 * progress);

        this.camera.position.lerpVectors(
            this.upgradeTransitionFromPosition,
            this.upgradeTransitionToPosition,
            eased
        );
        this.camera.quaternion.slerpQuaternions(
            this.upgradeTransitionFromQuaternion,
            this.upgradeTransitionToQuaternion,
            eased
        );

        if (progress < 1) return;

        this.mode = this.upgradeTransitionNextMode;
        if (this.mode === 'world') {
            this.player.setInputEnabled(true);
        } else if (this.mode === 'laptop') {
            // 마우스락 쿨다운 시작
            this.startMouseLockCooldown();
        }
    }

    // 튜토리얼에서 특정 위치를 바라보는 연출 담당 update
    startTutorialFocus(targetCenter, targetSize, onFinished = null, rotateOnly = false) {
        if (!targetCenter || !targetSize) return false;

        const playerEye = this.player.getEyePosition();
        this.camera.position.copy(playerEye);
        this.camera.quaternion.copy(this.viewQuaternion);
        this.camera.updateMatrixWorld(true);

        // from을 현재 카메라 위치/회전으로,
        // back을 플레이어 시점 위치/회전으로 고정합니다.
        this.tutorialFocusFromPosition.copy(this.camera.position);
        this.tutorialFocusFromQuaternion.copy(this.camera.quaternion);
        this.tutorialFocusBackPosition.copy(playerEye);
        this.tutorialFocusBackQuaternion.copy(this.viewQuaternion);

        // 바라보는 방향의 반대 벡터 (위치 - 타겟)입니다.
        this.tutorialFocusDirection.copy(this.tutorialFocusFromPosition).sub(targetCenter);
        if (this.tutorialFocusDirection.length() < 0.0001) {
            // 너무 가까우면 방향 벡터 계산이 불안정하므로 기본값 사용
            this.tutorialFocusDirection.set(0, 0.4, 1);
        }
        this.tutorialFocusDirection.normalize();

        // rotateOnly 옵션에 따라
        if (rotateOnly) {
            // 위치 이동을 하지 않습니다.
            this.tutorialFocusToPosition.copy(this.tutorialFocusFromPosition);
        } else {
            // 위치 이동을 합니다.
            const baseDistance = this.tutorialFocusFromPosition.distanceTo(targetCenter);
            const distance = THREE.MathUtils.clamp(
                baseDistance + targetSize.length() * 0.25,
                6,
                12
            );
            // 타겟에서 크기 비례 후 clamp된 거리만큼의 위치로 이동합니다.
            this.tutorialFocusToPosition.copy(targetCenter)
                .addScaledVector(this.tutorialFocusDirection, distance)
        }

        // To 위치와 회전을 사용합니다. 회전은 임시 카메라를 사용하여 계산합니다 (왼손 좌표계)
        this.tutorialFocusCamera.position.copy(this.tutorialFocusToPosition);
        this.tutorialFocusCamera.lookAt(targetCenter);
        this.tutorialFocusToQuaternion.copy(this.tutorialFocusCamera.quaternion);

        // 튜토리얼 연출 시작 변수들
        this.tutorialFocusCallback = onFinished;
        this.tutorialFocusPhase = 'go';
        this.tutorialFocusTime = 0;

        this.onStopWashing?.(); // 연출 시작시 세차 중지 콜백
        this.mode = 'tutorial'; // 모드 변경
        // 입력을 해제하고 마우스 락을 잠깐 해제합니다.
        this.player.setInputEnabled(false);
        document.exitPointerLock();
        return true;
    }

    updateTutorialFocus(delta) {
        
        if (this.mode != 'tutorial') return;

        this.tutorialFocusTime += delta;

        if (this.tutorialFocusPhase === 'go') {
            // 0.7초간 포커스 대상에 접근합니다.
            const t = Math.min(this.tutorialFocusTime / 0.7, 1);
            const eased = t * t * (3 - 2 * t);
            this.camera.position.lerpVectors(this.tutorialFocusFromPosition, this.tutorialFocusToPosition, eased);
            this.camera.quaternion.slerpQuaternions(this.tutorialFocusFromQuaternion, this.tutorialFocusToQuaternion, eased);

            if (t < 1) return;
            // go 완료
            this.tutorialFocusPhase = 'hold';
            this.tutorialFocusTime = 0;
            return;
        }

        if (this.tutorialFocusPhase === 'hold') {
            // 0.35초간 포커스 위치를 유지합니다.
            if (this.tutorialFocusTime < 0.35) return;
            // hold 완료
            this.tutorialFocusPhase = 'back';
            this.tutorialFocusTime = 0;
            return;
        }
    
        if (this.tutorialFocusPhase === 'back') {
            // 0.7초간 원래 위치로 돌아갑니다.
            const t = Math.min(this.tutorialFocusTime / 0.7, 1);
            const eased = t * t * (3 - 2 * t);
            this.camera.position.lerpVectors(this.tutorialFocusToPosition, this.tutorialFocusBackPosition, eased);
            this.camera.quaternion.slerpQuaternions(this.tutorialFocusToQuaternion, this.tutorialFocusBackQuaternion, eased);

            if (t < 1) return;
            // back 완료
            const onFinished = this.tutorialFocusCallback;
            this.tutorialFocusCallback = null;
            this.returnToWorldMode();
            onFinished?.(); // 콜백
        }
    }

    cacheLaptopViewTransform() {
        if (!this.laptopUpgradeUI.panel) return false;

        this.laptopUpgradeUI.panel.getWorldPosition(this.laptopScreenCenter);

        // 화면 중앙에서 약간 떨어진 위치
        this.laptopViewPosition.set(
            this.laptopScreenCenter.x,
            this.laptopScreenCenter.y,
            this.laptopScreenCenter.z + 7
        );

        // 회전값은 임시 카메라를 하나 생성하여 LookAt으로 계산합니다.
        // 카메라는 왼손좌표계를 쓰기 때문에 LookAt 결과값이 Object3D와 다릅니다.
        this.laptopViewCamera.position.copy(this.laptopViewPosition);
        this.laptopViewCamera.lookAt(this.laptopScreenCenter);
        this.laptopViewQuaternion.copy(this.laptopViewCamera.quaternion);
        this.laptopViewCamera.updateMatrixWorld(true);

        this.laptopViewCached = true;
        return true;
    }
}
