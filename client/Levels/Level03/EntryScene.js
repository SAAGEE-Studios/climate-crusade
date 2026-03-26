import { GameFlowManager } from '../../Core/GameFlowManager.js';

/**
 * Level03EntryScene
 * ------------------
 * Manages the pre-game sequence for Level 3 (Sunken Wells).
 *
 * This scene presents the level title card, plays the introductory cutscene,
 * and displays the instructions screen before handing off to the main level.
 * The player can skip the cutscene at any point via the HTML skip button,
 * and can return to level select from the title card using ESC.
 */

export class Level03EntryScene extends Phaser.Scene {
  constructor() {
    super('Level03EntryScene');
  }

  preload() {
    this.load.image(
      'Level03TitleCard',
      './client/Levels/Level03/Cutscenes/Level03_TitleCard.png'
    );

    this.load.video(
      'Level03Cutscene',
      './client/Levels/Level03/Cutscenes/Level03_Cutscene.mp4',
      'loadeddata',
      false,
      true
    );

    this.load.image(
      'Level03Instructions',
      './client/Levels/Level03/Cutscenes/Level03_Instructions.png'
    );
  }

  /**
   * Initializes the title card screen with a blinking prompt.
   * Registers pointer and keyboard listeners to advance into the cutscene,
   * and hooks the shutdown handler to clean up on scene exit.
   */
  create() {
    this.cutsceneStarted = false;
    this.instructionsShown = false;

    this.cameras.main.fadeIn(200);
    this.events.on('shutdown', this.shutdown, this);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // --- TITLE CARD ---
    this.titleCard = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'Level03TitleCard'
    ).setOrigin(0.5);

    this.titleCard.setDisplaySize(this.scale.width, this.scale.height);

    this.startText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.88,
      'Press Space or Tap to Start',
      {
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    )
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: this.startText,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.input.once('pointerdown', () => {
      this.playCutscene();
    });
  }

  /**
   * Polls for SPACE to advance into the cutscene and ESC to return to level select.
   * ESC is ignored once the cutscene has started to prevent accidental interruption.
   */
  update() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.playCutscene();
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      // ESC is only honoured on the title card — not during the cutscene
      if (this.cutsceneStarted) return;
      GameFlowManager.goToLevelSelect(this);
    }
  }

  /**
   * Destroys the title card, plays the Level 3 cutscene video, and wires up
   * the HTML skip button. Advances to the instructions screen when the video
   * completes or is skipped.
   */
  playCutscene() {
    // Guard prevents double-firing from simultaneous pointer and keyboard input
    if (this.cutsceneStarted) return;
    this.cutsceneStarted = true;

    if (this.titleCard) {
      this.titleCard.destroy();
      this.titleCard = null;
    }

    if (this.startText) {
      this.startText.destroy();
      this.startText = null;
    }

    this.cutsceneVideo = this.add.video(
      this.scale.width / 2,
      this.scale.height / 2,
      'Level03Cutscene'
    ).setOrigin(0.5);

    this.cutsceneVideo.setDisplaySize(this.scale.width / 7.5, this.scale.height / 4);
    this.cutsceneVideo.setMute(false);
    this.cutsceneVideo.play();

    // Wire up the HTML skip button if present in the DOM
    this.skipUI = document.getElementById('skip-handler-1');
    if (this.skipUI) {
      this.skipUI.style.display = 'flex';
      this.skipUI.style.top = '88%';

      const skipButton = document.getElementById('skip-button');
      if (skipButton) {
        skipButton.onclick = () => {
          if (this.cutsceneVideo) {
            this.cutsceneVideo.stop();
            this.cutsceneVideo.destroy();
            this.cutsceneVideo = null;
          }
          this.skipUI.style.display = 'none';
          this.displayInstructions();
        };
      }
    }

    this.cutsceneVideo.once('complete', () => {
      if (this.skipUI) {
        this.skipUI.style.display = 'none';
      }

      if (this.cutsceneVideo) {
        this.cutsceneVideo.destroy();
        this.cutsceneVideo = null;
      }

      this.displayInstructions();
    });
  }

  /**
   * Displays the instructions overlay after the cutscene ends.
   * The player can tap or press SPACE to proceed into the main level.
   * Guarded by a flag to prevent the overlay from being shown more than once,
   * since both the video complete event and the skip button call this method.
   */
  displayInstructions() {
    if (this.instructionsShown) return;
    this.instructionsShown = true;

    const dim = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.65
    ).setDepth(10);

    const panel = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'Level03Instructions'
    )
      .setOrigin(0.5)
      .setDepth(11);

    panel.setDisplaySize(this.scale.width, this.scale.height);

    const continueText = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.9,
      'Tap or Press Space to Continue',
      {
        fontSize: '24px',
        color: '#ffffff'
      }
    )
      .setOrigin(0.5)
      .setDepth(12);

    this.tweens.add({
      targets: continueText,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.input.once('pointerdown', () => {
      this.scene.start('SunkenWellsLevel', {});
    });

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('SunkenWellsLevel', {});
    });
  }

  /**
   * Cleans up all scene resources on exit — destroys the title card and cutscene
   * video if still active, hides the HTML skip button, and removes all input listeners.
   */
  shutdown() {
    if (this.titleCard) {
      this.titleCard.destroy();
      this.titleCard = null;
    }

    if (this.cutsceneVideo) {
      this.cutsceneVideo.stop();
      this.cutsceneVideo.destroy();
      this.cutsceneVideo = null;
    }

    if (this.skipUI) {
      this.skipUI.style.display = 'none';
    }

    this.input.removeAllListeners();
  }
}