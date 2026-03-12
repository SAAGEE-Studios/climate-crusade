import { GameFlowManager } from '../../../Core/GameFlowManager.js';
import { saveProgress } from '../../../Core/api.js';
import { GameState} from '../../../Core/GameState.js'

export class SunkenWellsLevel extends Phaser.Scene {
  constructor() {
    super('SunkenWellsLevel');
  }

  preload(){
    this.load.image("bg", './client/Levels/Level03/Assets/ChatGPT_Image_Mar_10_2026_05_10_04_PM.png');
    this.load.image("block", './client/Levels/Level03/Assets/sandstone_blocktile.png');
    this.load.image("trap", './client/Levels/Level03/Assets/sandstone_traptile.png');
    this.load.image("air", './client/Levels/Level03/Assets/o2.png');
    this.load.image("star", './client/Levels/Level03/Assets/Star_to_collect.png');
    this.load.image("shield", './client/Levels/Level03/Assets/shield.png');
    this.load.image("drill", './client/Levels/Level03/Assets/drill.png');
    this.load.image("wind_damage", './client/Levels/Level03/Assets/sandslide.png')
    this.load.image("overlayBG", './client/Levels/Level03/Assets/end_overlay_background.png');
    this.makeRectTexture("player", 30, 35, 0xffffff);
  }

  create(initData) {
    // Grid configuration
    this.GRID_WIDTH_RATIO = 0.90;
    this.GRID_HEIGHT_RATIO = 0.80;
    this.SPAWN_AREA_RATIO = 0.15;
    this.WIND_WARNING_MS = 1000;
    this.WIND_DAMAGE = 15;
    this.TRAP_DAMAGE = 10;
    this.WIND_VISIBLE_MS = 600;
    this.WIND_FADE_MS = 1000;

    this.initLayout();
    

    //BACKGROUND (NEEDS ASSETS)
    const background = this.add.image(0, 0, 'bg').setOrigin(0,0);
    background.setScrollFactor(0);
    background.setDisplaySize(this.scale.width, this.scale.height);
    background.setDepth(-10);

    //MECHANICS(HARD STUFF)
    this.initGameplayState();

    //GRID BUILD
    this.buildGrid();

    //physics + render
    this.blocksGroup = this.physics.add.staticGroup();
    this.pickupsGroup = this.physics.add.staticGroup();
    this.renderAllTiles();

    
    //player ang physics
    this.spawnPlayer();
    this.initPhysics();

    //CAMERA CONTROL
    this.initCamera();

    //INPUT
    this.initInput();

    //UI
    this.initUI();
  }

  //------------------------------------------------------------------
  //----------------------CREATE() HELPER FUNCTIONS---------------------
  
  initLayout(){
    this.COLS = 9;
    this.ROWS = 50;

    this.gridWidthPx  = Math.floor(this.scale.width * this.GRID_WIDTH_RATIO);
    this.gridHeightPx = Math.floor(this.scale.height * this.GRID_HEIGHT_RATIO); 

    //Grid is centered
    this.spawnAreaHeightPx = Math.floor(this.scale.height * this.SPAWN_AREA_RATIO);
    this.gridOffsetY = this.spawnAreaHeightPx;
    
    //9 tiles per row
    this.TILE = Math.floor(this.gridWidthPx/this.COLS);

    //GRID SIZE
    this.worldW = this.COLS * this.TILE;
    this.worldH = this.ROWS * this.TILE;

    this.gridOffsetX = Math.floor((this.scale.width - this.worldW) / 2);
    this.visibleRows = Math.floor(this.gridHeightPx / this.TILE);
    this.winRow = this.ROWS - 1;
  }

