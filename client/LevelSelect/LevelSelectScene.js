import { GameFlowManager } from '../Core/GameFlowManager.js';
import { GameState } from '../Core/GameState.js';
import { LEVELS } from '../Core/LevelRegistry.js';
import { getProgress } from '../Core/api.js';

export class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectScene');
        this.selectedLevelId = null;
    }

    preload() {
        this.load.image('backgroundLevelSelectScene', './client/Shared/LevelSelectScene/Background.png');
    }

    create() {
        this.cameras.main.fadeIn(200);
        this.events.on('shutdown', this.shutdown, this);

        const bg = this.add.image(0, 0, 'backgroundLevelSelectScene').setOrigin(0, 0);
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.levelUI = document.getElementById('level-select-ui');
        this.levelUI.style.display = 'grid';

        this.earthUI = document.getElementById('earth-ui');
        this.earthUI.style.display = 'flex';

        this.selectMenu = document.getElementById('select-menu');
        this.selectMenu.style.display = 'flex';

        this.logoutButton = document.getElementById('logout-button');

        this.logoutButton.onclick = () => {
            this.logout();
        };

        this.playButton = document.getElementsByClassName('play-button')[0];
        this.playButton.onclick = () => {
            this.startSelectedLevel();
        };

        this.selectionScreen = document.getElementById('selection-screen');

        this.loadProgress();

        LEVELS.forEach((level, index) => {
            const button = this.levelUI.querySelector(
                `.level-button[data-level-id="${level.id}"]`
            )

            if (!button) return;

            if (button) {
                button.style.display = 'flex';
            }

            button.onclick = () => {
                this.handleLevelSelection(level.id);
            };
        });
    }

    handleLevelSelection(levelId) {
        this.selectedLevelId = levelId;
        this.selectionScreen.style.display = 'block';
    }

    async startSelectedLevel() {
        if (!this.selectedLevelId) return;

        const selectedLevel = LEVELS.find(
            level => level.id === this.selectedLevelId
        );

        if (!selectedLevel) {
            console.error('Selected level not found.');
            return;
        }

        const response = await fetch(selectedLevel.configPath);
        const config = await response.json();

        const entryScene = config.scenes.entry;
        console.log(entryScene);

        this.cameras.main.fadeOut(200);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            GameFlowManager.goToLevel(this, entryScene);
        });
    }

    async loadProgress() {
        try {
            const data = await getProgress(GameState.userId);
            this.applyProgressToUI(data.progress);
        } catch (err) {
            console.error("Progress fetch error:", err.message);
        }
    }

    applyProgressToUI(progressArray){
        const progressMap = {}

        progressArray.forEach(row => {
            progressMap[row.level_id] = row.stars_collected;
        });

        let totalStars = 0;

        LEVELS.forEach(level => {
            const starsEarned = progressMap[level.id] || 0;
            totalStars += starsEarned;

            const button = this.levelUI.querySelector(
                `.level-button[data-level-id="${level.id}"]`
            );

            if (!button) return;

            const stars = button.querySelectorAll('.star');

            stars.forEach((starImg, index) => {
                if(index < starsEarned){
                    starImg.src = "./client/Shared/LevelSelectScene/FilledStar.png";
                } else {
                    starImg.src = "./client/Shared/LevelSelectScene/UnfilledStar.png";
                }
            });
        });

        this.updateEarthHealth(totalStars);
    }

    updateEarthHealth(totalStars){
        const maxStarsPerLevel = 3;
        const maxStarsTotal = LEVELS.length * maxStarsPerLevel;

        const starContribution = (totalStars/maxStarsTotal) * 50;
        const healthPercent = 50 + starContribution;

        const barFill = document.getElementById('earth-bar-fill');
        const percentText = document.getElementById('earth-percent');

        barFill.style.width = `${healthPercent}%`;
        percentText.textContent = `${Math.round(healthPercent)}%`;
    }

    logout(){
        this.cameras.main.fadeOut(200);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            GameState.reset();
            GameFlowManager.goToLogin(this);
        });
    }

    shutdown() {
        if (this.levelUI) {
            this.levelUI.style.display = 'none';
        }

        if (this.earthUI) {
            this.earthUI.style.display = 'none';
        }

        if (this.playButton) {
            this.playButton.style.display = 'none';
        }

        if (this.selectionScreen) {
            this.selectionScreen.style.display = 'none';
        }

        if (this.logoutButton){
            this.logoutButton.style.display = 'none';
        }
    }
}