import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { saveProgress } from '../../../Core/api.js';
import { GameState} from '../../../Core/GameState.js'

/**
 * SunkenWellsLevel
 * -----------------
 * The main gameplay scene for Level 3 (Sunken Wells).
 *
 * The player digs downward through a 9x50 grid of sandstone blocks,
 * managing an oxygen meter that drains continuously once they enter the grid.
 * Stars, air refills, shield, and drill powerups are scattered throughout.
 * Periodic wind hazards damage the player if they occupy the struck row.
 * The level is won by reaching the water at the bottom of the grid, and
 * lost if oxygen runs out. Progress is saved to the backend only on a win.
 */

export class SunkenWellsLevel extends Phaser.Scene {
  constructor() {
    super('SunkenWellsLevel');
  }

  preload(){
    this.load.image(
      "bg",
      './client/Levels/Level03/Assets/ChatGPT_Image_Mar_10_2026_05_10_04_PM.png'
    ); 
    this.load.image("block", './client/Levels/Level03/Assets/sandstone_blocktile.png');
    this.load.image("trap", './client/Levels/Level03/Assets/sandstone_traptile.png');
    this.load.image("air", './client/Levels/Level03/Assets/o2.png');
    this.load.image("star", './client/Levels/Level03/Assets/Star_to_collect.png');
    this.load.image("shield", './client/Levels/Level03/Assets/shield.png');
    this.load.image("drill", './client/Levels/Level03/Assets/drill.png');
    this.load.image("wind_damage", './client/Levels/Level03/Assets/sandslide.png');
    this.load.image("overlayBG", './client/Levels/Level03/Assets/end_overlay_background.png');
    this.load.image("waterBottom", "./client/Levels/Level03/Assets/water_cropped.png");

    this.makeRectTexture("player", 30, 35, 0xffffff);
  }

