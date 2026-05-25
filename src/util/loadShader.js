// 주어진 경로에서 쉐이더를 읽어서 텍스트로 반환
export async function loadShader(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load shader ${path}: ${response.status}`);
    }

    return response.text();
}
