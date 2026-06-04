import * as THREE from 'three';

let showHelpers = false;

// 씬의 조명을 세팅하는 함수입니다. 카메라가 주어지면 카메라에 플래시라이트도 추가합니다.
export function setupLighting(scene, camera = null) {
    // 조명 세팅

    // 0) 앰비언트 라이트
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // 1) 맵 중앙 상공에서 아래로 넓게 비추는 라이트
    const mapCenterPoint = new THREE.PointLight(0xffffff, 20000, 0);
    mapCenterPoint.castShadow = true;
    mapCenterPoint.position.set(0, 60, 0); // 맵 중앙
    // mapCenterPoint.target.position.set(0, -15, 20); // 수직 ㅇ아래
    scene.add(mapCenterPoint);
    // scene.add(mapCenterPoin.target);


    // 2) 컴퓨터 위 + 살짝 앞에서 컴퓨터 쪽 강조 스포트라이트
    const laptopSpot = new THREE.SpotLight(0x9fd2ff, 2.4, 180, Math.PI / 7, 0.35, 0.1);
    laptopSpot.position.set(55, 55, -90);
    laptopSpot.target.position.set(55, 0, -100);
    scene.add(laptopSpot);
    scene.add(laptopSpot.target);

    if (camera) {
        const flashlight = new THREE.SpotLight(0xffffff, 25, 45, Math.PI / 8, 0.45, 1);
        flashlight.position.set(0, 0, 0);
        flashlight.target.position.set(0, 0, -1);
        camera.add(flashlight);
        camera.add(flashlight.target);
    }

    // 라이팅 헬퍼 (디버그)
    // const lightingHelperRoot = new THREE.Group();
    // scene.add(lightingHelperRoot);

    // window.addEventListener('keydown', (e) => {
    //     if (e.code === 'KeyH') {
    //         console.log('Helper toggle key pressed');
    //         showHelpers = !showHelpers;
    //         lightingHelperRoot.traverse((child) => {
    //                 child.visible = showHelpers;
    //         });
    //     }
    // });

    // lightingHelperRoot.add(new THREE.PointLightHelper(mapCenterPoint));
    // lightingHelperRoot.add(new THREE.SpotLightHelper(laptopSpot));
}


