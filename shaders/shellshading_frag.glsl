uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

void main() {
    vec3 base = texture2D(tDiffuse, vUv).rgb;

    // 밝기를 단계화해 만화풍 명암을 만듭니다.
    float lum = dot(base, vec3(0.299, 0.587, 0.114));
    float bands = 4.0;
    float toon = floor(lum * bands) / (bands - 1.0);

    // 단계화된 명암을 원본 색에 적용합니다.
    float lightFactor = mix(0.58, 1.18, toon);
    vec3 color = base * lightFactor;

    // 셀 느낌을 위해 채도를 살짝 올립니다.
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, 1.08);

    // 너무 평평하지 않게 아주 미세한 노이즈를 더합니다.
    float noise = fract(sin(dot(vUv + uTime * 0.03, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    color += noise * 0.02;

    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}