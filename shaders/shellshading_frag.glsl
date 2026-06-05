uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uTransitionProgress;
varying vec2 vUv;

void main() {
    vec3 base = texture2D(tDiffuse, vUv).rgb;

    // 밝기를 단계화해 만화풍 명암을 만듭니다.
    float lum = dot(base, vec3(0.299, 0.587, 0.114));
    float bands = 4.0;
    float quantized = floor(lum * bands) / (bands - 1.0);
    // 밝기가 1 이상인 경우 quantized가 1을 초과하므로 clamp 해줍니다.
    quantized = clamp(quantized, 0.0, 1.0);

    // 양자화된 명암을 원본 색에 적용합니다.
    float lightFactor = mix(0.58, 1.18, quantized);
    vec3 color = base * lightFactor;

    // 셀 느낌을 위해 채도를 살짝 올립니다.
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, 1.08);

    // 너무 평평하지 않게 아주 미세한 노이즈를 더합니다.
    float noise = fract(sin(dot(vUv + uTime * 0.03, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    color += noise * 0.002;

    // CRT 효과를 위해 수평 스캔라인을 추가합니다.
    float scanline = 0.975 + 0.025 * sin(vUv.y * 900.0);
    color *= scanline;

    // 화면을 블럭으로 나눠 순서대로 검게 덮습니다.
    vec2 grid = vec2(32.0, 18.0);
    vec2 block = floor(vUv * grid);
    float index = block.y * grid.x + block.x;
    float total = grid.x * grid.y;
    float threshold = uTransitionProgress * total;
    float blockMask = step(index, threshold - 1.0);
    color *= 1.0 - blockMask;

    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}