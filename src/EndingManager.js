import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TextSpriteUI } from './ui/TextSpriteUI.js';

// 엔딩 상태를 관리합니다. 기존 월드 씬 안에서 캐릭터를 보여주고 카메라 연출만 바꿉니다.
export class EndingManager {
    constructor({
        scene,
        camera,
        cameraManager,
        audioManager,
        player,
        washGun,
        washableModels = [],
        economyManager,
        targetMoney = 5000000,
    }) {
        this.scene = scene;
        this.camera = camera;
        this.cameraManager = cameraManager;
        this.player = player;
        this.washGun = washGun;
        this.washableModels = washableModels;
        this.economyManager = economyManager;
        this.audioManager = audioManager;
        this.targetMoney = targetMoney;
        this.isStarted = false;
        this.orbitTime = 0;
        this.target = new THREE.Vector3(0, 16, 0);
        this.biker = null;
        this.mixer = null;
        // 엔딩 전환시의 포스트프로세스 화면전환 변수들입니다.
        this.transitionActive = false;
        this.transitionPhase = 'cover';
        this.transitionProgress = 0;
        this.coverDuration = 0.45;
        this.revealDuration = 0.55;

        // 목표 달성시 엔딩 가능을 알리는 UI입니다.
        this.promptUI = new TextSpriteUI({
            parent: this.camera,
            width: 640,
            height: 96,
            lines: ['목표 달성! E 키로 엔딩 보기'],
            fontSize: 34,
            background: 'rgba(14, 18, 24, 0.72)',
            stroke: 'rgba(78, 195, 255, 0.75)',
            visible: false,
        });
        this.promptSprite = this.promptUI.sprite;

        // 엔딩 메시지 UI
        this.thanksUI = new TextSpriteUI({
            parent: this.camera,
            width: 820,
            height: 180,
            lines: ['등록금을 벌었다~!', '플레이해주셔서 감사합니다'],
            fontSize: 48,
            background: 'rgba(7, 16, 24, 0.68)',
            stroke: 'rgba(255, 255, 255, 0.55)',
            visible: false,
        });
        this.thanksSprite = this.thanksUI.sprite;

        this.endingLight = new THREE.PointLight(0x4ec3ff, 350, 80);
        this.endingLight.position.set(0, 14, 0);
        this.endingLight.visible = false;
        this.scene.add(this.endingLight);

        this.loadBiker();
        this.updateLayout();
        this.bindEvents();
    }

    // E키 연결
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE' && this.canStart()) {
                this.requestStart();
            }
        });
    }

    // 엔딩 가능여부를 판정합니다.
    canStart() {
        return !this.isStarted &&
            !this.transitionActive &&
            this.cameraManager.mode === 'world' &&
            this.economyManager.money >= this.targetMoney &&
            this.biker != null;
    }

    // 트랜지션 효과를 시작합니다. 트랜지션이 끝나면 실제 엔딩이 시작됩니다.
    requestStart() {
        if (!this.canStart()) return;

        this.transitionActive = true;
        this.transitionPhase = 'cover';
        this.transitionProgress = 0;
        this.promptSprite.visible = false;
        this.cameraManager.onStopWashing?.();
        this.player.setInputEnabled(false);
        document.exitPointerLock();
    }

    start() {
        if (this.isStarted) return;

        this.isStarted = true;
        this.orbitTime = 0;
        this.promptSprite.visible = false;
        this.thanksSprite.visible = true;
        this.endingLight.visible = true;
        this.biker.visible = true;

        this.cameraManager.onStopWashing?.();
        this.cameraManager.mode = 'ending';
        this.player.setInputEnabled(false);
        document.exitPointerLock();
        this.washGun.group.visible = false;
        for (const model of this.washableModels) {
            model.group.visible = false;
        }

        this.audioManager.play('clap');
    }

    // FBX 바이커 모델을 다운로드합니다. 애니메이션 하나가 이미 포함되어 있습니다.
    async loadBiker() {
        const loader = new FBXLoader();

        try {
            this.biker = await loader.loadAsync('./biker.fbx');
            this.biker.scale.setScalar(0.25);
            this.biker.position.set(0, 0, 0);
            this.biker.visible = this.isStarted;
            this.scene.add(this.biker);

            this.mixer = new THREE.AnimationMixer(this.biker);
            const clip = this.biker.animations[0];
            if (clip) {
                this.mixer.clipAction(clip).play();
            }
        } catch (error) {
            console.error('Ending biker FBX load error:', error);
        }
    }

    // 엔딩 알림 UI 및 트랜지션 포스트프로세스 유니폼 변수를 업데이트합니다.
    update(delta) {
        this.promptSprite.visible = this.canStart();

        if (this.transitionActive) {
            // delta가 너무 커지는 경우(프레임 드랍 등) 트랜지션이 너무 빠르게 진행되는 것을 방지하기 위해 최대값 (30FPS 기준)을 설정합니다.
            const safeDelta = Math.min(delta, 1 / 30);

            // cover와 reveal 두 단계로 나누어지고, cover 단계에서는 유니폼 값을 0에서 1로 올리고, reveal 단계에서는 1에서 0으로 내립니다. cover가 끝나면 엔딩이 시작되고, reveal이 끝나면 트랜지션이 완전히 종료됩니다.
            if (this.transitionPhase === 'cover') {
                this.transitionProgress = Math.min(
                    this.transitionProgress + safeDelta / this.coverDuration,
                    1
                );

                if (this.transitionProgress >= 1) {
                    this.start();
                    this.transitionPhase = 'reveal';
                }
            } else {
                this.transitionProgress = Math.max(
                    this.transitionProgress - safeDelta / this.revealDuration,
                    0
                );

                if (this.transitionProgress <= 0) {
                    this.transitionActive = false;
                }
            }
        }

        if (!this.isStarted) return;

        this.orbitTime += delta;
        this.updateEndingCamera();
        this.mixer?.update(delta);
    }

    // 한번만 실행되는 레이아웃 업데이트 함수입니다. 엔딩 메시지와 목표 달성 프롬프트의 위치와 크기를 설정합니다.
    updateLayout() {
        this.promptSprite.position.set(0, -0.55, -2);
        this.promptSprite.scale.set(1.9, 0.28, 1);

        this.thanksSprite.position.set(0, 0.72, -2);
        this.thanksSprite.scale.set(2.25, 0.5, 1);
    }

    // 엔딩 씬에서 화면이 빙빙 도는 카메라 연출을 업데이트합니다. 
    updateEndingCamera() {
        const radius = 48;
        const angle = this.orbitTime * 0.55;
        this.camera.position.set(
            Math.cos(angle) * radius,
            9 + Math.sin(this.orbitTime * 0.8) * 1.1,
            Math.sin(angle) * radius
        );
        this.camera.lookAt(this.target);
    }

    // 트랜지션 유니폼 업데이트를 위한 getter 함수입니다. 현재 트랜지션이 진행중이라면 0에서 1 사이의 값을 반환하고, 그렇지 않다면 0을 반환합니다.
    getTransitionProgress() {
        return this.transitionProgress;
    }
}
