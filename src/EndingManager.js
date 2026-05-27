import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// 엔딩 상태를 관리합니다. 기존 월드 씬 안에서 캐릭터를 보여주고 카메라 연출만 바꿉니다.
export class EndingManager {
    constructor({
        scene,
        camera,
        cameraManager,
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
        this.targetMoney = targetMoney;
        this.isStarted = false;
        this.orbitTime = 0;
        this.target = new THREE.Vector3(0, 16, 0);
        this.biker = null;
        this.mixer = null;

        this.promptSprite = this.createTextSprite({
            width: 640,
            height: 96,
            lines: ['목표 달성! E 키로 엔딩 보기'],
            fontSize: 34,
            background: 'rgba(14, 18, 24, 0.72)',
            stroke: 'rgba(78, 195, 255, 0.75)',
        });
        this.promptSprite.visible = false;
        this.camera.add(this.promptSprite);

        this.thanksSprite = this.createTextSprite({
            width: 820,
            height: 180,
            lines: ['우승!', '플레이해주셔서 감사합니다'],
            fontSize: 48,
            background: 'rgba(7, 16, 24, 0.68)',
            stroke: 'rgba(255, 255, 255, 0.55)',
        });
        this.thanksSprite.visible = false;
        this.camera.add(this.thanksSprite);

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

    createTextSprite({ width, height, lines, fontSize, background, stroke }) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 5;
        ctx.strokeRect(3, 3, width - 6, height - 6);
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lineHeight = fontSize * 1.25;
        const startY = height * 0.5 - (lines.length - 1) * lineHeight * 0.5;
        for (let i = 0; i < lines.length; i += 1) {
            ctx.fillText(lines[i], width * 0.5, startY + i * lineHeight);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(material);
        sprite.renderOrder = 200;
        return sprite;
    }
}
