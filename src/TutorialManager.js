import * as THREE from 'three';
import { TextSpriteUI } from './ui/TextSpriteUI.js';
import { UI_BILLBOARD } from './RenderOrder.js';

const WASH_TARGET_MONEY = 50000;

// 튜토리얼 상태를 관리하는 클래스입니다. 단, 카메라는 CameraManager의 책임이므로 cameraManager를 이용합니다.
export class TutorialManager {
    constructor({
        camera,
        player,
        cameraManager,
        washGun,
        economyManager,
        getActiveCar,
        getLaptopTarget,
        targetMoney = 5000000,
    }) {
        this.camera = camera;
        this.player = player;
        this.cameraManager = cameraManager;
        this.washGun = washGun;
        this.economyManager = economyManager;
        this.getActiveCar = getActiveCar;
        this.getLaptopTarget = getLaptopTarget;
        this.targetMoney = targetMoney;

        this.enabled = false;
        this.state = 'idle';
        this.startMoney = 0;
        this.upgradePurchased = false;
        this.goalWaitTime = 0;

        this.focusCenter = new THREE.Vector3();
        this.focusSize = new THREE.Vector3();

        // 각 단계별로 바뀔 설명 UI
        this.stepUI = new TextSpriteUI({
            parent: this.camera,
            width: 980,
            height: 170,
            lines: [''],
            fontSize: 30,
            textAlign: 'center',
            background: 'rgba(8, 12, 18, 0.84)',
            stroke: 'rgba(78, 195, 255, 0.75)',
            renderOrder: UI_BILLBOARD,
            visible: false,
        });
        this.stepUI.setTransform(
            new THREE.Vector3(0, 0.8, -2),
            new THREE.Vector3(2.5, 0.42, 1)
        );
    }

    // 튜토리얼 시작
    start() {
        this.enabled = true;
        this.state = 'wash';
        this.startMoney = this.economyManager.money;
        this.upgradePurchased = false;
        this.goalWaitTime = 0;

        this.stepUI.visible = true;
        this.stepUI.setLines([
            'WASD로 이동 / 좌클릭 세척',
            `차에 좌클릭하여 세척하세요 0/${WASH_TARGET_MONEY}`,
        ]);

        const activeCar = this.getActiveCar?.();
        this.startFocusOnObject(activeCar?.group ?? null, true);
    }

    skip() {
        this.finish();
    }

    // 튜토리얼 종료
    finish() {
        this.enabled = false;
        this.state = 'done';
        this.stepUI.visible = false;
        this.washGun.group.visible = true;
        this.cameraManager.returnToWorldMode();
    }

    // 각 단계별로 맞는 update함수를 실행합니다.
    update(delta) {
        if (!this.enabled) return;

        if (this.state === 'wash') {
            this.updateWashStep();
            return;
        }

        if (this.state === 'upgrade') {
            this.updateUpgradeStep();
            return;
        }

        if (this.state === 'goal') {
            this.updateGoalStep(delta);
        }
    }

    // 카메라에서 거리 2 떨어진 수직 단면 기준으로 UI의 크기를 조절해줍니다.
    updateLayout() {
        const distance = 2;
        const height = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * distance;
        const width = height * this.camera.aspect;

        this.stepUI.setTransform(
            new THREE.Vector3(0, height * 0.34, -distance),
            new THREE.Vector3(2.5, 0.42, 1)
        );
    }

    // 세척 튜토리얼 단계 업데이트
    updateWashStep() {
        const progress = Math.min(
            Math.max(this.economyManager.money - this.startMoney, 0),
            WASH_TARGET_MONEY
        );

        const lines = [
            'WASD로 이동 / 좌클릭 세척',
            `차에 좌클릭하여 세척하세요 ${Math.round(progress)}/${WASH_TARGET_MONEY}`,
        ];

        if (this.washGun.waterAmount <= 0.01) {
            lines.push('물이 부족합니다. R키를 눌러 재장전하세요.');
        }

        this.stepUI.setLines(lines);

        if (progress < WASH_TARGET_MONEY) return;

        // 세척 목표 달성 감지되면 넘어갑니다.
        this.state = 'upgrade';
        const laptopTarget = this.getLaptopTarget?.();
        this.startFocusOnObject(laptopTarget);
    }

    // 업그레이드 튜토리얼 단계 업데이트
    updateUpgradeStep() {
        this.stepUI.setLines([
            '돈을 사용해 업그레이드를 할 수 있습니다.',
            '노트북을 클릭하고 아무거나 업그레이드하세요.',
        ]);

        if (!this.upgradePurchased) return;

        // 업그레이드 구매가 감지되면 넘어갑니다.
        this.state = 'goal';
        this.goalWaitTime = 0;
        this.stepUI.setLines([
            `${this.targetMoney.toLocaleString()}원의 등록금을 모아야 합니다!`,
            '클릭하면 튜토리얼이 종료됩니다.',
        ]);
    }

    // 목표 알림 단계 업데이트
    updateGoalStep(delta) {
        // 대기시간을 캐시해줍니다. Goal 단계의 안내가 실수로 클릭해서 바로 넘어가지지 않게
        // 약 2초 정도 기다려준뒤 넘어갑니다.
        this.goalWaitTime += delta;
        return;
    }

    // laptop UI쪽에서 콜백으로 호출해줍니다.
    notifyUpgradePurchased(success) {
        if (!this.enabled || this.state !== 'upgrade') return;
        if (success) this.upgradePurchased = true;
    }

    // TutorialManager가 마우스 입력을 처리하는 함수입니다. 마우스 입력이 필요없는 상태인 경우 false를 반환합니다.
    handlePrimaryMouseDown() {
        if (!this.enabled) return false;

        if (this.state === 'goal' && this.goalWaitTime >= 2.0) {
            this.finish();
            return true;
        }

        return false;
    }

    // CameraManager를 이용해 차/노트북에 포커스하는 함수
    startFocusOnObject(object, rotateOnly = false) {
        if (!object) return;

        const box = new THREE.Box3().setFromObject(object);
        if (box.isEmpty()) return;

        box.getCenter(this.focusCenter);
        box.getSize(this.focusSize);

        const started = this.cameraManager.startTutorialFocus(
            this.focusCenter,
            this.focusSize,
            () => {
                // 포커스가 끝난 후 실행되는 콜백
                this.washGun.group.visible = true;
            },
            rotateOnly
        );
        if (!started) return;
        this.washGun.group.visible = false;
    }
}
