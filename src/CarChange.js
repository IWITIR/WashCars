import * as THREE from 'three';
import {
    createCarMoveClip,
    createGarageDoorMoveClip,
    playClipOnce,
} from './KeyframeAnimations.js';

const REWARD_DELAY = 0.6;

// 현재 게임 내에서 세차되는 차와 세차 완료시 전환을 담당하는 클래스입니다.
export class CarChange {
    constructor({
        cars,
        garageDoor,
        audioManager,
        economyManager,
        moneyEffect,
        reward = 500000,
    }) {
        this.cars = cars;
        this.garageDoor = garageDoor;
        this.audioManager = audioManager;
        this.economyManager = economyManager;
        this.moneyEffect = moneyEffect;
        this.reward = reward;
        this.activeCarIndex = 0;
        this.state = 'idle';
        this.stateTime = 0;
        this.doorClosedY = garageDoor.group.position.y;
        this.doorOpenY = this.doorClosedY + 100;
        this.playPosition = new THREE.Vector3(0, 0, 0);
        this.outPosition = new THREE.Vector3(0, 0, 300);
        this.effectPosition = new THREE.Vector3();
        this.doorAnimation = null;
        this.carAnimation = null;
        this.animatingCar = null;

        this.initializeCars();
    }

    get isChanging() {
        return this.state !== 'idle';
    }

    getActiveCar() {
        return this.cars[this.activeCarIndex] ?? null;
    }

    update(delta) {
        if (this.state === 'idle') {
            this.tryStartChange();
            return;
        }

        this.stateTime += delta;
        this.updateAnimations(delta);

        if (this.state === 'reward') {
            if (this.stateTime >= REWARD_DELAY) {
                this.startState('openDoor');
            }
            return;
        }
    }

    tryStartChange() {
        const car = this.getActiveCar();
        if (!car || car.getWashProgress() < 1) return;

        this.spawnRewardEffect(car);
        this.audioManager.playOneShot('casher');
        const compReward = this.economyManager.getCompletionReward();
        this.economyManager.addMoney(compReward);
        this.startState('reward');
    }

    spawnRewardEffect(car) {
        const compReward = this.economyManager.getCompletionReward();
        if (car.progressBillboard) {
            car.progressBillboard.getWorldPosition(this.effectPosition);
        } else {
            const box = new THREE.Box3().setFromObject(car.group);
            box.getCenter(this.effectPosition);
            this.effectPosition.y = box.max.y + 1;
        }

        this.moneyEffect.spawn(this.effectPosition, compReward);
    }

    prepareNextCar() {
        const completedCar = this.getActiveCar();
        if (completedCar) {
            if (completedCar.model) {
                completedCar.model.visible = false;
            }
            completedCar.resetWashProgress();
            completedCar.hideProgressBar = true;
            completedCar.setPosition(this.outPosition.x, this.outPosition.y, this.outPosition.z);
        }

        this.activeCarIndex = (this.activeCarIndex + 1) % this.cars.length;

        const nextCar = this.getActiveCar();
        if (!nextCar) return;

        if (nextCar.model) {
            nextCar.model.visible = true;
        }
        nextCar.resetWashProgress();
        nextCar.hideProgressBar = false;
        nextCar.setPosition(this.outPosition.x, this.outPosition.y, this.outPosition.z);
    }

    initializeCars() {
        for (let i = 0; i < this.cars.length; i += 1) {
            const car = this.cars[i];
            car.hideProgressBar = i !== this.activeCarIndex;

            if (i === this.activeCarIndex) {
                car.setPosition(this.playPosition.x, this.playPosition.y, this.playPosition.z);
            } else {
                car.setPosition(this.outPosition.x, this.outPosition.y, this.outPosition.z);
            }
        }
    }

    updateAnimations(delta) {
        if (this.doorAnimation) {
            this.doorAnimation.mixer.update(delta);
            this.syncModelPosition(this.garageDoor);
        }

        if (this.carAnimation) {
            const car = this.animatingCar;

            this.carAnimation.mixer.update(delta);
            if (this.carAnimation) {
                this.syncModelPosition(car);
            }
        }
    }

    playGarageDoorAnimation(fromY, toY, onFinished) {
        const clip = createGarageDoorMoveClip(fromY, toY, this.garageDoor.group.position);

        this.doorAnimation?.action.stop();
        this.doorAnimation = playClipOnce(this.garageDoor.group, clip, () => {
            this.syncModelPosition(this.garageDoor);
            this.doorAnimation = null;
            onFinished?.();
        });
    }

    playCarAnimation(car, from, to, onFinished) {
        if (!car) return;

        const clip = createCarMoveClip(from, to);

        this.carAnimation?.action.stop();
        this.animatingCar = car;
        this.carAnimation = playClipOnce(car.group, clip, () => {
            this.syncModelPosition(car);
            this.carAnimation = null;
            this.animatingCar = null;
            onFinished?.();
        });
    }

    syncModelPosition(model) {
        model.setPosition(model.group.position.x, model.group.position.y, model.group.position.z);
    }

    startState(state) {
        this.state = state;
        this.stateTime = 0;

        if (state === 'openDoor') {
            this.playGarageDoorAnimation(this.doorClosedY, this.doorOpenY, () => {
                this.audioManager.play('car_engine');
                this.startState('exitCar');
            });
            return;
        }

        if (state === 'exitCar') {
            this.playCarAnimation(this.getActiveCar(), this.playPosition, this.outPosition, () => {
                this.prepareNextCar();
                this.startState('enterCar');
            });
            return;
        }

        if (state === 'enterCar') {
            this.playCarAnimation(this.getActiveCar(), this.outPosition, this.playPosition, () => {
                this.startState('closeDoor');
            });
            return;
        }

        if (state === 'closeDoor') {
            this.playGarageDoorAnimation(this.doorOpenY, this.doorClosedY, () => {
                this.audioManager.stop('car_engine');
                this.startState('idle');
            });
        }
    }
}