  /**
   * Initializes all level constants, layout, gameplay state, grid, visuals,
   * physics, camera, input, and HUD in sequence.
   * Timing and damage constants for the wind hazard system are defined here
   * so they can be tuned from a single location.
   */
  create(initData) {
    // Grid layout ratios — expressed as fractions of screen dimensions
    this.GRID_WIDTH_RATIO = 0.90;
    this.GRID_HEIGHT_RATIO = 0.80;
    this.SPAWN_AREA_RATIO = 0.15;

    // Wind hazard timing and damage constants
    this.WIND_WARNING_MS = 1000;
    this.WIND_DAMAGE = 15;
    this.WIND_VISIBLE_MS = 1000;
    this.WIND_FADE_MS = 1000;

    // Trap tile damage constant
    this.TRAP_DAMAGE = 10;

    this.initLayout();
    
    const background = this.add.image(0, 0, 'bg').setOrigin(0,0);
    background.setScrollFactor(0);
    background.setDisplaySize(this.scale.width, this.scale.height);
    background.setDepth(-10);

    this.initGameplayState(initData);
    this.buildGrid();
    this.initBottomWater();

    this.blocksGroup = this.physics.add.staticGroup();
    this.pickupsGroup = this.physics.add.staticGroup();
    this.renderAllTiles();

    this.spawnPlayer();
    this.initPhysics();
    this.initCamera();
    this.initInput();
    this.initUI();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Derives all spatial constants from screen dimensions and the configured
   * layout ratios. Values produced here i.e. TILE size, world dimensions,
   * grid offsets,  are used throughout the rest of the scene.
   */
  initLayout(){
    this.COLS = 9;
    this.ROWS = 50;

    this.gridWidthPx  = Math.floor(this.scale.width * this.GRID_WIDTH_RATIO);
    this.gridHeightPx = Math.floor(this.scale.height * this.GRID_HEIGHT_RATIO); 
    this.spawnAreaHeightPx = Math.floor(this.scale.height * this.SPAWN_AREA_RATIO);
    this.gridOffsetY = this.spawnAreaHeightPx;
    
    // Tile size is derived from grid width so the level scales to any screen
    this.TILE = Math.floor(this.gridWidthPx/this.COLS);

    this.worldW = this.COLS * this.TILE;
    this.worldH = this.ROWS * this.TILE;

    this.gridOffsetX = Math.floor((this.scale.width - this.worldW) / 2);
    this.gridBottomY = this.gridOffsetY + this.worldH;
    this.visibleRows = Math.floor(this.gridHeightPx / this.TILE);
    this.winRow = this.ROWS - 1;
  }

  /**
   * Resets all runtime gameplay variables to their initial values.
   * Called at the start of every run to ensure a clean state.
   * isWin is left as undefined rather than false to accurately represent
   * that the outcome has not yet been determined.
   */
  initGameplayState(initData){
    this.levelId = initData?.levelId ?? "sunken-wells";

    // Level outcome flags
    this.ended = false;
    this.isWin = undefined;
    this.isPausedMenuOpen = false;
    this.oxygenActive = false;
    this.endOverlayShown = false;
    this.resultSaved = false;

    // Oxygen system
    this.oxygenMax = 100;
    this.oxygen = this.oxygenMax;
    this.oxygenDrainPerSec = 2;
    this.airRefillAmount = 33;

    // Dig system
    this.lastDigAt = 0;
    this.digCooldownMs = 500;
    this.digCooldownDrillMs = 200;

    // Powerup state
    this.shieldActive = false;
    this.shieldHitsLeft = 0;
    this.shieldEndsAt = 0;

    this.drillActive = false;
    this.drillEndsAt = 0;

    // Stars tracking
    this.totalStars = 3;
    this.starsCollected = 0;

    // wind hazard timing. Randomized to create unpredictability
    this.windEveryMs = Math.random() * (5000) + 10000;
    this.lastWindAt = this.time.now + Phaser.Math.Between(0, 3000);

    // Tracks row with an active wind hazard for damage detection
    this.activeWindRows = new Set();

    // Tile type constants
    this.TILE_EMPTY = 0; 
    this.TILE_BLOCK = 1;
    this.TILE_TRAP = 2;
    this.TILE_AIR = 3;
    this.TILE_STAR = 4;
    this.TILE_SHIELD = 5;
    this.TILE_DRILL  = 6;
  }

  /**
   * Constructs the 2D grid array, starting fully solid, then scatters
   * stars, air pickups, traps, and powerups using placement passes.
   * Spacing arguments prevent items of the same type from clustering.
   */
  buildGrid(){
    this.grid = Array.from({ length: this.ROWS }, () =>
      Array(this.COLS).fill(this.TILE_BLOCK)
    );

    this.placeStarsInBands();
    this.scatterTiles(this.TILE_AIR, 8, 4);
    this.scatterTiles(this.TILE_TRAP, 15, 4);
    this.scatterTiles(this.TILE_SHIELD, 4, 10);
    this.scatterTiles(this.TILE_DRILL, 4, 10);
  }

  /**
   * Places the water image at the base of the grid using a geometry mask
   * to clip any transparent padding present in the source asset.
   */
  initBottomWater(){
    this.waterSectionHeight = this.TILE * 2;

    this.water = this.add.image(
      this.gridOffsetX + this.worldW / 2,
      this.gridBottomY + this.waterSectionHeight / 2 + 20,
      "waterBottom"
    ).setOrigin(0.5).setDepth(-5);

    this.water.setDisplaySize(this.scale.width, this.waterSectionHeight );
  }

  /**
   * Spawns the player sprite above the grid at the center column.
   */
  spawnPlayer(){
    const spawnC = Math.floor(this.COLS / 2);
    const spawnY = Math.max(this.TILE / 2, this.gridOffsetY - this.TILE * 0.6);
    const spawnX = this.gridOffsetX + spawnC * this.TILE + this.TILE / 2;
    
    this.player = this.physics.add.sprite(spawnX, spawnY, "player");
    this.player.setCollideWorldBounds(true);
  }

  /**
   * Configures world bounds, gravity, and physics relationships between
   * the player, block tiles, and pickup tiles.
   */
  initPhysics(){
    const boundsX = this.gridOffsetX;
    const boundsY = 0;
    const boundsW = this.worldW;
    const boundsH = this.gridOffsetY + this.worldH + this.waterSectionHeight;

    this.physics.world.setBounds(boundsX, boundsY, boundsW, boundsH);
    this.physics.world.gravity.y = 700;

    this.physics.add.collider(this.player, this.blocksGroup);
    this.physics.add.overlap(this.player, this.pickupsGroup, this.onPickup, null, this);
  }

  /**
   * Sets camera bounds to match the physics world and configures vertical
   * follow with a small lerp. A follow offset is applied so the player
   * appears in the upper portion of the viewport, maximising downward visibility.
   */
  initCamera(){    
    const boundsX = 0;
    const boundsY = 0;
    const boundsW = this.worldW;
    const boundsH = this.gridOffsetY + this.worldH + this.waterSectionHeight;

    const desiredPlayerScreenY = this.gridOffsetY + Math.floor(this.gridHeightPx / 2);
    const cameraCenterY = Math.floor(this.scale.height / 2);
    const followOffsetY = desiredPlayerScreenY - cameraCenterY;

    this.cameras.main.setBounds(boundsX, boundsY, boundsW, boundsH);
    this.cameras.main.startFollow(this.player, true, 0, 0.12, 0, followOffsetY);
  }

  /**
   * Registers all keyboard inputs used during gameplay.
   * Pause confirm (Y) and cancel (N) keys are registered here so they
   * are always available when the pause menu opens.
   */
  initInput(){
    this.confirmKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
    this.cancelKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: "W",
      A: "A",
      S: "S",
      D: "D",
      DIG: "E",
    });
  }

  /**
   * Builds and positions all HUD elements: oxygen bar background, fill, and label;
   * three star icons; shield icon and charge label; drill icon and status label.
   * All elements use setScrollFactor(0) to remain fixed to the screen regardless
   * of camera position.
   */
  initUI(){
    const topY = 30;

    // Oxygen bar 
    this.oxygenBarBg = this.add
      .rectangle(140, topY, 220, 24, 0x222222, 0.85)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.oxygenBarFill = this.add
      .rectangle(140, topY, 220, 24, 0x4fd3ff, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.displayedOxygenRatio = 1; 

    this.oxygenLabel = this.add
      .text(40, topY -10, "OXYGEN", {
        fontSize: "22px",
        color: "#eee9e6",
        fontStyle: "bold",
      })
      .setScrollFactor(0);

    // Stars icons - dim by default, lit when collected
    this.starIcons = [];
    const starStartX = this.scale.width / 2 - 90;
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(starStartX + i * 90, topY, "star")
        .setScrollFactor(0)
        .setScale(this.TILE / (756*5))
        .setAlpha(0.25);0
      this.starIcons.push(star);
    }

    // Shield icon and charge counter
    this.shieldIcon = this.add.image(this.scale.width - 140, topY, "shield")
      .setScrollFactor(0)
      .setScale(0.05)
      .setAlpha(0.25);

    this.shieldText = this.add.text(this.scale.width - 110, topY - 14, "", {
      fontSize: "22px",
      color: "#ffffff",
    }).setScrollFactor(0);

    // Drill icon and status label
    this.drillIcon = this.add.image(this.scale.width - 60, topY, "drill")
      .setScrollFactor(0)
      .setScale(0.05)
      .setAlpha(0.25);

    this.drillText = this.add.text(this.scale.width - 30, topY - 14, "", {
      fontSize: "22px",
      color: "#ffffff",
    }).setScrollFactor(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN LOOP
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Main game loop. Processes ESC input first, then exits early if the level
   * has ended or the pause menu is open. During active gameplay, handles
   * oxygen drain, powerup expiry, movement, wind row damage, digging,
   * win detection, wind hazard triggering, and HUD updates in sequence.
   */
  update(time, delta) {

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (!this.isPausedMenuOpen && !this.ended) {
        this.openPauseMenu();
          return;
      }

      if (this.ended && this.endOverlayShown) {
        this.saveLevelResult();
        this.scene.start('Level03EntryScene');
      }
    }

    
    if(this.ended) return;

    if (this.isPausedMenuOpen) {

      if (Phaser.Input.Keyboard.JustDown(this.confirmKey)) {
        this.physics.resume();
        this.isPausedMenuOpen = false;
        this.scene.start('Level03EntryScene');
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.cancelKey)) {
        this.closePauseMenu();
        return;
      }

      return;
    }

    const dt = delta / 1000;

    // Oxygen drain activates the moment the player crosses into the grid
    if (!this.oxygenActive && this.player.y >= this.gridOffsetY) {
      this.oxygenActive = true;
    }

    // Powerup expiry checks
    if (this.shieldActive && time >= this.shieldEndsAt) {
      this.shieldActive = false;
      this.shieldHitsLeft = 0;
    }
    if (this.drillActive && time >= this.drillEndsAt) {
      this.drillActive = false;
    }

    if (this.oxygenActive) {
      this.oxygen = Math.max(0, this.oxygen - this.oxygenDrainPerSec * dt);

      if (this.oxygen <= 0) {
        this.endAsLose();
        return;
      }
    }
    
    this.handleMovement();

    // Wind row damage check — runs each frame while any rows are active
    if (this.activeWindRows.size > 0) {
      for (const row of this.activeWindRows) {
        if (this.isPlayerTouchingRow(row)) {
          // Delete before takeDamage so a single event can only deal damage once
          this.activeWindRows.delete(row);
          this.takeDamage(this.WIND_DAMAGE);
          break;
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.DIG)) {
      this.tryDig(time);
    }

    // WIN CONDITION: player's position has crossed the bottom of the grid
    if (this.hasReachedWaterline() && !this.ended) {
      this.ended = true;
      this.player.setVelocity(0, 0);
      this.physics.pause();
      
      this.time.delayedCall(500, ()=> {
        this.endAsWin();
      });

      return;
    }

    // Wind hazard fires on a randomized interval
    if (time - this.lastWindAt >= this.windEveryMs) {
      this.lastWindAt = time;
      this.triggerWindRowHazard();
    }

    this.updateUI();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Updates the oxygen bar fill width and colour, the star icon alpha states,
   * and the shield and drill icon states each frame.
   * The displayed ratio is lerped toward the actual value for a smooth bar animation.
   */
  updateUI() {
    const oxygenRatio = Phaser.Math.Clamp(this.oxygen / this.oxygenMax, 0, 1);

    // Smooth bar fill using linear interpolation
    this.displayedOxygenRatio +=(oxygenRatio - this.displayedOxygenRatio) * 0.1;
    this.oxygenBarFill.width = 220 * this.displayedOxygenRatio;

    // color thresholds provide visual urgency at low oxygen levels
    if (oxygenRatio <= 0.20) {
      this.oxygenBarFill.fillColor = 0xff3b30; // red
    } else if (oxygenRatio <= 0.40) {
      this.oxygenBarFill.fillColor = 0xffa500; // orange
    } else {
      this.oxygenBarFill.fillColor = 0x4fd3ff; // blue
    }
    this.oxygenLabel.setText(`OXYGEN: ${Math.ceil(this.oxygen)}/${this.oxygenMax}`);

    for (let i = 0; i < this.starIcons.length; i++) {
      this.starIcons[i].setAlpha(i < this.starsCollected ? 1 : 0.25);
    }

    if (this.shieldActive) {
      this.shieldIcon.setAlpha(1);
      this.shieldText.setText(`${this.shieldHitsLeft}`);
    } else {
      this.shieldIcon.setAlpha(0.25);
      this.shieldText.setText("");
    }

    if (this.drillActive) {
      this.drillIcon.setAlpha(1);
      this.drillText.setText("ON");
    } else {
      this.drillIcon.setAlpha(0.25);
      this.drillText.setText("");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOVEMENT & DIGGING
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Returns true when the player's bottom edge has passed the bottom boundary
   * of the last grid row, signalling that the water has been reached.
   */
  hasReachedWaterline() {
    const waterLineY = this.gridOffsetY + this.worldH;
    return this.player.y >= waterLineY;
  }

  /**
   * Handles left/right movement and jumping each frame.
   * Horizontal velocity is set directly rather than accumulated, so the player
   * stops instantly on key release. Jumping is only permitted when the physics
   * body reports contact with a surface below.
   */
  handleMovement() {
    const speed = 200;

    const left  = this.cursors.left.isDown  || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up    = this.cursors.up.isDown    || this.keys.W.isDown;

    if (left)       this.player.setVelocityX(-speed);
    else if (right) this.player.setVelocityX(speed);
    else            this.player.setVelocityX(0);

    if (up && this.player.body.blocked.down) {
      this.player.setVelocityY(-550);
    }
  }

  /**
   * Attempts to dig the tile adjacent to the player in the current movement
   * direction, subject to a cooldown. The drill powerup halves the cooldown.
   * Digging a trap tile removes it and deals damage to the player.
   * Digging is blocked in all directions except downward while above the grid.
   */
  tryDig(time) {
    const cooldown = this.drillActive ? this.digCooldownDrillMs : this.digCooldownMs;
    if (time - this.lastDigAt < cooldown) return;
    this.lastDigAt = time;

    // Above grid: only downward digs are permitted to enter the level
    if (this.player.y < this.gridOffsetY) {
      if (this.getDigDirection() !== "down") return;
    }

    const dir = this.getDigDirection();
    const { r, c } = this.worldToGrid(this.player.x, this.player.y);

    const target = { r, c };
    if (dir === "left")  target.c -= 1;
    if (dir === "right") target.c += 1;
    if (dir === "up")    target.r -= 1;
    if (dir === "down")  target.r += 1;

    if (!this.inBounds(target.r, target.c)) return;

    const t = this.grid[target.r][target.c];

    if (t === this.TILE_BLOCK) {
      this.setTile(target.r, target.c, this.TILE_EMPTY);
      return;
    }

    if (t === this.TILE_TRAP) {
      this.setTile(target.r, target.c, this.TILE_EMPTY);
      this.takeDamage(this.TRAP_DAMAGE);
    }
  }

  /**
   * Resolves the dig direction from currently held movement keys.
   * Priority order is up, left, right, down. Defaults to down when no
   * directional key is held so the player can dig straight down by
   * pressing E with no other input.
   */
  getDigDirection() {
    const up    = this.cursors.up.isDown    || this.keys.W.isDown;
    const left  = this.cursors.left.isDown  || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const down  = this.cursors.down.isDown  || this.keys.S.isDown;

    if (up)    return "up";
    if (left)  return "left";
    if (right) return "right";
    if (down)  return "down";
    return "down";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WIND HAZARD
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Triggers a wind row hazard near the player's current position.
   * Shows a pulsing warning band for WIND_WARNING_MS, then replaces it with
   * the sandslide visual asset for WIND_VISIBLE_MS. The affected row is
   * registered in activeWindRows during the visible window so update() can
   * detect and deal damage if the player occupies it. The visual then fades
   * out over WIND_FADE_MS.
   */
  triggerWindRowHazard() {
    const pr = this.worldToGrid(this.player.x, this.player.y).r;
    const windRow = Phaser.Math.Clamp(
      pr + Phaser.Math.Between(-1, 2),
      4,
      this.ROWS - 1
    );

    const y = this.gridToWorldY(windRow);
    const centerX = this.gridOffsetX + this.worldW / 2;

    // Warning band pulses to alert the player before the strike
    const warningBand = this.add
      .rectangle(centerX, y, this.worldW, this.TILE, 0x490000, 0.4)
      .setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: warningBand,
      alpha: { from: 0.5, to: 0.8},
      duration: 250,
      yoyo: true,
      repeat: 5
    });

    this.time.delayedCall(this.WIND_WARNING_MS, () => {
      if (!warningBand.active) return;
      warningBand.destroy();

      // Sandslide visual — physics body keeps it pinned, no gravity applied
      const damageBand = this.physics.add
        .sprite(centerX, y, "wind_damage")
        .setDisplaySize(this.worldW * 1.15, this.TILE * 2.5)
        .setOrigin(0.5)
        .setImmovable(true);

      damageBand.body.allowGravity = false;
      damageBand.body.setSize(this.worldW, this.TILE, true);

      
      // Register row — update() checks this Set each frame for player contact
      this.activeWindRows.add(windRow);

      // Remove the row from the active set when the visible window closes
      this.time.delayedCall(this.WIND_VISIBLE_MS, () => {
        this.activeWindRows.delete(windRow);

        this.tweens.add({
          targets: damageBand,
          alpha: 0,
          duration: this.WIND_FADE_MS,
          ease: "Sine.easeOut",
          onComplete: () => damageBand.destroy()
        });
      });
    });
  }

  /**
   * Returns true if the player's physics body vertically overlaps with the
   * world-space bounds of the given grid row. Used by update() to determine
   * whether the player is on an active wind row.
   */
  isPlayerTouchingRow(row) {
    const rowTop = this.gridToWorldY(row) - this.TILE / 2;
    const rowBottom = rowTop + this.TILE;

    const playerTop = this.player.body.y;
    const playerBottom = this.player.body.y + this.player.body.height;

    return playerBottom > rowTop && playerTop < rowBottom;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TILE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Updates a cell in the grid array, destroys its existing sprite from the
   * blocks group, and spawns a new sprite if the new type is not empty.
   * Called by tryDig whenever a block or trap is removed.
   */
  setTile(r, c, newType) {
    this.grid[r][c] = newType;

    for (const child of this.blocksGroup.getChildren()) {
      if (child.getData("r") === r && child.getData("c") === c) {
        child.destroy();
        break;
      }
    }

    if (newType !== this.TILE_EMPTY) {
      this.spawnTileSprite(r, c, newType);
    }
  }

  /**
   * Handles all four pickup types when the player overlaps a pickup sprite.
   * Air refills oxygen up to the maximum. Stars increment the collected count.
   * Shield grants 2 hit charges and a 10-second timer. Drill activates for
   * 10 seconds, halving the dig cooldown. All pickups destroy themselves on collection.
   */
  onPickup(player, pickup) {
    const type = pickup.getData("type");

    if (type === "air") {
      this.oxygen = Math.min(this.oxygenMax, this.oxygen + this.airRefillAmount);
      pickup.destroy();
      return;
    }

    if (type === "star") {
      this.starsCollected = Math.min(this.totalStars, this.starsCollected + 1);
      pickup.destroy();
      return;
    }

    const now = this.time.now;

    if (type === "shield") {
      this.shieldActive = true;
      this.shieldHitsLeft = 2;
      this.shieldEndsAt = now + 10000; // refresh
      pickup.destroy();
      return;
    }

    if (type === "drill") {
      this.drillActive = true;
      this.drillEndsAt = now + 10000; // refresh
      pickup.destroy();
      return;
    }
  }

  /**
   * Applies damage to the player as an oxygen reduction.
   * If a shield is active with remaining charges, the hit is absorbed
   * and the charge count decremented instead. The shield deactivates
   * when all charges are consumed.
   */
  takeDamage(extraOxygenDrain) {
     if (this.shieldActive && this.shieldHitsLeft > 0) {
       this.shieldHitsLeft -= 1;
       if (this.shieldHitsLeft <= 0) this.shieldActive = false;
       return;
     }
     this.oxygen = Math.max(0, this.oxygen - extraOxygenDrain);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WIN / LOSE
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Records the win outcome and displays the end overlay.
   * Setting isWin before calling showEndOverlay ensures saveLevelResult
   * will permit a backend write when the player exits.
   */
  endAsWin() {
    if (this.endOverlayShown) return;
    this.isWin = true;
    this.ended = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    this.showEndOverlay(this.isWin);
  }

  /**
   * Records the lose outcome and displays the end overlay.
   * isWin is set to false so saveLevelResult will block any backend write.
   */
  endAsLose() {
    if (this.endOverlayShown) return;
    this.isWin = false;
    this.ended = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    this.showEndOverlay(this.isWin);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GRID RENDERING
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Iterates every cell in the grid and spawns the corresponding sprite.
   * Called once during create() after the grid array is fully built.
   */
  renderAllTiles() {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        this.spawnTileSprite(r, c, this.grid[r][c]);
      }
    }
  }

  /**
   * Spawns a single tile sprite at the given grid coordinates based on its type.
   * Block and trap tiles are added to the static blocks group for collisions.
   * Pickup tiles are added to the pickups group with a reduced hitbox to require
   * deliberate contact rather than incidental overlap.
   */
  spawnTileSprite(r, c, t) {
    const x = this.gridToWorldX(c);
    const y = this.gridToWorldY(r);

    if (t === this.TILE_BLOCK) {
      const b = this.blocksGroup.create(x, y, "block");
      b.setData("r", r);
      b.setData("c", c);
      b.setScale(this.TILE / 1024);
      b.refreshBody();
      return;
    }

    if (t === this.TILE_TRAP) {
      const b = this.blocksGroup.create(x, y, "trap");
      b.setData("r", r);
      b.setData("c", c);
      b.setScale(this.TILE / 1024);
      b.refreshBody();
      return;
    }

    if (t === this.TILE_AIR) {
      const p = this.pickupsGroup.create(x, y, "air");
      p.setData("type", "air");
      p.setScale(this.TILE / (1538));
      p.setOrigin(0.5, 0.5);
      p.refreshBody();
      const hitbox = Math.floor(this.TILE * 0.55);
      p.body.setSize(hitbox, hitbox, true);
      p.refreshBody();
      return;
    }

    if (t === this.TILE_STAR) {
      const p = this.pickupsGroup.create(x, y, "star");
      p.setData("type", "star");
      p.setScale(this.TILE / (756*2));
      p.setOrigin(0.5, 0.5);
      p.refreshBody();
      const hitbox = Math.floor(this.TILE * 0.55);
      p.body.setSize(hitbox, hitbox, true);
      p.refreshBody();
      return;
    }

    if (t === this.TILE_SHIELD) {
      const p = this.pickupsGroup.create(x, y, "shield");
      p.setData("type", "shield");
      p.setScale(this.TILE / (1024*2));
      p.setOrigin(0.5, 0.5);
      p.refreshBody();
      const hitbox = Math.floor(this.TILE * 0.55);
      p.body.setSize(hitbox, hitbox, true);
      p.refreshBody();
      return;
    }

    if (t === this.TILE_DRILL) {
      const p = this.pickupsGroup.create(x, y, "drill");
      p.setData("type", "drill");
      p.setScale(this.TILE / (1024*2));
      p.setOrigin(0.5, 0.5);
      p.refreshBody();
      const hitbox = Math.floor(this.TILE * 0.55);
      p.body.setSize(hitbox, hitbox, true);
      p.refreshBody();
      return;
    }
  }


  // ─────────────────────────────────────────────────────────────────────────
  // GRID POPULATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Places exactly one star per depth band across three vertical zones,
   * ensuring stars are distributed across early, mid, and late sections
   * of the level rather than clustering randomly. Retries up to 200 times
   * per band to find an unoccupied block cell.
   */
  placeStarsInBands() {
    const bands = [
      { rMin: 10, rMax: 18},
      { rMin: 22, rMax: 32},
      { rMin: 35, rMax: 47}
    ];

    for (const band of bands){
      for (let tries = 0; tries < 200; tries++){
        const r = Phaser.Math.Between(band.rMin, band.rMax);
        const c = Phaser.Math.Between(1, this.COLS - 2);
        if (this.grid[r][c] === this.TILE_BLOCK){
          this.grid[r][c] = this.TILE_STAR;
          break;
        }
      }
    }
  }

  /**
   * Randomly places a given number of tiles of the specified type throughout
   * the grid, skipping cells that are already occupied or too close to another
   * tile of the same type. The spacing parameter controls the minimum grid
   * distance between tiles of the same type to prevent clustering.
   */
  scatterTiles(type, count, spacing = 2){
    let placed = 0;
    let tries = 0;
    
    while (placed < count && tries <4000){
      tries++;
      const r = Phaser.Math.Between(5, this.ROWS -3);
      const c = Phaser.Math.Between(0, this.COLS -1);
      if (this.grid[r][c] !== this.TILE_BLOCK) continue;
      if (this.isNearType(r, c, type, spacing)) continue;
      this.grid[r][c] = type;
      placed++;
    }
    if (placed < count) {
      console.warn(`Only placed ${placed}/${count} of type ${type}`);
    }
  }

  /**
   * Returns true if any cell within the given radius around (r, c) contains
   * a tile of the specified type. Used by scatterTiles to enforce minimum
   * spacing between items of the same type.
   */
  isNearType(r, c, type, radius = 2) {
    for (let rr = r - radius; rr <= r + radius; rr++) {
      for (let cc = c - radius; cc <= c + radius; cc++) {
        if (!this.inBounds(rr, cc)) continue;
        if (this.grid[rr][cc] === type) return true;
      }
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COORDINATE UTILITIES
  // ─────────────────────────────────────────────────────────────────────────
 
  /** Returns true if the given row and column are within grid bounds. */
  inBounds(r, c) {
    return r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS;
  }

  /** Converts a world-space position to the nearest grid cell (row, column). */
  worldToGrid(x, y) {
    const localX = x - this.gridOffsetX;
    const localY = y - this.gridOffsetY;
    return { c: Math.floor(localX / this.TILE), r: Math.floor(localY / this.TILE) };
  }

  /** Returns the world X centre of the given grid column. */
  gridToWorldX(c) {
    return this.gridOffsetX + c * this.TILE + this.TILE / 2;
  }

 
  /** Returns the world Y centre of the given grid row. */
  gridToWorldY(r) {
    return this.gridOffsetY + r * this.TILE + this.TILE / 2;
  }

  /**
   * Generates and caches a rounded rectangle texture under the given key.
   * The existence check prevents duplicate texture registration if the scene
   * is visited more than once in the same session.
   */
  makeRectTexture(key, w, h, color) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAUSE MENU
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Pauses physics, overlays a dim and a panel, and registers Y/N keys for
   * confirm and cancel. All elements use setScrollFactor(0) so the menu
   * remains centred on screen regardless of how far the camera has scrolled.
   */
  openPauseMenu() {
    this.isPausedMenuOpen = true;
    this.physics.pause();

    this.pauseDim = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x000000,
        0.6
    ).setDepth(30).setScrollFactor(0);

    this.pauseBox = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        500,
        150,
        0x111111,
        0.6
    ).setDepth(31).setRounded(20).setScrollFactor(0);

    this.pauseText = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2 - 30,
        "Exit Level?\n",
        {
            fontSize: '32px',
            color: '#ffffff'
        }
    ).setOrigin(0.5).setDepth(32).setScrollFactor(0);

    this.pauseSubText = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2 + 20,
        "Press Y to confirm\n\nPress N to cancel",
        {
            fontSize: '20px',
            color: '#cccccc',
            align: 'center'
        }
    ).setOrigin(0.5).setDepth(32).setScrollFactor(0);
  } 

  /**
   * Destroys all pause menu elements and resumes physics.
   */
  closePauseMenu() {
    this.isPausedMenuOpen = false;
    this.pauseDim.destroy();
    this.pauseBox.destroy();
    this.pauseText.destroy();
    this.pauseSubText.destroy();
    this.physics.resume();
  }


  
  // ─────────────────────────────────────────────────────────────────────────
  // SAVING
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Saves the player's star count to the backend, but only on a win.
   * The isWin guard ensures stars collected during a lost run are never written.
   * The resultSaved flag prevents duplicate API calls if the player presses
   * ESC multiple times after the end overlay appears.
   */
  async saveLevelResult() {
    if (this.resultSaved) return;
    if (!this.isWin) return;

    try {
      if (GameState.userId) {
        await saveProgress(
          GameState.userId,
          'level03',
          this.starsCollected
        )
      }
      this.resultSaved = true;    
      console.log("Progress saved;", this.levelId, this.starsCollected);
    } catch(error){
      console.error("Failed to save progress", error);
    }
  
  }

  // ─────────────────────────────────────────────────────────────────────────
  // END OVERLAY
  // ─────────────────────────────────────────────────────────────────────────
 
  /**
   * Builds and animates the end-of-level overlay panel containing the outcome
   * title, collected star icons, a climate action tips section, and an exit
   * prompt. The container is fixed to the screen via setScrollFactor(0) and
   * pops in using a Back.Out scale and alpha tween.
   */
  showEndOverlay(isWin) {
    if (this.endOverlayShown) return;
    this.endOverlayShown = true;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

 
    // Full-screen interactive blocker prevents clicks from passing through
    const blocker = this.add.rectangle(
      centerX,
      centerY,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    )
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive();
    
    blocker.on("pointerdown", (pointer, localX, localY, event) => {
      if (event) event.stopPropagation();
    });

    const container = this.add.container(centerX, centerY)
      .setScrollFactor(0)
      .setDepth(2001);

    const panel = this.add.image(0, 0, 'overlayBG');
    const targetPanelW = 940;
    const targetPanelH = 730;

    const scale = Math.min(
      targetPanelW / panel.width,
      targetPanelH / panel.height
    );
    panel.setScale(scale);

    const panelW = panel.displayWidth;
    const panelH = panel.displayHeight;

    const panelShadow = this.add.rectangle(8, 8, panelW, panelH, 0x000000, 0.35);
    panelShadow.setDepth(panel.depth - 1);

    const panelBorder = this.add.rectangle(0, 0, panelW + 12, panelH + 12, 0x000000, 0.35)
      .setStrokeStyle(3, 0x222222, 1);

    const title = this.add.text(
      0, -140,
      isWin ? "WATER REACHED" : "OUT OF OXYGEN",
      {
        fontSize: "42px",
        color: isWin ? "#7CFC00" : "#4a0006",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    const starsLabel = this.add.text(
      0,
      -50,
      `Stars collected: ${this.starsCollected}/${this.totalStars}`,
      {
        fontSize: "28px",
        color: "#4a0006",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    // star icons - lit for collected, dim for uncollected
    const starNodes = [];
    const starSpacing = 90;
    const starStartX = -starSpacing;
    const starScale = 0.10

    for (let i = 0; i < this.totalStars; i++) {
      const star = this.add.image(starStartX + i * starSpacing, 20, "star")
        .setScale(starScale)
        .setAlpha(i < this.starsCollected ? 1 : 0.2);
      starNodes.push(star);
    }
    
    const divider = this.add.rectangle(0, 95, panelW * 0.85, 1, 0xffffff, 0.2);

    const tipsTitle = this.add.text(0, 120, "TAKE ACTION", {
      fontSize: "28px",
      color: "#900d09",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const tips = [
      "- Plant native vegetation to anchor soil and prevent wind erosion",
      "- Conserve water daily; groundwater loss accelerates desertification",
      "- Reduce meat consumption to lower overgrazing pressure on land",
    ];

    const tipNodes = tips.map((tip, i) =>
      this.add.text(0, 150 + i * 35, tip, {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        fontStyle : "bold",
        wordWrap: { width: panelW * 0.85 },
      }).setOrigin(0.5)
    );

    const exitText = this.add.text(
      0,
      270,
      "Press Esc to Exit",
      {
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    container.add([
      panelShadow,
      panelBorder,
      panel,
      title,
      starsLabel,
      ...starNodes,
      divider,
      tipsTitle,
      ...tipNodes,
      exitText
    ]);

    // Pop-in animation
    container.setScale(0.85);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 250,
      ease: "Back.Out"
    });

    this.endOverlayBlocker = blocker;
    this.endOverlayContainer = container;
  }
}