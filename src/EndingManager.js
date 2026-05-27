import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 엔딩 시퀀스를 관리합니다. 별도의 씬을 만들고 postprocessing 패스를 활용해 전환합니다.
export class EndingManager {
    constructor({
        composer,
        worldScene,
        worldCamera,
        worldRenderPass,
        outputPass,
        cameraManager,
        player,
        washGun,
        economyManager,
        targetMoney = 5000000,
    }) {
        this.composer = composer;
        this.worldScene = worldScene;
        this.worldCamera = worldCamera;
        this.worldRenderPass = worldRenderPass;
        this.outputPass = outputPass;
        this.cameraManager = cameraManager;
        this.player = player;
        this.washGun = washGun;
        this.economyManager = economyManager;
        this.targetMoney = targetMoney;
        this.isStarted = false;
        this.transitionDone = false;
        this.transitionTime = 0;
        this.transitionDuration = 1.4;
        this.orbitTime = 0;
        this.target = new THREE.Vector3(0, 2.2, 0);

        this.endingScene = new THREE.Scene();
        this.endingScene.background = new THREE.Color(0x071018);
        this.endingCamera = new THREE.PerspectiveCamera(
            this.worldCamera.fov,
            this.worldCamera.aspect,
            this.worldCamera.near,
            this.worldCamera.far
        );
        this.endingScene.add(this.endingCamera);

        const gltfLoader = new GLTFLoader();
        this.garage = gltfLoader.load(
            './glb/Garage.glb',
            (gltf) => {
                this.model = gltf.scene;
                this.model.scale.setScalar(0.25);
                this.endingScene.add(this.model);
            },
            undefined,
            (error) => {
                console.error('Garage GLB load error:', error);
            }
        );
        this.garageDoor = gltfLoader.load(
            './glb/GarageDoor.glb',
            (gltf) => {
                this.doorModel = gltf.scene;
                this.doorModel.scale.setScalar(0.25);
                this.endingScene.add(this.doorModel);
            },
            undefined,
            (error) => {
                console.error('Garage Door GLB load error:', error);
            }
        );

        // 렌더 패스 넣기
        this.endingRenderPass = new RenderPass(this.endingScene, this.endingCamera);
        this.transitionPass = new RenderTransitionPass(
            this.endingScene,
            this.endingCamera,
            this.worldScene,
            this.worldCamera
        );
        this.transitionPass.setTexture(this.createTransitionTexture());
        this.transitionPass.setTransition(0);

        this.promptSprite = this.createTextSprite({
            width: 640,
            height: 96,
            lines: ['목표 달성! E 키로 엔딩 보기'],
            fontSize: 34,
            background: 'rgba(14, 18, 24, 0.72)',
            stroke: 'rgba(78, 195, 255, 0.75)',
        });
        this.promptSprite.visible = false;
        this.worldCamera.add(this.promptSprite);

        this.thanksSprite = this.createTextSprite({
            width: 820,
            height: 180,
            lines: ['플레이해주셔서 감사합니다'],
            fontSize: 48,
            background: 'rgba(7, 16, 24, 0.68)',
            stroke: 'rgba(255, 255, 255, 0.55)',
        });
        this.thanksSprite.position.set(0, 0.72, -2);
        this.thanksSprite.scale.set(2.25, 0.5, 1);
        this.endingCamera.add(this.thanksSprite);

        this.mixer = null;

        this.setupEndingLighting();
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
            this.economyManager.money >= this.targetMoney;
    }

    start() {
        this.isStarted = true;
        this.transitionDone = false;
        this.transitionTime = 0;
        this.orbitTime = 0;
        this.promptSprite.visible = false;
        this.cameraManager.onStopWashing?.();
        this.cameraManager.mode = 'ending';
        this.player.setInputEnabled(false);
        document.exitPointerLock();
        this.washGun.group.visible = false;

        this.transitionPass.setTransition(0);
        this.composer.removePass(this.worldRenderPass);
        this.composer.removePass(this.outputPass);
        this.composer.addPass(this.transitionPass);
        this.composer.addPass(this.outputPass);

        this.loadDancer();
    }

    async loadDancer() {
        const loader = new FBXLoader();
        const biker = await loader.loadAsync('./biker.fbx');
        biker.scale.setScalar(0.05);
        biker.position.set(0, 0, 0);
        this.mixer = new THREE.AnimationMixer(biker);
        this.mixer.clipAction(biker.animations[0]).play();
        this.endingScene.add(biker);
    }

    update(delta) {
        this.promptSprite.visible = this.canStart();
        if (!this.isStarted) return;

        this.transitionTime += delta;
        this.orbitTime += delta;
        this.updateEndingCamera();
        this.mixer?.update(delta);

        if (!this.transitionDone) {
            this.updateTransition();
        }
    }

    updateLayout() {
        const distance = 2;
        this.promptSprite.position.set(0, -0.55, -distance);
        this.promptSprite.scale.set(1.9, 0.28, 1);

        this.endingCamera.aspect = this.worldCamera.aspect;
        this.endingCamera.updateProjectionMatrix();
    }

    updateTransition() {
        const progress = Math.min(this.transitionTime / this.transitionDuration, 1);
        this.transitionPass.setTransition(progress);

        if (progress < 1) return;

        this.transitionDone = true;
        this.composer.removePass(this.transitionPass);
        this.composer.removePass(this.outputPass);
        this.composer.addPass(this.endingRenderPass);
        this.composer.addPass(this.outputPass);
    }

    updateEndingCamera() {
        const radius = 18;
        const angle = this.orbitTime * 0.55;
        this.endingCamera.position.set(
            Math.cos(angle) * radius,
            6.5 + Math.sin(this.orbitTime * 0.8) * 1.1,
            Math.sin(angle) * radius
        );
        this.endingCamera.lookAt(this.target);
    }

    setupEndingLighting() {
        this.endingScene.add(new THREE.AmbientLight(0xffffff, 1.4));

        const endingDirectionalLight = new THREE.DirectionalLight(0xffffff, 8);
        endingDirectionalLight.position.set(5, 10, 8);
        this.endingScene.add(endingDirectionalLight);

        const endingPointLight = new THREE.PointLight(0x4ec3ff, 200, 40);
        endingPointLight.position.set(0, 10, 0);
        this.endingScene.add(endingPointLight);
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

    createTransitionTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(canvas.width, canvas.height);

        for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
                const dx = x / canvas.width - 0.5;
                const dy = y / canvas.height - 0.5;
                const radius = Math.sqrt(dx * dx + dy * dy);
                const noise = Math.random() * 0.35;
                const value = Math.min(255, Math.max(0, (radius * 2 + noise) * 255));
                const index = (y * canvas.width + x) * 4;
                imageData.data[index + 0] = value;
                imageData.data[index + 1] = value;
                imageData.data[index + 2] = value;
                imageData.data[index + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return texture;
    }
}
