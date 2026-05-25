uniform float uTime;
uniform float uFillLevel;
uniform vec3 uWorldUp;
uniform vec3 uBallCenter;
uniform float uBallRadius;

varying float vIsTopSurface;
varying vec3 vLocalPosition;

// 버텍스쉐이더; 물통의 꼭짓점이 수면보다 위에 있다면, 그 꼭짓점을 수면 높이까지 uWorldUp 방향으로 밀어내는 로직입니다.
void main() {
    vec3 centeredPosition = position + uBallCenter;
    float centerHeight = dot(uBallCenter, uWorldUp);
    float fillY = centerHeight + mix(-uBallRadius, uBallRadius, uFillLevel);

    // 표면 파도 높이 계산
    float wave = sin(centeredPosition.x * 5.0 + uTime * 5.0) * 0.05;
    wave += cos(centeredPosition.z * 3.0 + uTime * 4.0) * 0.05;
    float surfaceY = clamp(fillY + wave, centerHeight - uBallRadius, centerHeight + uBallRadius);

    // 현재 버텍스의 실제 높이 (기울기 반영) 내적으로 계산
    float trueHeight = dot(centeredPosition, uWorldUp);

    vec3 newPosition = centeredPosition;
    vIsTopSurface = 0.0; // 기본은 단면이 아님 (옆/밑면)

    // 핵심: 꼭짓점이 수면보다 위에 있다면?
    if (trueHeight > surfaceY) {
        // 수면 높이까지 꼭짓점을 uWorldUp 반대로 밀어내기
        newPosition -= uWorldUp * (trueHeight - surfaceY);
        vIsTopSurface = 1.0; // 플래그
    }

    // 압축 변형이 구의 바깥 경계를 뚫고 나가지 않도록 반지름 기준으로 제한
    vec3 fromCenter = newPosition - uBallCenter;
    float centerDistance = length(fromCenter);
    if (centerDistance > uBallRadius) {
        newPosition = uBallCenter + normalize(fromCenter) * uBallRadius;
    }

    vLocalPosition = newPosition - uBallCenter;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}