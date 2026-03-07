 import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { GameState } from '../../../Core/GameState.js';

export class SunkenWellsLevel extends Phaser.Scene {
  constructor() {
    super('SunkenWellsLevel');
  }

  preload(){
    this.load.image("bg", './client/Levels/Level03/Assets/2levels.png');
    this.load.image("block", './client/Levels/Level03/Assets/sandstone_blocktile.png');
    this.load.image("trap", './client/Levels/Level03/Assets/sandstone_traptile.png');
    this.makeRectTexture("air", 24, 24, 0x8bd3ff);
    this.makeRectTexture("star", 24, 24, 0xffd34d);
    this.load.image("shield", './client/Levels/Level03/Assets/shield.png');
    this.load.image("drill", './client/Levels/Level03/Assets/drill.png');
    this.makeRectTexture("player", 24, 28, 0xffffff);
  }

  create(initData) {
    // Grid configuration
    this.COLS = 9;
    this.ROWS = 50;

    // The grid sits in the background's frame
    this.gridWidthPx  = Math.floor(this.scale.width * 0.90);
    this.gridHeightPx = Math.floor(this.scale.height * 0.80); 

    //Grid is centered
    this.spawnAreaHeightPx = Math.floor(this.scale.height * 0.15);
    this.gridOffsetY = this.spawnAreaHeightPx;
    
    //9 tiles per row
    this.TILE = Math.floor(this.gridWidthPx/this.COLS);

    console.log(this.scale.width, this.gridWidthPx, this.TILE)

//GRID SIZE
    this.worldW = this.COLS * this.TILE;
    this.worldH = this.ROWS * this.TILE;

    this.gridOffsetX = Math.floor((this.scale.width - this.worldW) / 2);
    console.log("leftMarginPx", this.gridOffsetX, "gridPx", this.worldW, "rightMarginPx", this.scale.width - (this.gridOffsetX + this.worldW));

    this.visibleRows = Math.floor(this.gridHeightPx / this.TILE);

    //BACKGROUND (NEEDS ASSETS)
    const background = this.add.image(0, 0, 'bg').setOrigin(0,0);
    background.setScrollFactor(0);
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

    // //Powerups
    // this.shieldActive = false;
    // this.shieldHitsLeft = 0;
    // this.shieldEndAt = 0;

    // this.drillActive = false;
    // this.drillEndsAt = 0;

    // // Stars
    this.totalStars = 3;
    this.starsCollected = 0;

    // // Row hazard: wind/sand slide
    // this.windEveryMs = 0 //Math.random() * (18000 - 13000) + 13000;
    // this.lastWindAt = 0;

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
    const boundsX = 0;
    const boundsY = 0;
    const boundsW = this.scale.width;
    const boundsH = this.gridOffsetY + this.worldH;

    this.physics.world.setBounds(boundsX + this.gridOffsetX, boundsY, boundsW - this.gridOffsetX, boundsH);
    this.physics.world.gravity.y = 600;

    //player
    const spawnC = Math.floor(this.COLS / 2);
    const spawnY = Math.max(this.TILE / 2, this.gridOffsetY - this.TILE * 0.6);

    const spawnX = this.gridOffsetX + spawnC * this.TILE + this.TILE / 2;
    this.player = this.physics.add.sprite(spawnX, spawnY, "player");
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
        fontSize: "20px",
      })
      .setScrollFactor(0); 

  }

  update(time, delta) {

    if (this.ended) return;
    // // WIN CHECK: if the player passes the bottom row, win immediately.
    // if (this.hasReachedWaterline()) {
    //   this.endAsWin();
    //   return;
    // } 

    const dt = delta / 1000;

    // Oxygen drain
    //this.oxygen = Math.max(0, this.oxygen - this.oxygenDrainPerSec * dt);
    if (this.oxygen <= 0){
      this.ended = true;
      this.physics.pause();
    }

    // Movement
    this.handleMovement();

    if (Phaser.Input.Keyboard.JustDown(this.keys.DIG)) {
      this.tryDig(time);
    }
  }

  //MOVEMENT
  handleMovement() {
    const speed = 165;

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;

    if (left) this.player.setVelocityX(-speed);
    else if (right) this.player.setVelocityX(speed);
    else this.player.setVelocityX(0);

    if (up && this.player.body.blocked.down) {
      this.player.setVelocityY(-500);
    }
  }

  //DIGGING
  tryDig(time) {
    const cooldown = this.drillActive ? this.digCooldownDrillMs : this.digCooldownMs;
    if (time - this.lastDigAt < cooldown) return;
    this.lastDigAt = time;

    // Above grid: only allow digging DOWN to break in
    if (this.player.y < this.gridOffsetY) {
      if (this.getDigDirection() !== "down") return;
    }

    const dir = this.getDigDirection();
    const { r, c } = this.worldToGrid(this.player.x, this.player.y);

    const target = { r, c };
    if (dir === "left") target.c -= 1;
    if (dir === "right") target.c += 1;
    if (dir === "up") target.r -= 1;
    if (dir === "down") target.r += 1;

    if (!this.inBounds(target.r, target.c)) return;

    const t = this.grid[target.r][target.c];

    if (t === this.TILE_BLOCK) {
      this.setTile(target.r, target.c, this.TILE_EMPTY);
      return;
    }

    if (t === this.TILE_TRAP) {
      this.setTile(target.r, target.c, this.TILE_EMPTY);
      this.takeDamage(this.oxygenDrainPerDamage);
    }
  }

  getDigDirection() {
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    if (up) return "up";
    if (left) return "left";
    if (right) return "right";
    if (down) return "down";
    return "down";
  }

  setTile(r, c, newType) {
    this.grid[r][c] = newType;

    // remove existing block/trap sprite for that cell
    for (const child of this.blocksGroup.getChildren()) {
      if (child.getData("r") === r && child.getData("c") === c) {
        child.destroy();
        break;
      }
    }

    // Spawn sprite if newType is not empty
    if (newType !== this.TILE_EMPTY) {
      this.spawnTileSprite(r, c, newType);
    }
  }

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

  takeDamage(extraOxygenDrain) {
     if (this.shieldActive && this.shieldHitsLeft > 0) {
       this.shieldHitsLeft -= 1;
       if (this.shieldHitsLeft <= 0) this.shieldActive = false;
       return;
     }
     this.oxygen = Math.max(0, this.oxygen - extraOxygenDrain);
  }


  renderAllTiles() {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        this.spawnTileSprite(r, c, this.grid[r][c]);
      }
    }
  }

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

    // Pickups: scale to look centered in a tile
    const pickupScale = Math.min(3, this.TILE / 20);

    if (t === this.TILE_AIR) {
      const p = this.pickupsGroup.create(x, y, "air");
      p.setData("type", "air");
      p.setScale(pickupScale);
      return;
    }

    if (t === this.TILE_STAR) {
      const p = this.pickupsGroup.create(x, y, "star");
      p.setData("type", "star");
      p.setScale(pickupScale);
      return;
    }

    if (t === this.TILE_SHIELD) {
      const p = this.pickupsGroup.create(x, y, "shield");
      p.setData("type", "shield");
      p.setScale(this.TILE / (1024*2));
      const hitbox = Math.floor(this.TILE * 0.7);
      p.setSize(hitbox, hitbox, true);
      p.refreshBody();
      return;
    }

    if (t === this.TILE_DRILL) {
      const p = this.pickupsGroup.create(x, y, "drill");
      p.setData("type", "drill");
      p.setScale(this.TILE / (1024*2));
      const hitbox = Math.floor(this.TILE * 0.7);
      p.setSize(hitbox, hitbox, true);
      p.refreshBody();
      return;
    }
  }


  //PLACES THE STARS AT SPECIFIC RANGES
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

  scatterTiles(type, count){
    let placed = 0;
    let tries = 0;
    
    while (placed < count && tries <4000){
      tries++;
      const r = Phaser.Math.Between(5, this.ROWS -3);
      const c = Phaser.Math.Between(0, this.COLS -1);
      if (this.grid[r][c] === this.TILE_BLOCK){
        this.grid[r][c] = type;
        placed++;
      }
    }
  }

  //GRID TO COORDINATES
  inBounds(r, c) {
    return r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS;
  }

  worldToGrid(x, y) {
    const localX = x - this.gridOffsetX;
    const localY = y - this.gridOffsetY;
    return { c: Math.floor(localX / this.TILE), r: Math.floor(localY / this.TILE) };
  }

  gridToWorldX(c) {
    return this.gridOffsetX + c * this.TILE + this.TILE / 2;
  }

  gridToWorldY(r) {
    return this.gridOffsetY + r * this.TILE + this.TILE / 2;
  }

  makeRectTexture(key, w, h, color) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 4);
    g.generateTexture(key, w, h);
    g.destroy();
  }

}