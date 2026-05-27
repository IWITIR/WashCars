export class EconomyManager {
    constructor({ moneyUI, startingMoney = 0 }) {
        this.moneyUI = moneyUI;
        this.money = startingMoney;
        this.upgrades = {
            cleanPower: {
                level: 0,
                maxLevel: 10,
                baseCost: 30000,
                costGrowth: 1.55,
            },
            waterTank: {
                level: 0,
                maxLevel: 10,
                baseCost: 25000,
                costGrowth: 1.2,
            },
            sprayRange: {
                level: 0,
                maxLevel: 10,
                baseCost: 28000,
                costGrowth: 1.4,
            },
            rewardPerArea: {
                level: 0,
                maxLevel: 10,
                baseCost: 45000,
                costGrowth: 2.3,
            },
            completionReward: {
                level: 0,
                maxLevel: 10,
                baseCost: 30000,
                costGrowth: 2,
            },
        };

        this.moneyUI.setMoney(this.money);
    }

    addMoney(amount) {
        if (!Number.isFinite(amount) || amount <= 0) return;

        this.money += amount;
        this.moneyUI.setMoney(this.money);
    }

    spendMoney(amount) {
        if (!Number.isFinite(amount) || amount > this.money) return false;

        this.money -= amount;
        this.moneyUI.setMoney(this.money);
        return true;
    }

    getUpgrade(key) {
        return this.upgrades[key] ?? null;
    }

    getUpgradeLevel(key) {
        return this.getUpgrade(key)?.level ?? 0;
    }

    getUpgradeCost(key) {
        const upgrade = this.getUpgrade(key);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) return 0;

        return Math.round(upgrade.baseCost * upgrade.costGrowth ** upgrade.level);
    }

    getUpgradeState(key) {
        const upgrade = this.getUpgrade(key);
        if (!upgrade) {
            return {
                level: 0,
                maxLevel: 0,
                cost: 0,
                isMaxed: true,
                canBuy: false,
            };
        }

        const cost = this.getUpgradeCost(key);
        const isMaxed = upgrade.level >= upgrade.maxLevel;

        return {
            level: upgrade.level,
            maxLevel: upgrade.maxLevel,
            cost,
            isMaxed,
            canBuy: !isMaxed && this.money >= cost,
        };
    }

    tryBuyUpgrade(key) {
        const upgrade = this.getUpgrade(key);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) return false;

        const cost = this.getUpgradeCost(key);
        if (!this.spendMoney(cost)) return false;

        upgrade.level += 1;
        return true;
    }

    calculateWashReward(cleanedAmount) {
        if (!Number.isFinite(cleanedAmount) || cleanedAmount <= 0) return 0;

        const rewardMultiplier = 1 + this.getUpgradeLevel('rewardPerArea') * 1;
        return Math.max(1, Math.round(cleanedAmount * 60 * rewardMultiplier));
    }

    getWashRadius() {
        return 30 + this.getUpgradeLevel('sprayRange') * 4;
    }

    getWashStrengthMultiplier() {
        return 1 + this.getUpgradeLevel('cleanPower') * 0.2;
    }

    getMaxWaterAmount() {
        return 1 + this.getUpgradeLevel('waterTank') * 0.35;
    }

    getCompletionReward() {
        return 50000 + this.getUpgradeLevel('completionReward') * 25000;
    }
}
