import * as THREE from 'three';

let showHelpers = false;

export function setupLighting(scene) {
    // 조명 세팅

    // 0) 앰비언트 라이트
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // 1) 맵 중앙 상공에서 아래로 넓게 비추는 라이트
    const mapCenterPoint = new THREE.PointLight(0xffffff, 10000, 0);
    mapCenterPoint.position.set(0, 40, 0); // 맵 중앙
    // mapCenterPoint.target.position.set(0, -15, 20); // 수직 ㅇ아래
    scene.add(mapCenterPoint);
    // scene.add(mapCenterPoin.target);


    // 2) 컴퓨터 위 + 살짝 앞에서 컴퓨터 쪽 강조 스포트라이트
    const laptopSpot = new THREE.SpotLight(0x9fd2ff, 2.4, 180, Math.PI / 7, 0.35, 0.1);
    laptopSpot.position.set(55, 55, -90);
    laptopSpot.target.position.set(55, 0, -100);
    scene.add(laptopSpot);
    scene.add(laptopSpot.target);

    // 라이팅 헬퍼 (디버그)
    const lightingHelperRoot = new THREE.Group();
    scene.add(lightingHelperRoot);

    window.addEventListener('keydown', (e) => {
        console.log('Helper toggle key pressed');
        if (e.code === 'KeyH') {
            showHelpers = !showHelpers;
            lightingHelperRoot.traverse((child) => {
                    child.visible = showHelpers;
            });
        }
    });

    lightingHelperRoot.add(new THREE.PointLightHelper(mapCenterPoint));
    lightingHelperRoot.add(new THREE.SpotLightHelper(laptopSpot));
}


