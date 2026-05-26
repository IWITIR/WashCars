import * as THREE from 'three';

// 게임 내 상태 (플레이어 조작, 랩탑 UI, 일시정지)를 관리하는 시스템입니다.
export class GameMode {
    constructor({
        scene,
        player,
        worldCamera,
        laptopUpgradeUI,
        menuPopup,
        menuVolumePanel,
        audioManager = null,
        aspect,
        onStopWashing = null,
    }) {
        this.scene = scene;
        this.player = player;
        this.worldCamera = worldCamera;
        this.laptopUpgradeUI = laptopUpgradeUI;
        this.menuPopup = menuPopup;
        this.menuVolumePanel = menuVolumePanel;
        this.audioManager = audioManager;
        this.onStopWashing = onStopWashing;
        this.mode = 'world';
        this.mouseCanLock = true;
        this.laptopCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

        this.scene.add(this.laptopCamera);
        this.bindEvents();
    }

    bindEvents() {
        this.player.controls.addEventListener('unlock', () => {
            this.enterPause();
        });

        // 퍼즈 팝업 클릭시 처리
        this.menuPopup?.addEventListener('click', (e) => {
            e.stopPropagation();
            // 볼륨 슬라이더 수정은 무시
            if (this.menuVolumePanel?.contains(e.target)) return;

            this.exitPause();
        });
    }

    // 마우스 클릭으로 인한 모드 변경 처리
    handlePrimaryMouseDown(raycaster, centerPos, mousePos) {
        if (this.mode === 'pause') return false;

        raycaster.setFromCamera(centerPos, this.worldCamera);

        if (this.mode === 'world' && !this.player.controls.isLocked) {
            this.lockPointer();
            return false;
        }

        if (this.mode === 'world' && this.laptopUpgradeUI.isHit(raycaster)) {
            this.enterLaptop();
            return false;
        }

        if (this.mode === 'laptop') {
            this.audioManager?.playOneShot('mouse_click');
            raycaster.setFromCamera(mousePos, this.laptopCamera);
            this.laptopUpgradeUI.handleClick(raycaster);
            return false;
        }

        return this.mode === 'world';
    }

    enterLaptop() {
        if (!this.laptopUpgradeUI.placeCamera(this.laptopCamera, this.worldCamera)) return false;

        this.mode = 'laptop';
        this.onStopWashing?.();
        this.player.setInputEnabled(false);
        this.player.controls.unlock();
        this.player.washGun.group.visible = false;
        return true;
    }

    exitLaptop() {
        if (this.mode !== 'laptop') return;

        this.mode = 'world';
        this.player.setInputEnabled(true);
        this.player.washGun.group.visible = true;
        this.lockPointer();
    }

    enterPause() {
        if (this.mode !== 'world') return;

        this.mode = 'pause';
        this.onStopWashing?.();
        this.player.setInputEnabled(false);
        this.startMouseLockCooldown();
        this.menuPopup?.classList.add('show');
    }

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

    lockPointer() {
        if (!this.mouseCanLock) {
            console.log('Mouse lock is temporarily disabled due to recent unlock. Please wait a moment before trying again.');
            return;
        }

        this.player.controls.lock();
    }

    isWorld() {
        return this.mode === 'world';
    }

    getActiveCamera() {
        return this.mode === 'laptop' ? this.laptopCamera : this.worldCamera;
    }

    resize(nextAspect) {
        this.laptopCamera.aspect = nextAspect;
        this.laptopCamera.updateProjectionMatrix();
    }
}
