import { AudioManager } from './AudioManager.js';

// 소리 에셋 로드 부분을 보기 편하게 분리했습니다.
export async function loadSounds(camera) {
    const audioManager = new AudioManager({ camera });
    await audioManager.load(
        'water_hose', 
        './sound/water_hose_mod.wav', 
        {
            loop: true,
            volume: 0.5,
    });

    await audioManager.load(
        'water_hit', 
        './sound/water_hitting.wav', 
        {
            loop: true,
            volume: 0.5,
    });

    await audioManager.load(
        'footstep1', 
        './sound/footstep1_mod.wav', 
        {
            loop: false,
            volume: 0.5,
    });

    await audioManager.load(
        'footstep2', 
        './sound/footstep2_mod.wav', 
        {
            loop: false,
            volume: 0.5,
    });

    await audioManager.load(
        'reload',
        './sound/reload_mod.wav',
        {
            loop: false,
            volume: 1,
    });

    await audioManager.load(
        'mouse_click',
        './sound/mouse_click_mod.wav',
        {
            loop: false,
            volume: 0.5,
    });

    await audioManager.load(
        'bgm',
        './sound/bgm_mod.wav',
        {
            loop: true,
            volume: 0.3,
    });

    await audioManager.load(
        'casher',
        './sound/casher_mod.wav',
        {
            loop: false,
            volume: 0.5,
    });

    await audioManager.load(
        'car_engine',
        './sound/car_engine.wav',
        {
            loop: true,
            volume: 0.4,
    });

    await audioManager.load(
        'clap',
        './sound/clapping_mod.wav',
        {
            loop: false,
            volume: 0.5,
    });

    return audioManager;
}