import * as THREE from 'three';
import { Model } from './Model.js';

// 세척 가능한 모델 : 메시마다 dirt overlay를 생성합니다.
export class WashableModel extends Model {
    constructor({
        dirtColor = 0x332211,
        dirtRoughness = 0.9,
        dirtScale = 1.0,
        washRadius = 30,
        washStrength = 0.08,
        maskSize = 1024,
        cleanTargetScore = 28000,
        progressSampleStep = 4,
        ...modelOptions
    }) {
        super(modelOptions);

        this.dirtColor = dirtColor;
        this.dirtRoughness = dirtRoughness;
        this.dirtScale = dirtScale;
        this.washRadius = washRadius;
        this.washStrength = washStrength;
        this.maskSize = maskSize;
        this.cleanTargetScore = cleanTargetScore;
        this.progressSampleStep = progressSampleStep;
        this.cleanScore = 0;
        this.washProgress = 0;
        this.progressUpdateTime = 0;
        this.progressBillboard = null;
        this.progressFill = null;
        this.progressBarWidth = 1;
        this.washTargets = [];
    }

    // 콜백 함수 오버라이드
    onModelLoaded() {
        if (!this.model) return;

        const sourceMeshes = [];

        // 모델에서 모든 메시를 수집
        this.model.traverse((child) => {
            if (!child.isMesh || !child.geometry?.attributes?.uv) return;
            if (Array.isArray(child.material)) return;

            sourceMeshes.push(child);
        });

        // 수집된 메시마다 오버레이 생성 및 저장
        for (const sourceMesh of sourceMeshes) {
            const overlay = this.createDirtOverlay(sourceMesh);
            if (!overlay) continue;

            sourceMesh.add(overlay.mesh);
            this.washTargets.push(overlay);
        }

        this.createProgressBillboard();
    }

    createDirtOverlay(sourceMesh) {
        const canvas = document.createElement('canvas');
        canvas.width = this.maskSize;
        canvas.height = this.maskSize;

        const context = canvas.getContext('2d');
        if (!context) return null;

        context.fillStyle = 'white';
        context.fillRect(0, 0, this.maskSize, this.maskSize);

        const maskTexture = new THREE.CanvasTexture(canvas);
        maskTexture.flipY = false;

        const dirtMaterial = new THREE.MeshStandardMaterial({
            color: this.dirtColor,
            roughness: this.dirtRoughness,
            metalness: 0,
            transparent: true,
            alphaMap: maskTexture,
            alphaTest: 0.05,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            side: THREE.FrontSide,
        });

        const dirtMesh = new THREE.Mesh(sourceMesh.geometry, dirtMaterial);
        dirtMesh.name = `${sourceMesh.name || 'washable'}_dirt`;
        dirtMesh.scale.setScalar(this.dirtScale);
        dirtMesh.renderOrder = (sourceMesh.renderOrder || 0) + 1;
        dirtMesh.raycast = THREE.Mesh.prototype.raycast;
        dirtMesh.washableModel = this;

        return {
            sourceMesh,
            mesh: dirtMesh,
            canvas,
            context,
            maskTexture,
        };
    }

    getWashMeshes() {
        return this.washTargets.map((target) => target.mesh);
    }

    wash(hit, radius = this.washRadius) {
        if (!hit?.object || !hit.uv) return;

        const target = this.washTargets.find((item) => item.mesh === hit.object);
        if (!target) return;

        const x = hit.uv.x * this.maskSize;
        const y = hit.uv.y * this.maskSize;
        const strength = Math.min(Math.max(this.washStrength, 0), 1);
        const gradient = target.context.createRadialGradient(x, y, 0, x, y, radius);
        const dirtyBefore = this.measureDirtyAmount(target, x, y, radius);

        gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
        gradient.addColorStop(0.65, `rgba(0, 0, 0, ${strength * 0.7})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        target.context.beginPath();
        target.context.arc(x, y, radius, 0, Math.PI * 2);
        target.context.fillStyle = gradient;
        target.context.fill();
        target.maskTexture.needsUpdate = true;

        const dirtyAfter = this.measureDirtyAmount(target, x, y, radius);
        this.addCleanScore(Math.max(0, dirtyBefore - dirtyAfter));
    }

    measureDirtyAmount(target, centerX, centerY, radius) {
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(this.maskSize - 1, Math.ceil(centerX + radius));
        const minY = Math.max(0, Math.floor(centerY - radius));
        const maxY = Math.min(this.maskSize - 1, Math.ceil(centerY + radius));
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const imageData = target.context.getImageData(minX, minY, width, height).data;

        let dirtyAmount = 0;
        const radiusSquared = radius * radius;

        for (let y = 0; y < height; y += this.progressSampleStep) {
            for (let x = 0; x < width; x += this.progressSampleStep) {
                const dx = minX + x - centerX;
                const dy = minY + y - centerY;
                if (dx * dx + dy * dy > radiusSquared) continue;

                const index = (y * width + x) * 4;
                dirtyAmount += imageData[index] / 255;
            }
        }

        return dirtyAmount;
    }

    addCleanScore(cleanAmount) {
        if (cleanAmount <= 0) return;

        this.cleanScore = Math.min(this.cleanScore + cleanAmount, this.cleanTargetScore);
        this.washProgress = this.cleanScore / this.cleanTargetScore;
    }

    createProgressBillboard() {
        const box = new THREE.Box3().setFromObject(this.model);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        this.progressBarWidth = Math.max(6, size.x * 0.35);
        const barHeight = Math.max(0.35, this.progressBarWidth * 0.06);

        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x121820,
            transparent: true,
            opacity: 0.78,
            depthTest: false,
            depthWrite: false,
        });
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: 0x4ec3ff,
            depthTest: false,
            depthWrite: false,
        });

        this.progressBillboard = new THREE.Group();
        this.progressBillboard.name = 'WashProgressBillboard';
        this.progressBillboard.position.set(center.x, center.y + size.y * 0.65, center.z);
        this.progressBillboard.renderOrder = 100;

        const background = new THREE.Mesh(
            new THREE.PlaneGeometry(this.progressBarWidth, barHeight),
            backgroundMaterial
        );
        background.renderOrder = 100;

        this.progressFill = new THREE.Mesh(
            new THREE.PlaneGeometry(this.progressBarWidth, barHeight),
            fillMaterial
        );
        this.progressFill.renderOrder = 101;
        this.progressFill.position.z = 0.01;
        this.progressFill.visible = false;

        this.progressBillboard.add(background);
        this.progressBillboard.add(this.progressFill);
        this.group.add(this.progressBillboard);
    }

    update(delta, camera) {
        if (!this.progressBillboard || !this.progressFill) return;

        this.progressUpdateTime -= delta;
        if (this.progressUpdateTime <= 0) {
            this.progressUpdateTime = 0.1;
            this.updateProgressFill();
        }

        if (camera) {
            this.progressBillboard.lookAt(camera.position);
        }
    }

    updateProgressFill() {
        const progress = this.getWashProgress();
        this.progressFill.visible = progress > 0;
        if (!this.progressFill.visible) return;

        this.progressFill.scale.x = progress;
        this.progressFill.position.x = -this.progressBarWidth * 0.5 + this.progressBarWidth * progress * 0.5;
    }

    getWashProgress() {
        return this.washProgress;
    }
}
