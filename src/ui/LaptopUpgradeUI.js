import * as THREE from 'three';

export class LaptopUpgradeUI {
    constructor({
        laptopScreen,
        getUpgradeState = () => ({
            level: 0,
            maxLevel: 5,
            cost: 0,
            isMaxed: false,
            canBuy: false,
        }),
        onBuyUpgrade = () => false,
    }) {
        this.laptopScreen = laptopScreen;
        this.getUpgradeState = getUpgradeState;
        this.onBuyUpgrade = onBuyUpgrade;
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
        this.currentPage = 1;
        this.cleanPowerButtonRect = { x: 96, y: 452, width: 232, height: 70 };
        this.waterTankButtonRect = { x: 396, y: 452, width: 232, height: 70 };
        this.sprayRangeButtonRect = { x: 696, y: 452, width: 232, height: 70 };
        this.rewardPerAreaButtonRect = { x: 220, y: 452, width: 232, height: 70 };
        this.completionRewardButtonRect = { x: 572, y: 452, width: 232, height: 70 };
        this.nextPageButtonRect = { x: 886, y: 78, width: 58, height: 58 };
        this.prevPageButtonRect = { x: 886, y: 78, width: 58, height: 58 };

        this.draw();
    }

    tryInitialize() {
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

        const uv = intersects[0].uv;
        const x = uv.x * this.canvas.width;
        const y = (1 - uv.y) * this.canvas.height;

        if (this.currentPage === 1 && this.isInsideRect(x, y, this.nextPageButtonRect)) {
            this.currentPage = 2;
            this.draw();
        } else if (this.currentPage === 2 && this.isInsideRect(x, y, this.prevPageButtonRect)) {
            this.currentPage = 1;
            this.draw();
        } else if (this.currentPage === 1 && this.isInsideRect(x, y, this.cleanPowerButtonRect)) {
            this.buyUpgrade('cleanPower');
        } else if (this.currentPage === 1 && this.isInsideRect(x, y, this.waterTankButtonRect)) {
            this.buyUpgrade('waterTank');
        } else if (this.currentPage === 1 && this.isInsideRect(x, y, this.sprayRangeButtonRect)) {
            this.buyUpgrade('sprayRange');
        } else if (this.currentPage === 2 && this.isInsideRect(x, y, this.rewardPerAreaButtonRect)) {
            this.buyUpgrade('rewardPerArea');
        } else if (this.currentPage === 2 && this.isInsideRect(x, y, this.completionRewardButtonRect)) {
            this.buyUpgrade('completionReward');
        }

        return true;
    }

    isHit(raycaster) {
        if (!this.panel) return false;

        return raycaster.intersectObject(this.panel, false).length > 0;
    }

    buyUpgrade(upgradeKey) {
        this.onBuyUpgrade(upgradeKey);
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

    drawHeader(ctx) {
        ctx.fillStyle = '#4ec3ff';
        ctx.font = '700 56px Arial';
        ctx.fillText('업그레이드', 86, 124);

        ctx.fillStyle = '#d7f3ff';
        ctx.font = '28px Arial';
        ctx.fillText('돈을 지불하고 물총을 업그레이드하세요.', 86, 182);

        ctx.fillStyle = '#9db7c4';
        ctx.font = '700 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.currentPage} / 2`, 854, 114);
        ctx.textAlign = 'left';

        if (this.currentPage === 1) {
            this.drawPageButton(ctx, this.nextPageButtonRect, '>');
        } else {
            this.drawPageButton(ctx, this.prevPageButtonRect, '<');
        }
    }

    drawPageButton(ctx, rect, text) {
        ctx.fillStyle = '#102638';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        ctx.strokeStyle = '#4ec3ff';
        ctx.lineWidth = 4;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.fillStyle = '#d7f3ff';
        ctx.font = '700 34px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    drawUpgradeCard(ctx, { x, y, title, upgradeKey, descriptionLines, buttonRect }) {
        const state = this.getUpgradeState(upgradeKey);

        // 카드 배경
        ctx.fillStyle = '#102638';
        ctx.fillRect(x, y, 284, 300);
        ctx.fillStyle = state.level > 0 ? '#9cff7a' : '#4ec3ff';
        ctx.fillRect(x, y, 284, 10);

        // 카드 타이틀 텍스트
        ctx.fillStyle = '#d7f3ff';
        ctx.font = '700 28px Arial';
        ctx.fillText(title, x + 26, y + 68);

        // 레벨 텍스트
        ctx.fillStyle = '#4ec3ff';
        ctx.font = '700 24px Arial';
        ctx.fillText(`Lv ${state.level} / ${state.maxLevel}`, x + 26, y + 106);

        // 설명 텍스트
        ctx.fillStyle = '#9db7c4';
        ctx.font = '20px Arial';
        for (let i = 0; i < descriptionLines.length; i += 1) {
            ctx.fillText(descriptionLines[i], x + 26, y + 148 + i * 28);
        }

        ctx.fillStyle = state.canBuy || state.isMaxed ? '#d7f3ff' : '#ff9f8f';
        ctx.font = '700 18px Arial';
        ctx.fillText(state.isMaxed ? '가격: -' : `${state.cost.toLocaleString()}원`, x + 26, y + 208);

        // 버튼 배경
        ctx.fillStyle = state.canBuy ? '#4ec3ff' : '#324754';
        ctx.fillRect(buttonRect.x, buttonRect.y, buttonRect.width, buttonRect.height);

        // 버튼 텍스트
        ctx.fillStyle = '#061018';
        ctx.font = '700 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            state.isMaxed ? '최대' : '구매',
            buttonRect.x + buttonRect.width * 0.5,
            buttonRect.y + buttonRect.height * 0.5
        );
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    drawPageOne(ctx) {
        this.drawUpgradeCard(ctx, {
            x: 70,
            y: 238,
            title: '물총 세척력',
            upgradeKey: 'cleanPower',
            descriptionLines: ['더 빠르게', '먼지를 제거합니다.'],
            buttonRect: this.cleanPowerButtonRect,
        });
        this.drawUpgradeCard(ctx, {
            x: 370,
            y: 238,
            title: '물총 수용량',
            upgradeKey: 'waterTank',
            descriptionLines: ['더 많은 물.'],
            buttonRect: this.waterTankButtonRect,
        });
        this.drawUpgradeCard(ctx, {
            x: 670,
            y: 238,
            title: '분사 범위 확장',
            upgradeKey: 'sprayRange',
            descriptionLines: ['더 넓은 범위로', '세척합니다.'],
            buttonRect: this.sprayRangeButtonRect,
        });
    }

    drawPageTwo(ctx) {
        this.drawUpgradeCard(ctx, {
            x: 194,
            y: 238,
            title: '면적당 보수',
            upgradeKey: 'rewardPerArea',
            descriptionLines: ['세차량 당', '획득 보수가 증가합니다.'],
            buttonRect: this.rewardPerAreaButtonRect,
        });
        this.drawUpgradeCard(ctx, {
            x: 546,
            y: 238,
            title: '완료 보수',
            upgradeKey: 'completionReward',
            descriptionLines: ['세차 완료 시', '추가 보수가 증가합니다.'],
            buttonRect: this.completionRewardButtonRect,
        });
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

        this.drawHeader(ctx);

        if (this.currentPage === 1) {
            this.drawPageOne(ctx);
        } else {
            this.drawPageTwo(ctx);
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.strokeRect(12, 12, this.canvas.width - 24, this.canvas.height - 24);

        // 텍스쳐 업데이트 반영
        this.texture.needsUpdate = true;
    }
}
