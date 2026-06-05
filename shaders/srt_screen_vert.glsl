varying vec2 vUv;
varying vec3 vPosition;

// CRT 화면 튀어나온 효과를 보여주는 버텍스 셰이더입니다. post Scene의 quad에 적용됩니다.
void main() {
    vUv = uv;

    vec2 curved = position.xy;
    float radiusSq = dot(curved, curved);
    curved *= 1.0 - 0.025 * radiusSq;

    vec3 warpedPosition = vec3(curved, position.z);
    vPosition = warpedPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(warpedPosition, 1.0);
}
