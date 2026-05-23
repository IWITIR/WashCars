uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float pixelSize;
uniform float colorSteps;
uniform float edgeThreshold;

varying vec2 vUv;

void main() {
    // normal frag
    vec4 color = texture2D(tDiffuse, vUv);
    gl_FragColor = vec4(color.rgb, color.a);
}