import * as THREE from 'three';
import { TextSpriteUI } from './TextSpriteUI.js';

// 기본적으로 TextSpriteUI이지만, 화면 resize에 대응하여 위치를 조정합니다.
export class InstructionUI {
    constructor({ camera }) {
        this.camera = camera;
        this.textUI = new TextSpriteUI({
            parent: camera,
            width: 512,
            height: 200,
            lines: [
                '세차 알바로 등록금을 벌자!',
                'WASD 이동',
                'Shift 달리기 / Space 점프 / C 앉기',
                '좌클릭 세척 / R 장전',
                'ESC 일시정지',
            ],
            fontSize: 24,
            fontWeight: 600,
            textAlign: 'left',
            paddingX: 28,
            background: 'rgba(14, 18, 24, 0.62)',
            stroke: 'rgba(255, 255, 255, 0.28)',
            lineWidth: 2,
            renderOrder: 20,
        });
        this.sprite = this.textUI.sprite;

        this.updateLayout();
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
