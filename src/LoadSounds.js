import { AudioManager } from './AudioManager.js';

export async function loadSounds(camera) {
    const audioManager = new AudioManager({ camera });
    await audioManager.load(
        'water_hose', 
        './sound/water_hose_pitchdown.wav', 
        {
        loop: true,
        volume: 0.35,
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
        './sound/footstep1.wav', 
        {
        loop: false,
        volume: 0.5,
    });

    await audioManager.load(
        'footstep2', 
        './sound/footstep2.wav', 
        {
        loop: false,
        volume: 0.5,
    });

    await audioManager.load(
        'reload',
        './sound/reload.wav',
        {
        loop: false,
        volume: 1,
    });

    await audioManager.load(
        'mouse_click',
        './sound/mouse_click.wav',
        {
        loop: false,
        volume: 0.5,
    });

    return audioManager;
}