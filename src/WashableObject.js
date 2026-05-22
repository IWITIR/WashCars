import * as THREE from 'three';

export class WashableObject {
    constructor(geometry) {
        this.group = new THREE.Group();

        // 1. 깨끗한 원본 메쉬 (예: 반짝이는 빨간 차 표면)
        const cleanMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            roughness: 0.2,
            metalness: 0.5
        });
        this.cleanMesh = new THREE.Mesh(geometry, cleanMaterial);
        this.group.add(this.cleanMesh);

        // 2. 마스크용 2D 캔버스 생성 (여기서 때를 지웁니다)
        this.canvasSize = 1024;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;
        this.ctx = this.canvas.getContext('2d');

        // 처음에는 캔버스를 하얀색으로 칠함 (하얀색 = 때가 100% 보임)
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);

        this.maskTexture = new THREE.CanvasTexture(this.canvas);

        // 3. 더러운 때 메쉬 세팅
        const dirtMaterial = new THREE.MeshStandardMaterial({
            color: 0x332211, // 진흙 색상
            roughness: 0.9,
            transparent: true,
            alphaMap: this.maskTexture, // ★ 핵심: 캔버스를 투명도 마스크로 사용
            alphaTest: 0.05 // 렌더링 최적화용
        });

        // 원본 메쉬와 겹치면 깜빡거림(Z-fighting)이 발생하므로 때를 0.5% 더 크게 만듬
        const dirtGeometry = geometry.clone();
        this.dirtMesh = new THREE.Mesh(dirtGeometry, dirtMaterial);
        this.dirtMesh.scale.setScalar(1.005);
        this.group.add(this.dirtMesh);
    }

    // 외부에서 레이캐스트 UV 좌표를 넘겨주면 호출되는 함수
    washAt(uv) {
        // UV 좌표(0.0~1.0)를 캔버스 픽셀 좌표로 변환
        const x = uv.x * this.canvasSize;
        const y = (1 - uv.y) * this.canvasSize; // 3D UV와 2D 캔버스는 Y축이 반대임

        // 캔버스에 검은색 동그라미를 그림 (검은색 = 투명해짐 = 때가 벗겨짐)
        this.ctx.beginPath();
        this.ctx.arc(x, y, 30, 0, Math.PI * 2); // 30은 물줄기의 두께(반지름)
        this.ctx.fillStyle = 'black'; 
        this.ctx.fill();

        // GPU에게 텍스처가 지워졌으니 화면을 갱신하라고 알림
        this.maskTexture.needsUpdate = true;
    }
}