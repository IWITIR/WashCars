uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;


void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;

    // 1. Teal & Orange (영화적 색감 보정)
    // 픽셀의 밝기(Luminance)를 계산
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 shadowColor = vec3(0.18, 0.42, 0.52); // 어두운 곳은 청록색(Teal)
    vec3 highlightColor = vec3(1.0, 0.75, 0.5); // 밝은 곳은 따뜻한 주황색(Orange)
    
    vec3 gradedColor = mix(color * shadowColor * 5.0, color * highlightColor * 5.0, lum);
    color = mix(color, gradedColor, 0.4); // 색감은 유지하고 과한 감광은 줄임

    // 2. 필름 그레인 (Film Grain / Noise)
    // 밋밋한 텍스처에 자글자글한 디테일 추가
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233) * uTime)) * 43758.5453) - 0.5;
    color += noise * 0.02;

    // 전체 톤은 유지하면서 밝기만 살짝 리프트
    color *= 1.6;
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
}