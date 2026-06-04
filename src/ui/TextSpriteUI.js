import * as THREE from 'three';
import { UI_BILLBOARD } from '../RenderOrder.js';

// canvas에 텍스트를 그리고, 그 텍스처를 Three.js 스프라이트에 적용하여 텍스트 UI를 띄웁니다.
// 화면 좌측 하단의 instuction UI나, 튜토리얼 단계별 설명 UI 등에 사용됩니다.
export class TextSpriteUI {
    constructor({
        parent,
        width,
        height,
        lines,
        fontSize,
        fontWeight = 700,
        textAlign = 'center',
        background = 'rgba(14, 18, 24, 0.72)',
        stroke = 'rgba(255, 255, 255, 0.35)',
        lineWidth = 4,
        paddingX = 0,
        renderOrder = UI_BILLBOARD,
        visible = true,
    }) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.material = new THREE.SpriteMaterial({
            map: this.texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.renderOrder = renderOrder;
        this.sprite.visible = visible;
        parent.add(this.sprite);

        this.width = width;
        this.height = height;
        this.lines = lines;
        this.fontSize = fontSize;
        this.fontWeight = fontWeight;
        this.textAlign = textAlign;
        this.background = background;
        this.stroke = stroke;
        this.lineWidth = lineWidth;
        this.paddingX = paddingX;

        this.updateUI({
            width: this.width,
            height: this.height,
            lines: this.lines,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            textAlign: this.textAlign,
            background: this.background,
            stroke: this.stroke,
            lineWidth: this.lineWidth,
            paddingX: this.paddingX,
        });
    }

    updateUI({ width, height, lines, fontSize, fontWeight, textAlign, background, stroke, lineWidth, paddingX }) {
        const ctx = this.context;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(lineWidth * 0.5, lineWidth * 0.5, width - lineWidth, height - lineWidth);

        ctx.fillStyle = '#ffffff';
        ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';

        const x = textAlign === 'left' ? paddingX : width * 0.5;
        const lineHeight = fontSize * 1.45;
        const startY = height * 0.5 - (lines.length - 1) * lineHeight * 0.5;

        for (let i = 0; i < lines.length; i += 1) {
            ctx.fillText(lines[i], x, startY + i * lineHeight);
        }

        this.texture.needsUpdate = true;
    }

    setTransform(position, scale) {
        this.sprite.position.copy(position);
        this.sprite.scale.copy(scale);
    }

    // 텍스트 내용 업데이트 메서드입니다.
    setLines(lines) {
        this.lines = lines;
        this.updateUI({
            width: this.width,
            height: this.height,
            lines: this.lines,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            textAlign: this.textAlign,
            background: this.background,
            stroke: this.stroke,
            lineWidth: this.lineWidth,
            paddingX: this.paddingX,
        });
    }

    set visible(isVisible) {
        this.sprite.visible = isVisible;
    }

    get visible() {
        return this.sprite.visible;
    }
}
