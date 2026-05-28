import * as THREE from 'three';

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

        if (this.state === 'reward') {
            if (this.stateTime >= 0.6) {
                this.startState('openDoor');
            }
            return;
        }

        if (this.state === 'openDoor') {
            const progress = this.ease(Math.min(this.stateTime / 1.1, 1));
            this.moveGarageDoor(this.doorClosedY, this.doorOpenY, progress);

            if (progress >= 1) {
                this.audioManager.play('car_engine');
                this.startState('exitCar');
            }
            return;
        }

        if (this.state === 'exitCar') {
            const car = this.getActiveCar();
            const progress = this.ease(Math.min(this.stateTime / 2.2, 1));
            this.moveCar(car, this.playPosition, this.outPosition, progress);

            if (progress >= 1) {
                this.prepareNextCar();
                this.startState('enterCar');
            }
            return;
        }

        if (this.state === 'enterCar') {
            const car = this.getActiveCar();
            const progress = this.ease(Math.min(this.stateTime / 2.2, 1));
            this.moveCar(car, this.outPosition, this.playPosition, progress);

            if (progress >= 1) {
                this.startState('closeDoor');
            }
            return;
        }

        if (this.state === 'closeDoor') {
            const progress = this.ease(Math.min(this.stateTime / 1.1, 1));
            this.moveGarageDoor(this.doorOpenY, this.doorClosedY, progress);

            if (progress >= 1) {
                this.audioManager.stop('car_engine');
                this.startState('idle');
            }
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
            completedCar.resetWashProgress();
            completedCar.hideProgressBar = true;
            completedCar.setPosition(this.outPosition.x, this.outPosition.y, this.outPosition.z);
        }

        this.activeCarIndex = (this.activeCarIndex + 1) % this.cars.length;

        const nextCar = this.getActiveCar();
        if (!nextCar) return;

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

    moveGarageDoor(fromY, toY, progress) {
        const position = this.garageDoor.group.position;
        this.garageDoor.setPosition(position.x, THREE.MathUtils.lerp(fromY, toY, progress), position.z);
    }

    moveCar(car, from, to, progress) {
        if (!car) return;

        car.setPosition(
            THREE.MathUtils.lerp(from.x, to.x, progress),
            THREE.MathUtils.lerp(from.y, to.y, progress),
            THREE.MathUtils.lerp(from.z, to.z, progress)
        );
    }

    startState(state) {
        this.state = state;
        this.stateTime = 0;
    }

    ease(t) {
        return t * t * (3 - 2 * t);
    }
}
