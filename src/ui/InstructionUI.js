import * as THREE from 'three';

export class InstructionUI {
    constructor({ camera }) {
        this.camera = camera;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 200;
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

        this.draw();
    }

    draw() {
        const ctx = this.context;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = 'rgba(14, 18, 24, 0.62)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '120 24px Arial, sans-serif';

        ctx.fillText('세차 알바로 등록금을 벌자!', 28, 35);
        ctx.fillText('WASD 이동', 28, 70);
        ctx.fillText('Shift 달리기 / Space 점프 / C 앉기', 28, 105);
        ctx.fillText('좌클릭 세척 / R 장전', 28, 140);
        ctx.fillText('ESC 일시정지', 28, 175);

        this.texture.needsUpdate = true;
    }

    updateLayout() {
        // 카메라 frustrum에서 깊이 2인 단면의 크기를 구합니다.
        // 이를 기반으로 sprite의 위치를 화면 좌하단에 배치합니다.
        // 이는 윈도우 크기에 동적으로 반응합니다.
        const distance = 2;
        const height = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * distance;
        const width = height * this.camera.aspect;

        const spriteWidth = 1.18;
        const spriteHeight = 0.5;
        const marginX = 0.08;
        const marginY = 0.08;

        this.sprite.scale.set(spriteWidth, spriteHeight, 1);
        this.sprite.position.set(
            -width / 2 + marginX + spriteWidth / 2,
            -height / 2 + marginY + spriteHeight / 2,
            -distance
        );
    }
}
