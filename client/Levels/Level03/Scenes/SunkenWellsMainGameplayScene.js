 import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';

export class SunkenWellsMainGameplayScene extends Phaser.Scene {
  constructor() {
    super('SunkenWellsMainGameplayScene');
  }
    
  create(initData) {
    // Grid configuration
    this.COLS = 9;
    this.ROWS = 50;

    // The grid sits in the background's frame
    this.gridWidthPx  = Math.floor(this.scale.width * 0.90);
    this.gridHeightPx = Math.floor(this.scale.height * 0.80); 

    //Grid is centered
    this.gridOffsetX = Math.floor((this.scale.width - this.gridWidthPx) / 2);
    this.spawnAreaHeightPx = Math.floor(this.scale.height * 0.15);
    this.gridOffsetY = this.spawnAreaHeightPx;
    
    //9 tiles per row
    this.TILE = Math.floor(this.gridWidthPx/this.COLS);

    //GRID SIZE
    this.worldW = this.COLS * this.TILE;
    this.worldH = this.ROWS * this.TILE;

    this.visibleRows = Math.floor(this.gridHeightPx / this.TILE);

    //BACKGROUND (NEEDS ASSETS)
    const background = this.add.image(0, 0, 'desertBackGround').setOrigin(0,0);
    background.setDisplaySize(this.scale.width, this.scale.height);
    background.setDepth(-10);

    //MECHANICS(HARD STUFF)

    //oxygen
    this.oxygenMax = 100;
    this.oxygen = this.oxygenMax;
    this.oxygenDrainPerSec = 4;
    this.oxygenDrainPerDamage = 10;
    this.airRefillAmount = 33;

    //THE DIG
    this.lastDigAt = 0;
    this.digCooldownMs = 500;
    this.digCooldownDrillMs = 200;

    //Powerups
    this.shieldActive = false;
    this.shieldHitsLeft = 0;
    this.shieldEndAt = 0;

    this.drillActive = false;
    this.drillEndsAt = 0;

    // Stars
    this.totalStars = 3;
    this.starsCollected = 0;

    // Row hazard: wind/sand slide
    this.windEveryMs = Math.random() * (18000 - 13000) + 13000;
    this.lastWindAt = 0;

    //identification (for saving)
    this.levelId = initData?.levelId ?? "sunken-wells";

    // End state flag
    this.ended = false;

    //GRID DETAILS
    this.TILE_EMPTY = 0; 
    this.TILE_BLOCK = 1;
    this.TILE_TRAP = 2;
    this.TILE_AIR = 3;
    this.TILE_STAR = 4;
    this.TILE_SHIELD = 5;
    this.TILE_DRILL  = 6;

    // Start with a world of solid blocks
    this.grid = Array.from({ length: this.ROWS }, () =>
      Array(this.COLS).fill(this.TILE_BLOCK)
    );

    this.placeStarsInBands();
    this.scatterTiles(this.TILE_AIR, 8);
    this.scatterTiles(this.TILE_TRAP, 7);
    this.scatterTiles(this.TILE_SHIELD, 3);
    this.scatterTiles(this.TILE_DRILL, 3);

    //physics + render
    this.blocksGroup = this.physics.add.staticGroup();
    this.pickupsGroup = this.physics.add.staticGroup();
    this.renderAllTiles();

    //bounds
    const boundsX = this.gridOffsetX;
    const boundsY = 0;
    const boundsW = this.worldW;
    const boundsH = this.gridOffsetY + this.worldH;

    this.physics.world.setBounds(boundsX, boundsY, boundsW, boundsH);

    //player
    const spawnC = Math.floor(this.COLS / 2);
    const spawnY = Math.max(this.TILE / 2, this.gridOffsetY - this.TILE * 0.6);

    this.player = this.physics.add.sprite(this.gridToWorldX(spawnC), spawnY, "player");
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.blocksGroup);
    this.physics.add.overlap(this.player, this.pickupsGroup, this.onPickup, null, this);

    //CAMERA CONTROL
    const desiredPlayerScreenY = this.gridOffsetY + Math.floor(this.gridHeightPx / 2);
    const cameraCenterY = Math.floor(this.scale.height / 2);
    const followOffsetY = desiredPlayerScreenY - cameraCenterY;

    this.cameras.main.setBounds(boundsX, boundsY, boundsW, boundsH);
    this.cameras.main.startFollow(this.player, true, 0, 0.12, 0, followOffsetY);

    //INPUT
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: "W",
      A: "A",
      S: "S",
      D: "D",
      DIG: "E",
    });

    //UI
    this.uiText = this.add.text(12, 12, "", { fontSize: "16px" }).setScrollFactor(0);

    this.hintText = this.add
      .text(12, 70, "Move: WASD/Arrows\nDig: E (use direction keys)\nPowerups activate on pickup", {
        fontSize: "14px",
      })
      .setScrollFactor(0); 
  }

  update(time, delta) {
    if (this.ended) return;

    // WIN CHECK: if the player passes the bottom row, win immediately.
    if (this.hasReachedWaterline()) {
      this.endAsWin();
      return;
    } 

    const dt = delta / 1000;

    // Oxygen drain
    this.oxygen = Math.max(0, this.oxygen - this.oxygenDrainPerSec * dt);
    if (this.oxygen <= 0) return this.endAsLose();
  }
}