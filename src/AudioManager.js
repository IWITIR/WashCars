import * as THREE from 'three';

export class AudioManager {
    constructor({ camera, defaultVolume = 0.5 } = {}) {
        if (!camera) {
            throw new Error('AudioManager requires a camera.');
        }

        this.camera = camera;
        this.defaultVolume = defaultVolume;
        this.listener = new THREE.AudioListener();
        this.loader = new THREE.AudioLoader();
        this.sounds = new Map();

        this.camera.add(this.listener);
    }

    async load(name, path, {
        loop = false,
        volume = this.defaultVolume,
        positional = false,
        refDistance = 20,
    } = {}) {
        const buffer = await this.loader.loadAsync(path);
        const sound = positional
            ? new THREE.PositionalAudio(this.listener)
            : new THREE.Audio(this.listener);

        sound.setBuffer(buffer);
        sound.setLoop(loop);
        sound.setVolume(volume);

        if (positional) {
            sound.setRefDistance(refDistance);
        }

        this.sounds.set(name, sound);
        return sound;
    }

    get(name) {
        return this.sounds.get(name) ?? null;
    }

    play(name) {
        const sound = this.get(name);
        if (!sound || sound.isPlaying) return;

        // 브라우저가 오디오를 잠가놨으면 깨우고 재생
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume().then(() => {
                if (!sound.isPlaying) {
                    sound.play();
                }
            });
            return;
        }

        sound.play();
    }

    playOneShot(name, { volume = null } = {}) {
        const source = this.get(name);
        if (!source?.buffer) return;

        // map의 원본사운드 대신 임시 사운드 생성
        // 원본사운드의 buffer(소리데이터)와 볼륨을 복사해서 사용
        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(source.buffer);
        sound.setLoop(false);
        sound.setVolume(volume ?? source.getVolume());

        const playSound = () => {
            sound.play();
            setTimeout(() => {
                sound.disconnect();
            }, source.buffer.duration * 1000);
        };

        // 브라우저가 오디오를 잠가놨으면 깨우고 재생
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume().then(playSound);
            return;
        }

        playSound();
    }

    stop(name) {
        const sound = this.get(name);
        if (!sound || !sound.isPlaying) return;

        sound.stop();
    }

    pause(name) {
        const sound = this.get(name);
        if (!sound || !sound.isPlaying) return;

        sound.pause();
    }

    setVolume(name, volume) {
        const sound = this.get(name);
        if (!sound) return;

        sound.setVolume(volume);
    }

    setLoop(name, loop) {
        const sound = this.get(name);
        if (!sound) return;

        sound.setLoop(loop);
    }

    stopAll() {
        for (const sound of this.sounds.values()) {
            if (sound.isPlaying) {
                sound.stop();
            }
        }
    }
}
