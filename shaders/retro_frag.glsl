uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float pixelSize; // 추천값: 6.0 ~ 8.0 (픽셀 크기)

varying vec2 vUv;

void main() {
    // 1. UV 좌표를 모자이크 형태로 변환 (픽셀화)
    vec2 dxy = pixelSize / resolution;
    vec2 coord = dxy * floor(vUv / dxy);

    // 2. 픽셀화된 좌표로 텍스처 샘플링
    vec4 texColor = texture2D(tDiffuse, coord);

    // 3. PS1 특유의 색상 손실(Color Depth Reduction) 효과
    // 32.0으로 나누고 곱해서 5-bit 컬러 느낌을 냅니다.
    float colorDepth = 32.0; 
    texColor.rgb = floor(texColor.rgb * colorDepth + 0.5) / colorDepth;

    // 4. (옵션) 모서리를 약간 어둡게 하는 비네팅(Vignette) 추가로 크리피함 극대화
    float dist = distance(vUv, vec2(0.5));
    texColor.rgb *= smoothstep(0.8, 0.2, dist);

    gl_FragColor = texColor;
}