  initGameplayState(initData){
    //identification (for saving)
    this.levelId = initData?.levelId ?? "sunken-wells";

    // End state flag
    this.ended = false;
    this.oxygenActive = false;
    this.endOverlayShown = false;
    this.resultSaved = false;

    //oxygen
    this.oxygenMax = 100;
    this.oxygen = this.oxygenMax;
    this.oxygenDrainPerSec = 2;
    this.airRefillAmount = 33;

    //THE DIG
    this.lastDigAt = 0;
    this.digCooldownMs = 500;
    this.digCooldownDrillMs = 200;

    // //Powerups
    this.shieldActive = false;
    this.shieldHitsLeft = 0;
    this.shieldEndsAt = 0;

    this.drillActive = false;
    this.drillEndsAt = 0;

    // // Stars
    this.totalStars = 3;
    this.starsCollected = 0;

    // Row hazard: wind/sand slide
    this.windEveryMs = Math.random() * (5000) + 10000;
    this.lastWindAt = this.time.now + Phaser.Math.Between(0, 3000);

    //GRID DETAILS
    this.TILE_EMPTY = 0; 
    this.TILE_BLOCK = 1;
    this.TILE_TRAP = 2;
    this.TILE_AIR = 3;
    this.TILE_STAR = 4;
    this.TILE_SHIELD = 5;
    this.TILE_DRILL  = 6;
  }

  buildGrid(){
    // Start with a world of solid blocks
    this.grid = Array.from({ length: this.ROWS }, () =>
      Array(this.COLS).fill(this.TILE_BLOCK)
    );

    this.placeStarsInBands();
    this.scatterTiles(this.TILE_AIR, 8, 4);
    this.scatterTiles(this.TILE_TRAP, 15, 4);
    this.scatterTiles(this.TILE_SHIELD, 4, 10);
    this.scatterTiles(this.TILE_DRILL, 4, 10);
  }

  spawnPlayer(){
    const spawnC = Math.floor(this.COLS / 2);
    const spawnY = Math.max(this.TILE / 2, this.gridOffsetY - this.TILE * 0.6);
    const spawnX = this.gridOffsetX + spawnC * this.TILE + this.TILE / 2;
    
    this.player = this.physics.add.sprite(spawnX, spawnY, "player");
    this.player.setCollideWorldBounds(true);
  }

  initPhysics(){
    const boundsX = this.gridOffsetX;
    const boundsY = 0;
    const boundsW = this.worldW;
    const boundsH = this.gridOffsetY + this.worldH;

    this.physics.world.setBounds(boundsX, boundsY, boundsW, boundsH);
    this.physics.world.gravity.y = 700;

    this.physics.add.collider(this.player, this.blocksGroup);
    this.physics.add.overlap(this.player, this.pickupsGroup, this.onPickup, null, this);
  }

  initCamera(){    
    const boundsX = 0;
    const boundsY = 0;
    const boundsW = this.worldW;
    const boundsH = this.gridOffsetY + this.worldH;

    const desiredPlayerScreenY = this.gridOffsetY + Math.floor(this.gridHeightPx / 2);
    const cameraCenterY = Math.floor(this.scale.height / 2);
    const followOffsetY = desiredPlayerScreenY - cameraCenterY;

    this.cameras.main.setBounds(boundsX, boundsY, boundsW, boundsH);
    this.cameras.main.startFollow(this.player, true, 0, 0.12, 0, followOffsetY);
  }

