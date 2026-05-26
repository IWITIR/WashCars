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
        this.isPointerLocked = false;
        this.viewYaw = 0;
        this.viewPitch = 0;
        this.viewQuaternion = new THREE.Quaternion();
        this.laptopScreenCenter = new THREE.Vector3();
        this.laptopViewCached = false;
        this.laptopViewPosition = new THREE.Vector3();
        this.laptopViewQuaternion = new THREE.Quaternion();
        // 카메라 회전을 계산할 임시 카메라입니다. 실제로는 사용하지 않습니다.
        this.laptopViewCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

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

            if (!this.isPointerLocked && this.mode === 'world') {
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

    update() {
        if (this.mode !== 'world') return;

        this.camera.position.copy(this.player.getEyePosition());
        this.camera.quaternion.copy(this.viewQuaternion);
    }

    // 월드 -> 랩탑 UI 모드 전환
    enterLaptop() {
        if (!this.applyLaptopCamera()) return false;

        this.mode = 'laptop';
        this.onStopWashing?.();
        // 플레이어 이동 listen 끄기
        this.player.setInputEnabled(false);
        // 랩탑 UI 모드에서는 마우스 락 해제하여 커서 보이도록
        document.exitPointerLock();
        // 물총 숨기기
        this.washGun.group.visible = false;
        return true;
    }

    // 랩탑 UI -> 월드 모드 전환
    exitLaptop() {
        if (this.mode !== 'laptop') return false;

        this.mode = 'world';
        this.player.setInputEnabled(true);
        this.washGun.group.visible = true;
        this.lockPointer();
        this.update();
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

    startMouseLockCooldown() {
        this.mouseCanLock = false;
        setTimeout(() => {
            this.mouseCanLock = true;
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

    applyLaptopCamera() {
        // 랩탑 모드에서의 카메라 위치를 한번 계산하고 이후는 캐싱하여 사용합니다.
        if (!this.laptopViewCached && !this.cacheLaptopViewTransform()) return false;

        this.camera.position.copy(this.laptopViewPosition);
        this.camera.quaternion.copy(this.laptopViewQuaternion);
        return true;
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
