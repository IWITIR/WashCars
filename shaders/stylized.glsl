uniform sampler2D tDiffuse;
uniform vec2 resolution;

varying vec2 vUv;

// RGB 색상을 HSV(색상, 채도, 밝기)로 변환하는 함수
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV를 다시 RGB로 변환하는 함수
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    // 1. 원본 픽셀 색상 가져오기
    vec4 color = texture2D(tDiffuse, vUv);

    // 2. 색상을 조작하기 쉽게 HSV로 변환
    vec3 hsv = rgb2hsv(color.rgb);

    // 3. 스타일라이즈드 핵심: 명암(Value) 단순화 (일러스트/유화 느낌)
    // 숫자가 작을수록 찰흙이나 물감처럼 색이 크게 크게 뭉칩니다. (추천값: 6.0 ~ 8.0)
    float steps = 7.0; 
    hsv.z = floor(hsv.z * steps + 0.5) / steps;
    
    // 4. 채도(Saturation) 펌핑 (칙칙함 제거)
    // 채도를 20% 올려서 뽀샤시하고 화사한 애니메이션 느낌 부여
    hsv.y = clamp(hsv.y * 1.2, 0.0, 1.0);

    // 5. 다시 RGB로 변환
    vec3 stylizedColor = hsv2rgb(hsv);

    // 6. 따뜻한 톤(피치/골드) 틴트 살짝 얹어주기 (선택 사항)
    vec3 warmTint = vec3(1.05, 0.98, 0.95);
    stylizedColor *= warmTint;

    gl_FragColor = vec4(stylizedColor, 1.0);
}