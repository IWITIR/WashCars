import * as THREE from 'three';

// 주어진 쉐이더 텍스트로 THREE.ShaderMaterial을 생성하는 유틸 함수
export function createMaterialFromShader({
    vertexShader,
    fragmentShader,
    uniforms = {},
    materialOptions = {},
}) {
    return new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        ...materialOptions,
    });
}
