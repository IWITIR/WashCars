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

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE' && this.canStart()) {
                this.start();
            }
        });
    }

    canStart() {
        return !this.isStarted &&
            this.cameraManager.mode === 'world' &&
            this.economyManager.money >= this.targetMoney &&
            this.biker != null;
    }

    start() {
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

    update(delta) {
        this.promptSprite.visible = this.canStart();
        if (!this.isStarted) return;

        this.orbitTime += delta;
        this.updateEndingCamera();
        this.mixer?.update(delta);
    }

    updateLayout() {
        this.promptSprite.position.set(0, -0.55, -2);
        this.promptSprite.scale.set(1.9, 0.28, 1);

        this.thanksSprite.position.set(0, 0.72, -2);
        this.thanksSprite.scale.set(2.25, 0.5, 1);
    }

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
}
