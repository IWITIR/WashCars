import * as THREE from 'three';
import { UI_BILLBOARD } from '../RenderOrder.js';

// 세척시마다 돈이 올라가는 효과입니다.
// 이것도 canvas에 텍스트를 작성하고 텍스쳐로 만들어서 Three.js 스프라이트에 적용하는 방식으로 구현되어 있습니다. 돈이 올라가는 위치는 trySpawn() 함수의 인자로 전달됩니다.
export class MoneyEffect {
    constructor({ scene }) {
        this.scene = scene;
        this.effects = [];
        this.spawnInterval = 0.1;
        this.spawnCooldown = 0;
        this.lifetime = 1.05;
    }

    // 돈이 올라가는 효과를 시도하는 함수입니다. 이 함수는 세차가 완료될 때마다 CarChange 클래스에서 호출됩니다. amount 인자는 올라가는 돈의 양입니다.
    trySpawn(position, amount = 100) {
        if (!Number.isFinite(amount)) return false;
        if (this.spawnCooldown > 0) return false;
        if (amount <= 0) return false;

        amount = Math.round(amount);

        this.spawn(position, amount);
        this.spawnCooldown = this.spawnInterval;
        return true;
    }

    // 돈이 올라가는 효과를 실제로 생성하는 함수입니다. 이 함수은 trySpawn()에서만 호출됩니다.
    spawn(position, amount = 100) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 96;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '700 42px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(8, 14, 20, 0.9)';
        ctx.strokeText(`💰 +${amount.toLocaleString()}`, canvas.width * 0.5, canvas.height * 0.5);

        ctx.fillStyle = '#ffd766';
        ctx.fillText(`💰 +${amount.toLocaleString()}`, canvas.width * 0.5, canvas.height * 0.5);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false, // 깊이 테스트 없이 항상 보이도록 설정
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(material);

        // 시간이 지남에 따라 위로 올라가면서 점점 커지는 효과를 위해 초기 위치와 스케일을 설정합니다. 위치는 trySpawn() 함수의 인자로 전달된 position을 기반으로 약간 랜덤하게 흩어지도록 합니다.
        sprite.position.copy(position);
        sprite.position.y += 0.25;
        sprite.position.x += (Math.random() - 0.5) * 0.2;
        sprite.position.z += (Math.random() - 0.5) * 0.2;
        sprite.scale.set(8, 1, 1);
        sprite.renderOrder = UI_BILLBOARD;

        this.scene.add(sprite);
        this.effects.push({
            sprite,
            texture,
            material,
            age: 0,
            riseSpeed: 0.75,
            startScale: 8,
        });
    }

    update(delta) {
        this.spawnCooldown = Math.max(0, this.spawnCooldown - delta);

        for (let i = this.effects.length - 1; i >= 0; i -= 1) {
            const effect = this.effects[i];
            effect.age += delta;

            const progress = Math.min(effect.age / this.lifetime, 1);
            effect.sprite.position.y += effect.riseSpeed * delta;
            effect.sprite.scale.setScalar(effect.startScale + progress * 0.18);
            effect.sprite.scale.y *= 0.35; // 비율
            effect.material.opacity = 1 - progress;

            if (progress >= 1) {
                this.scene.remove(effect.sprite);
                effect.texture.dispose();
                effect.material.dispose();
                this.effects.splice(i, 1);
            }
        }
    }
}
