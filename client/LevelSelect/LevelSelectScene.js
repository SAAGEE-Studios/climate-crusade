import { GameFlowManager } from '../Core/GameFlowManager.js';
import { GameState } from '../Core/GameState.js';
import { LEVELS } from '../Core/LevelRegistry.js';
import { getProgress, deleteAccount } from '../Core/api.js';

export class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectScene');
        this.selectedLevelId = null;
        this.infoPanel = null;
        this.isDeletePopupOpen = false;
    }

    preload() {
        this.load.image('backgroundLevelSelectScene', './client/Shared/LevelSelectScene/Background.png');
        this.load.image('level_1_info_panel', './client/Shared/LevelSelectScene/Level_1_Info_Panel.png');
    }

    create() {
        this.infoPanel = null;
        this.isDeletePopupOpen = false;

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
        this.logoutButton.style.display = 'flex';
        this.logoutButton.style.justifyContent = 'center';

        this.deleteAccountButton = document.getElementById('delete-account-button');
        this.deleteAccountButton.style.display = 'flex';

        this.logoutButton.onclick = () => {
            this.logout();
        };

        this.playButton = document.getElementsByClassName('play-button')[0];
        this.playButton.style.display = 'flex';

        this.playButton.onclick = () => {
            this.startSelectedLevel();
        };

        this.deleteAccountButton.onclick = () => {
            this.showDeleteConfirmation();
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
        const infoScreen = document.getElementById('info-image');

        const panelMap = {
            level01: 'Level_1_Info_Panel.png',
            level02: 'Level_2_Info_Panel.png',
            level03: 'Level_3_Info_Panel.png',
            level04: 'Level_4_Info_Panel.png'
        };

        if (panelMap[levelId]) {
            infoScreen.src = `./client/Shared/LevelSelectScene/${panelMap[levelId]}`;
        } else {
            infoScreen.src = '';
        }
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

    applyProgressToUI(progressArray) {
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
                if (index < starsEarned) {
                    starImg.src = "./client/Shared/LevelSelectScene/FilledStar.png";
                } else {
                    starImg.src = "./client/Shared/LevelSelectScene/UnfilledStar.png";
                }
            });
        });

        this.updateEarthHealth(totalStars);
    }

    updateEarthHealth(totalStars) {
        const maxStarsPerLevel = 3;
        const maxStarsTotal = LEVELS.length * maxStarsPerLevel;

        const starContribution = (totalStars / maxStarsTotal) * 50;
        const healthPercent = 50 + starContribution;

        const barFill = document.getElementById('earth-bar-fill');
        const percentText = document.getElementById('earth-percent');

        barFill.style.width = `${healthPercent}%`;
        percentText.textContent = `${Math.round(healthPercent)}%`;
    }

    logout() {
        this.cameras.main.fadeOut(200);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            GameState.reset();
            GameFlowManager.goToLogin(this);
        });
    }

    showDeleteConfirmation() {
        if (this.isDeletePopupOpen) return;
        this.isDeletePopupOpen = true;

        // Disable DOM interaction
        const levelButtons = this.levelUI.querySelectorAll('.level-button');

        levelButtons.forEach(btn => {
            btn.style.pointerEvents = 'none';
        });

        this.playButton.style.pointerEvents = 'none';
        this.logoutButton.style.pointerEvents = 'none';
        this.deleteAccountButton.style.pointerEvents = 'none';

        const depth = 500;

        // Dark overlay
        this.deleteDim = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0.6
        ).setDepth(depth);

        // Password input (DOM element overlay)
        this.passwordInput = document.createElement('input');
        this.passwordInput.type = 'password';
        this.passwordInput.placeholder = 'Enter password to confirm';
        this.passwordInput.style.position = 'absolute';
        this.passwordInput.style.left = '50%';
        this.passwordInput.style.top = '48%';
        this.passwordInput.style.transform = 'translate(-50%, -50%)';
        this.passwordInput.style.padding = '10px';
        this.passwordInput.style.borderRadius = '10px';
        this.passwordInput.style.border = 'none';
        this.passwordInput.style.width = '300px';
        this.passwordInput.style.textAlign = 'center';
        this.passwordInput.style.fontSize = '16px';

        document.body.appendChild(this.passwordInput);

        // Panel
        this.deletePanel = this.add.graphics().setDepth(depth + 1);
        this.deletePanel.fillStyle(0x0b2a3a, 1);
        this.deletePanel.lineStyle(2, 0x4ceaff, 1);
        this.deletePanel.fillRoundedRect(610, 390, 700, 300, 25);
        this.deletePanel.strokeRoundedRect(610, 390, 700, 300, 25);

        // Text
        this.deleteText = this.add.text(
            this.scale.width / 2,
            450,
            "Are you sure you want to delete your account?\nThis action cannot be undone.",
            {
                fontSize: '22px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(depth + 2);

        // YES Button
        this.createDeleteButton("YES", 830, 610, 0xff4444, async () => {
            const password = this.passwordInput.value;

            if (!password) return;

            try {
                await deleteAccount(GameState.userId, password);

                this.passwordInput.remove();
                this.closeDeletePopup();

                GameState.reset();
                GameFlowManager.goToLogin(this);

            } catch (err) {
                console.error(err);
                this.passwordInput.value = '';
                this.passwordInput.placeholder = 'Incorrect password';
            }
        });

        // NO Button
        this.createDeleteButton("NO", 1090, 610, 0x0299ec, () => {
            this.closeDeletePopup();
        });
    }

    createDeleteButton(label, x, y, color, callback) {

        const depth = 502;

        const button = this.add.graphics().setDepth(depth);
        button.fillStyle(color, 1);
        button.fillRoundedRect(x - 80, y - 25, 160, 50, 20);

        const text = this.add.text(x, y, label, {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(depth + 1);

        const hitArea = this.add.rectangle(x, y, 160, 50, 0x000000, 0)
            .setInteractive()
            .setDepth(depth + 2);

        hitArea.on('pointerover', () => {
            button.clear();
            button.fillStyle(Phaser.Display.Color.GetColor(
                Math.min(255, (color >> 16) + 40),
                Math.min(255, ((color >> 8) & 0xff) + 40),
                Math.min(255, (color & 0xff) + 40)
            ), 1);
            button.fillRoundedRect(x - 80, y - 25, 160, 50, 20);
        });

        hitArea.on('pointerout', () => {
            button.clear();
            button.fillStyle(color, 1);
            button.fillRoundedRect(x - 80, y - 25, 160, 50, 20);
        });

        hitArea.on('pointerdown', callback);

        // Store references for cleanup
        if (!this.deleteElements) this.deleteElements = [];
        this.deleteElements.push(button, text, hitArea);
    }

    closeDeletePopup() {
        this.isDeletePopupOpen = false;

        this.deleteDim.destroy();
        this.deletePanel.destroy();
        this.deleteText.destroy();

        if (this.deleteElements) {
            this.deleteElements.forEach(el => el.destroy());
            this.deleteElements = [];
        }

        if (this.passwordInput) {
            this.passwordInput.remove();
            this.passwordInput = null;
        }

        const levelButtons = this.levelUI.querySelectorAll('.level-button');

        levelButtons.forEach(btn => {
            btn.style.pointerEvents = 'auto';
        });

        this.playButton.style.pointerEvents = 'auto';
        this.logoutButton.style.pointerEvents = 'auto';
        this.deleteAccountButton.style.pointerEvents = 'auto';

        this.isModalOpen = false;
    }

    async confirmDelete() {
        try {
            // For security you should prompt password,
            // but assuming already authenticated:
            await deleteAccount(GameState.userId, prompt("Enter password to confirm:"));

            this.closeDeletePopup();

            GameState.reset();
            GameFlowManager.goToLogin(this);

        } catch (err) {
            console.error("Delete failed:", err);
        }
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

        if (this.logoutButton) {
            this.logoutButton.style.display = 'none';
        }

        if (this.deleteAccountButton) {
            this.deleteAccountButton.style.display = 'none';
        }
    }
}