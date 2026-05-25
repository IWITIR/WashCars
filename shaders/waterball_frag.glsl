uniform float uTime;
uniform float uBallRadius;

varying float vIsTopSurface;
varying vec3 vLocalPosition;

void main() {
    vec3 waterColor = vec3(0.08, 0.38, 0.92);
    vec3 color = waterColor;

    if (vIsTopSurface > 0.5) {
        float surfaceRadius = length(vLocalPosition.xz) / max(uBallRadius, 0.0001);
        // 수면에 하얀 링 효과
        // 첫 smoothstep은 하얀 링이 나타나는 그라데이션 지점, 두 번째는 링이 사라지는 그라데이션 지점입니다.
        float rimMask1 = smoothstep(0.4, 0.5, surfaceRadius) * (1.0 - smoothstep(0.5, 0.55, surfaceRadius));
        float rimMask2 = smoothstep(0.6, 0.7, surfaceRadius) * (1.0 - smoothstep(0.7, 0.75, surfaceRadius));
        float rimMask3 = smoothstep(0.8, 0.9, surfaceRadius) * (1.0 - smoothstep(0.95, 1.0, surfaceRadius));

        color = mix(waterColor, vec3(1.0), rimMask1 * 0.2 +  rimMask2 + rimMask3);
    }

    gl_FragColor = vec4(color, 0.82);
}