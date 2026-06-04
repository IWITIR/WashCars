import * as THREE from 'three';

// 화면 우측 상단의 돈 UI를 담당하는 클래스입니다. MoneyUI는 플레이어가 현재까지 번 돈과 목표 금액을 표시합니다. 돈이 갱신될 때마다 setMoney나 addMoney 메서드를 호출하여 UI를 업데이트할 수 있습니다.
export class MoneyUI {
    constructor({ camera, money = 0, targetMoney = 5000000 }) {
        this.camera = camera;
        this.money = money;
        this.targetMoney = targetMoney;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 96;
        this.context = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.material = new THREE.SpriteMaterial({
            map: this.texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        this.sprite = new THREE.Sprite(this.material);

        this.updateLayout();
        this.sprite.renderOrder = 20;
        this.camera.add(this.sprite);
        
        this.updateUI();
    }

    setMoney(money) {
        this.money = money;
        this.updateUI();
    }

    addMoney(amount) {
        this.setMoney(this.money + amount);
    }

    // 돈 UI를 매프레임마다 업데이트합니다. 현재 돈과 목표 금액을 표시합니다.
    updateUI() {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = 'rgba(14, 18, 24, 0.72)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.font = '46px Arial, sans-serif';
        ctx.fillText('💰', 28, 50);

        ctx.font = '700 34px Arial, sans-serif';
        ctx.fillText(`${this.money.toLocaleString()} / ${this.targetMoney.toLocaleString()}원`, 92, 51);

        this.texture.needsUpdate = true;
    }

    updateLayout() {
        // 카메라 frustrum에서 깊이 2인 단면의 크기를 구합니다.
        // 이를 기반으로 sprite의 위치를 화면 오른쪽 상단에 배치합니다.
        // 이는 윈도우 크기에 동적으로 반응합니다.
        const distance = 2;
        const height = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * distance;
        const width = height * this.camera.aspect;

        const spriteWidth = 1.55;
        const spriteHeight = 0.29;
        const marginX = 0.08;
        const marginY = 0.08;

        this.sprite.scale.set(spriteWidth, spriteHeight, 1);
        this.sprite.position.set(
            width / 2 - marginX - spriteWidth / 2,
            height / 2 - marginY - spriteHeight / 2,
            -distance
        );
    }
}
