uniform sampler2D tDiffuse; // 컬러 원본
uniform sampler2D tDepth;   // 깊이 맵
uniform vec2 resolution;
uniform float edgeThreshold;

varying vec2 vUv;

void main() {
    vec2 texel = 1.0 / resolution;

    // 1. 베이스 컬러 가져오기
    vec4 baseColor = texture2D(tDiffuse, vUv);

    // 2. 현재 픽셀과 상하좌우 픽셀의 "깊이(거리) 값"을 읽어옵니다. (.x 에 값이 들어있음)
    float dCenter = texture2D(tDepth, vUv).x;
    float dLeft   = texture2D(tDepth, vUv + vec2(-texel.x, 0.0)).x;
    float dRight  = texture2D(tDepth, vUv + vec2(texel.x, 0.0)).x;
    float dUp     = texture2D(tDepth, vUv + vec2(0.0, -texel.y)).x;
    float dDown   = texture2D(tDepth, vUv + vec2(0.0, texel.y)).x;

    // 3. 주변 픽셀과의 거리 차이를 계산 (절댓값 합산)
    float edge = abs(dLeft - dCenter) + abs(dRight - dCenter) + abs(dUp - dCenter) + abs(dDown - dCenter);

    // 4. 거리 차이가 훅! 떨어지는 곳(실루엣 경계)이라면 검은색 선을 긋습니다.
    if (edge > edgeThreshold) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // 외곽선 색상
    } else {
        gl_FragColor = baseColor; // 아니면 원래 색상 그대로
    }
}