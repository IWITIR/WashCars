varying vec2 vUv;
varying vec3 vPosition;

// default vert shader.
void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