  initInput(){
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: "W",
      A: "A",
      S: "S",
      D: "D",
      DIG: "E",
    });
  }

  initUI(){
    const topY = 30;

    // Oxygen bar background
    this.oxygenBarBg = this.add
      .rectangle(140, topY, 220, 24, 0x222222, 0.85)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    // Oxygen bar fill
    this.oxygenBarFill = this.add
      .rectangle(140, topY, 220, 24, 0x4fd3ff, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.displayedOxygenRatio = 1; 

    // Oxygen label
    this.oxygenLabel = this.add
      .text(40, topY -10, "OXYGEN", {
        fontSize: "22px",
        color: "#eee9e6",
        fontStyle: "bold",
      })
      .setScrollFactor(0);

    // Stars
    this.starIcons = [];
    const starStartX = this.scale.width / 2 - 90;
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(starStartX + i * 90, topY, "star")
        .setScrollFactor(0)
        .setScale(this.TILE / (756*5))
        .setAlpha(0.25); // uncollected by default
      this.starIcons.push(star);
    }

    // Shield icon
    this.shieldIcon = this.add.image(this.scale.width - 140, topY, "shield")
      .setScrollFactor(0)
      .setScale(0.05)
      .setAlpha(0.25);

    // Shield text
    this.shieldText = this.add.text(this.scale.width - 110, topY - 14, "", {
      fontSize: "22px",
      color: "#ffffff",
    }).setScrollFactor(0);

    // Drill icon
    this.drillIcon = this.add.image(this.scale.width - 60, topY, "drill")
      .setScrollFactor(0)
      .setScale(0.05)
      .setAlpha(0.25);

    // Drill text
    this.drillText = this.add.text(this.scale.width - 30, topY - 14, "", {
      fontSize: "22px",
      color: "#ffffff",
    }).setScrollFactor(0);
  }

  //-------------------------------------------------------------------
  //-------------------------------------------------------------------

  update(time, delta) {
    if(this.ended) return;

    const dt = delta / 1000;

    // Oxygen drain
    if (!this.oxygenActive && this.player.y >= this.gridOffsetY) {
      this.oxygenActive = true;
    }

    // Ability expiry
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
    
    // Movement
    this.handleMovement();

    if (Phaser.Input.Keyboard.JustDown(this.keys.DIG)) {
      this.tryDig(time);
    }

    // WIN CHECK: if the player passes the bottom row, win immediately.
    if (this.hasReachedWaterline() && !this.ended) {
      this.ended = true;
      this.player.setVelocity(0, 0);
      this.physics.pause();
      
      this.time.delayedCall(500, ()=> {
        this.endAsWin();
      });

      return;
    }

    // Wind hazard
    if (time - this.lastWindAt >= this.windEveryMs) {
      this.lastWindAt = time;
      this.triggerWindRowHazard();
    }

    // UI
    this.updateUI();
  }

  updateUI() {
    // Oxygen bar fill width
    const oxygenRatio = Phaser.Math.Clamp(this.oxygen / this.oxygenMax, 0, 1);
    this.displayedOxygenRatio +=(oxygenRatio - this.displayedOxygenRatio) * 0.1;
    this.oxygenBarFill.width = 220 * this.displayedOxygenRatio;
    // color update
    if (oxygenRatio <= 0.20) {
      this.oxygenBarFill.fillColor = 0xff3b30; // red
    } else if (oxygenRatio <= 0.40) {
      this.oxygenBarFill.fillColor = 0xffa500; // orange
    } else {
      this.oxygenBarFill.fillColor = 0x4fd3ff; // blue
    }
    this.oxygenLabel.setText(`OXYGEN: ${Math.ceil(this.oxygen)}/${this.oxygenMax}`);

    // Stars
    for (let i = 0; i < this.starIcons.length; i++) {
      this.starIcons[i].setAlpha(i < this.starsCollected ? 1 : 0.25);
    }

    // Shield
    if (this.shieldActive) {
      this.shieldIcon.setAlpha(1);
      this.shieldText.setText(`${this.shieldHitsLeft}`);
    } else {
      this.shieldIcon.setAlpha(0.25);
      this.shieldText.setText("");
    }

    // Drill
    if (this.drillActive) {
      this.drillIcon.setAlpha(1);
      this.drillText.setText("ON");
    } else {
      this.drillIcon.setAlpha(0.25);
      this.drillText.setText("");
    }
  }

  //BOTTOM REACHED WIN CONDITION
  hasReachedWaterline() {
    const playerBottom = this.player.y + this.player.displayHeight / 2;
    const bottomOfLastRow = this.gridToWorldY(this.winRow) + this.TILE / 2;
    return playerBottom >= bottomOfLastRow;
  }

  //MOVEMENT
  handleMovement() {
    const speed = 200;

    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;

    if (left) this.player.setVelocityX(-speed);
    else if (right) this.player.setVelocityX(speed);
    else this.player.setVelocityX(0);

    if (up && this.player.body.blocked.down) {
      this.player.setVelocityY(-550);
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
      this.takeDamage(this.TRAP_DAMAGE);
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

  triggerWindRowHazard() {
    const pr = this.worldToGrid(this.player.x, this.player.y).r;
    const windRow = Phaser.Math.Clamp(
      pr + Phaser.Math.Between(-1, 3),
      4,
      this.ROWS - 1
    );

    const y = this.gridToWorldY(windRow);
    const centerX = this.gridOffsetX + this.worldW / 2;

    // 1) WARNING BAND: visible for 1.5s before the strike
    const warningBand = this.add
      .rectangle(
        centerX,
        y,
        this.worldW,
        this.TILE,
        0x490000,   // yellow/orange warning
        0.4
      )
      .setOrigin(0.5, 0.5);

    // Optional pulsing effect during warning
    this.tweens.add({
      targets: warningBand,
      alpha: { from: 0.5, to: 0.8},
      duration: 250,
      yoyo: true,
      repeat: 5   // ~1.5 seconds total
    });

    // 2) After 1.5 seconds, apply damage + flash
    this.time.delayedCall(this.WIND_WARNING_MS, () => {
      if (!warningBand.active) return;

      warningBand.destroy();

      // DAMAGE BAND using imported asset
      const damageBand = this.physics.add
        .sprite(centerX, y, "wind_damage")
        .setDisplaySize(this.worldW * 1.15, this.TILE * 2.5)
        .setOrigin(0.5)
        .setImmovable(true);

      damageBand.body.allowGravity = false;
      damageBand.body.setSize(this.worldW, this.TILE, true);

      // damage on contact
      let hasDamagedPlayer = false;

      const overlap = this.physics.add.overlap(
        this.player,
        damageBand,
        () => {
          if (hasDamagedPlayer) return;
          hasDamagedPlayer = true;
          this.takeDamage(this.WIND_DAMAGE);
        }
      );

      // fade out damaging band
      this.time.delayedCall(this.WIND_VISIBLE_MS, () => {

        this.tweens.add({
          targets: damageBand,
          alpha: 0,
          duration: this.WIND_FADE_MS,
          ease: "Sine.easeOut",
          onComplete: () => {
            overlap.destroy();
            damageBand.destroy();
          }
        });

      });
    });
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

  endAsWin() {
    if (this.endOverlayShown) return;

    this.ended = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    this.showEndOverlay(true);
  }

  endAsLose() {
    if (this.endOverlayShown) return;

    this.ended = true;
    this.physics.pause();
    this.player.setVelocity(0, 0);

    this.showEndOverlay(false);
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

  isNearType(r, c, type, radius = 2) {
    for (let rr = r - radius; rr <= r + radius; rr++) {
      for (let cc = c - radius; cc <= c + radius; cc++) {
        if (!this.inBounds(rr, cc)) continue;
        if (this.grid[rr][cc] === type) return true;
      }
    }
    return false;
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

  async saveLevelResult() {
    if (this.resultSaved) return;
    this.resultSaved = true;

    try {
      const previousStars = GameState.progress[this.levelId]?.stars ?? 0;
      const bestStars = Math.max(previousStars, this.starsCollected);

      //local runtime save
      GameState.progress[this.levelId] = {
        stars: bestStars
      }

      //backend save if user logged in
      if (GameState.userId) {
        await saveProgress(
          GameState.userId,
          this.levelId,
          bestStars
        )
      }

      console.log("Progress saved;", this.levelId, bestStars);
    } catch(error){
      console.error("Failed to save progress", error);
    }
  
  }

  showEndOverlay(isWin) {
    if (this.endOverlayShown) return;
    this.endOverlayShown = true;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // dark blocker
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

    // panel container
    const container = this.add.container(centerX, centerY)
      .setScrollFactor(0)
      .setDepth(2001);

    const panel = this.add.image(0, 0, 'overlayBG');
    const targetPanelW = 620;
    const targetPanelH = 380;

    const scale = Math.min(
      targetPanelW / panel.width,
      targetPanelH / panel.height
    );
    panel.setScale(scale);

    const panelW = panel.displayWidth;
    const panelH = panel.displayHeight;


    const panelShadow = this.add.rectangle(
      8,
      8,
      panelW,
      panelH,
      0x000000,
      0.35
    );

    panelShadow.setDepth(panel.depth - 1);

    const panelBorder = this.add.rectangle(
      0,
      0,
      panelW + 12,
      panelH + 12,
      0x000000,
      0.35
    ).setStrokeStyle(3, 0x222222, 1);

    const title = this.add.text(
      0,
      -120,
      isWin ? "LEVEL COMPLETE" : "OUT OF OXYGEN",
      {
        fontSize: "42px",
        color: isWin ? "#7CFC00" : "#4a0006",
        fontStyle: "bold",
      }
    ).setOrigin(0.5);

    const starsLabel = this.add.text(
      0,
      -50,
      `Stars collected: ${this.starsCollected}/${this.totalStars}`,
      {
        fontSize: "28px",
        color: "#ffffff",
      }
    ).setOrigin(0.5);

    // star icons
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

    const retryBtnX = centerX - 140;
    const retryBtnY = centerY + 120;

    const retryBtn = this.add.rectangle(retryBtnX, retryBtnY, 200, 64, 0x3a6ea5, 1)
      .setStrokeStyle(2, 0xffffff, 1)
      .setScrollFactor(0)
      .setDepth(2002)
      .setInteractive({ useHandCursor: true });

    const retryText = this.add.text(retryBtnX, retryBtnY, "RETRY", {
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);

    const mainBtnX = centerX + 140;
    const mainBtnY = centerY + 120;

    const mainBtn = this.add.rectangle(mainBtnX, mainBtnY, 240, 64, 0x6b4f2a, 1)
      .setStrokeStyle(2, 0xffffff, 1)
      .setScrollFactor(0)
      .setDepth(2002)
      .setInteractive({ useHandCursor: true });

    const mainText = this.add.text(mainBtnX, mainBtnY, "MAIN PAGE", {
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);

    container.add([
      panelShadow,
      panelBorder,
      panel,
      title,
      starsLabel,
      ...starNodes,
    ]);

    // pop-in animation
    container.setScale(0.85);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 250,
      ease: "Back.Out"
    });

    // hover feedback
    retryBtn.on("pointerover", () => retryBtn.setFillStyle(0x4a82c2, 1));
    retryBtn.on("pointerout", () => retryBtn.setFillStyle(0x3a6ea5, 1));

    mainBtn.on("pointerover", () => mainBtn.setFillStyle(0x8a6738, 1));
    mainBtn.on("pointerout", () => mainBtn.setFillStyle(0x6b4f2a, 1));

    // actions
    retryBtn.on("pointerup", () => {
      retryBtn.disableInteractive();
      mainBtn.disableInteractive();
      this.retryLevel();
    });

    mainBtn.on("pointerup", async () => {
      retryBtn.disableInteractive();
      mainBtn.disableInteractive();
      try {
        await this.goToMainPage();
      } catch (err) {
        console.error(err);
        retryBtn.setInteractive({ useHandCursor: true});
        mainBtn.setInteractive({ useHandCursor: true });
      }
    });

    this.endOverlayBlocker = blocker;
    this.endOverlayContainer = container;
  }

  retryLevel() {
    this.scene.restart({ levelId: this.levelId });
  }

  async goToMainPage() {
    try {
      await this.saveLevelResult();
    } catch (err) {
      console.error("Failed to save progress:", err);
    }

    GameFlowManager.goToLevelSelect(this);
  }

}