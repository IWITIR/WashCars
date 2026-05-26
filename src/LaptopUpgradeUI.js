import * as THREE from 'three';

export class LaptopUpgradeUI {
    constructor({ laptopScreen, audioManager }) {
        this.laptopScreen = laptopScreen;
        this.audioManager = audioManager;
        this.screenMesh = null;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 640;
        this.context = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            toneMapped: false,
            transparent: true,
            depthTest: true,
            depthWrite: false,
        });
        this.panel = null;
        this.isReady = false;
        this.cleanPowerLevel = 0;
        this.waterTankLevel = 0;
        this.sprayRangeLevel = 0;
        this.maxUpgradeLevel = 5;
        this.cleanPowerButtonRect = { x: 96, y: 452, width: 232, height: 70 };
        this.waterTankButtonRect = { x: 396, y: 452, width: 232, height: 70 };
        this.sprayRangeButtonRect = { x: 696, y: 452, width: 232, height: 70 };

        this.draw();
    }

    update() {
        if (this.isReady || !this.laptopScreen?.isLoaded || !this.laptopScreen.model) return;

        this.screenMesh = this.findScreenMesh();
        if (!this.screenMesh) {
            return;
        }

        this.panel = this.createPanel(this.screenMesh);
        this.screenMesh.add(this.panel);
        this.isReady = true;
    }

    handleClick(raycaster) {
        if (!this.panel) return false;

        const intersects = raycaster.intersectObject(this.panel, false);
        if (intersects.length === 0 || !intersects[0].uv) return false;
        this.audioManager?.playOneShot('mouse_click');

        const uv = intersects[0].uv;
        const x = uv.x * this.canvas.width;
        const y = (1 - uv.y) * this.canvas.height;

        if (this.isInsideRect(x, y, this.cleanPowerButtonRect)) {
            this.buyUpgrade('cleanPowerLevel');
        } else if (this.isInsideRect(x, y, this.waterTankButtonRect)) {
            this.buyUpgrade('waterTankLevel');
        } else if (this.isInsideRect(x, y, this.sprayRangeButtonRect)) {
            this.buyUpgrade('sprayRangeLevel');
        }

        return true;
    }

    isHit(raycaster) {
        if (!this.panel) return false;

        return raycaster.intersectObject(this.panel, false).length > 0;
    }

    placeCamera(camera, referenceCamera = null) {
        if (!this.panel) return false;

        this.panel.updateWorldMatrix(true, false);

        const center = new THREE.Vector3();
        const normal = new THREE.Vector3(0, 0, 1);
        const quaternion = new THREE.Quaternion();

        this.panel.getWorldPosition(center);
        this.panel.getWorldQuaternion(quaternion);
        normal.applyQuaternion(quaternion).normalize();

        if (referenceCamera && normal.dot(referenceCamera.position.clone().sub(center)) < 0) {
            normal.multiplyScalar(-1);
        }

        camera.position.copy(center).addScaledVector(normal, 7);
        camera.lookAt(center);
        return true;
    }

    buyUpgrade(levelKey) {
        if (this[levelKey] >= this.maxUpgradeLevel) return;

        this[levelKey] += 1;
        this.draw();
    }

    findScreenMesh() {
        let screenMesh = null;

        this.laptopScreen.model.traverse((child) => {
            if (!screenMesh && child.isMesh) {
                screenMesh = child;
            }
        });

        return screenMesh;
    }

    createPanel(screenMesh) {
        screenMesh.geometry.computeBoundingBox();

        const box = screenMesh.geometry.boundingBox;
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        let panel;

        panel = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.92, size.y * 0.92), this.material);
        panel.position.set(center.x + 0, center.y + 0, box.max.z - 0.05);
        panel.rotation.set(-Math.PI * 0.0027, 0, 0);


        panel.renderOrder = 0;
        panel.name = 'LaptopUpgradeUIPanel';
        return panel;
    }

    isInsideRect(x, y, rect) {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }

    draw() {
        const ctx = this.context;
        if (!ctx) return;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 배경
        ctx.fillStyle = '#071018';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#0d2434';
        ctx.fillRect(48, 48, 928, 544);

        ctx.fillStyle = '#4ec3ff';
        ctx.font = '700 56px Arial';
        ctx.fillText('업그레이드', 86, 124);

        ctx.fillStyle = '#d7f3ff';
        ctx.font = '28px Arial';
        ctx.fillText('돈을 지불하고 물총을 업그레이드하세요.', 86, 182);

        // 업그레이드 1 배경
        ctx.fillStyle = '#102638';
        ctx.fillRect(70, 238, 284, 300);
        ctx.fillStyle = this.cleanPowerLevel > 0 ? '#9cff7a' : '#4ec3ff';
        ctx.fillRect(70, 238, 284, 10);
        // 업그레이드 1 텍스트
        ctx.fillStyle = '#d7f3ff';
        ctx.font = '700 28px Arial';
        ctx.fillText('물총 세척력', 96, 306);
        // 업그레이드 1 레벨 텍스트
        ctx.fillStyle = '#4ec3ff';
        ctx.font = '700 24px Arial';
        ctx.fillText(`Lv ${this.cleanPowerLevel} / ${this.maxUpgradeLevel}`, 96, 344);
        // 업그레이드 1 설명 텍스트
        ctx.fillStyle = '#9db7c4';
        ctx.font = '20px Arial';
        ctx.fillText('더 빠르게', 96, 386);
        ctx.fillText('먼지를 제거합니다.', 96, 414);

        // 업그레이드 1 버튼
        ctx.fillStyle = this.cleanPowerLevel >= this.maxUpgradeLevel ? '#324754' : '#4ec3ff';
        ctx.fillRect(
            this.cleanPowerButtonRect.x,
            this.cleanPowerButtonRect.y,
            this.cleanPowerButtonRect.width,
            this.cleanPowerButtonRect.height
        );
        // 업그레이드 1 버튼 텍스트
        ctx.fillStyle = '#061018';
        ctx.font = '700 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.cleanPowerLevel >= this.maxUpgradeLevel ? '최대' : '구매',
            this.cleanPowerButtonRect.x + this.cleanPowerButtonRect.width * 0.5,
            this.cleanPowerButtonRect.y + this.cleanPowerButtonRect.height * 0.5
        );


        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // 업그레이드 2 배경
        ctx.fillStyle = '#102638';
        ctx.fillRect(370, 238, 284, 300);
        ctx.fillStyle = this.waterTankLevel > 0 ? '#9cff7a' : '#4ec3ff';
        ctx.fillRect(370, 238, 284, 10);
        // 업그레이드 2 텍스트
        ctx.fillStyle = '#d7f3ff';
        ctx.font = '700 28px Arial';
        ctx.fillText('물총 수용량', 396, 312);
        // 업그레이드 2 레벨 텍스트
        ctx.fillStyle = '#4ec3ff';
        ctx.font = '700 24px Arial';
        ctx.fillText(`Lv ${this.waterTankLevel} / ${this.maxUpgradeLevel}`, 396, 388);
        // 업그레이드 2 설명 텍스트
        ctx.fillStyle = '#9db7c4';
        ctx.font = '20px Arial';
        ctx.fillText('더 많은 물.', 396, 424);
        // 업그레이드 2 버튼
        ctx.fillStyle = this.waterTankLevel >= this.maxUpgradeLevel ? '#324754' : '#4ec3ff';
        ctx.fillRect(
            this.waterTankButtonRect.x,
            this.waterTankButtonRect.y,
            this.waterTankButtonRect.width,
            this.waterTankButtonRect.height
        );
        // 업그레이드 2 버튼 텍스트
        ctx.fillStyle = '#061018';
        ctx.font = '700 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.waterTankLevel >= this.maxUpgradeLevel ? '최대' : '구매',
            this.waterTankButtonRect.x + this.waterTankButtonRect.width * 0.5,
            this.waterTankButtonRect.y + this.waterTankButtonRect.height * 0.5
        );


        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // 업그레이드 3 배경
        ctx.fillStyle = '#102638';
        ctx.fillRect(670, 238, 284, 300);
        ctx.fillStyle = this.sprayRangeLevel > 0 ? '#9cff7a' : '#4ec3ff';
        ctx.fillRect(670, 238, 284, 10);
        // 업그레이드 3 텍스트
        ctx.fillStyle = '#d7f3ff';
        ctx.font = '700 28px Arial';
        ctx.fillText('분사 범위 확장', 696, 312);
        // 업그레이드 3 레벨 텍스트
        ctx.fillStyle = '#4ec3ff';
        ctx.font = '700 24px Arial';
        ctx.fillText(`Lv ${this.sprayRangeLevel} / ${this.maxUpgradeLevel}`, 696, 388);
        // 업그레이드 3 설명 텍스트
        ctx.fillStyle = '#9db7c4';
        ctx.font = '20px Arial';
        ctx.fillText('더 넓은 범위로', 696, 424);

        // 업그레이드 3 버튼
        ctx.fillStyle = this.sprayRangeLevel >= this.maxUpgradeLevel ? '#324754' : '#4ec3ff';
        ctx.fillRect(
            this.sprayRangeButtonRect.x,
            this.sprayRangeButtonRect.y,
            this.sprayRangeButtonRect.width,
            this.sprayRangeButtonRect.height
        );
        // 업그레이드 3 버튼 텍스트
        ctx.fillStyle = '#061018';
        ctx.font = '700 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.sprayRangeLevel >= this.maxUpgradeLevel ? '최대' : '구매',
            this.sprayRangeButtonRect.x + this.sprayRangeButtonRect.width * 0.5,
            this.sprayRangeButtonRect.y + this.sprayRangeButtonRect.height * 0.5
        );
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.strokeRect(12, 12, this.canvas.width - 24, this.canvas.height - 24);

        // 텍스쳐 업데이트 반영
        this.texture.needsUpdate = true;
    }
}
