import Phaser from "phaser";

import { type AdditionLayout, loadAdditionSettings } from "../settings/additionSettings";
import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

const NEON = {
  yellow: 0xffe45c, blue: 0x43baff, orange: 0xff8a3d, purple: 0xc681ff,
  cyan: 0x45f6e5, pink: 0xff70b8, dark: 0x0b0714, panel: 0x130d25,
  ink: "#f7f2ff", muted: "#a99ac3"
} as const;
const CORRECT_ANSWERS_TO_LAUNCH = 5;

interface Problem { first: number; second: number; total: number; }
interface Enemy {
  ship: Phaser.GameObjects.Image;
  health: number;
  speed: number;
  fireAt: number;
  boss: boolean;
}
interface Projectile { sprite: Phaser.GameObjects.Image; speed: number; damage: number; playerOwned: boolean; }

export class AdditionGameScene extends Phaser.Scene {
  private maximumSum = 10;
  private layout: AdditionLayout = "horizontal";
  private enemyShipCount = 8;
  private problem: Problem = { first: 2, second: 3, total: 5 };
  private answer = "";
  private problemLayer?: Phaser.GameObjects.Container;
  private answerText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private correctCount = 0;
  private correctCountText?: Phaser.GameObjects.Text;
  private keypadLayer?: Phaser.GameObjects.Container;
  private keypadVisible = false;
  private keypadToggleBackground?: Phaser.GameObjects.Rectangle;
  private mathObjects: Phaser.GameObjects.GameObject[] = [];
  private mathStagePanels: Phaser.GameObjects.Rectangle[] = [];
  private backgroundStars: Phaser.GameObjects.Arc[] = [];

  private phase: "learning" | "launching" | "combat" | "ended" = "learning";
  private player?: Phaser.GameObjects.Image;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private playerHealth = 100;
  private shipsDestroyed = 0;
  private shipsSpawned = 0;
  private bossSpawned = false;
  private nextSpawnAt = 0;
  private nextShotAt = 0;
  private healthText?: Phaser.GameObjects.Text;
  private fleetText?: Phaser.GameObjects.Text;
  private combatStatusText?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveKeys?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };

  constructor() { super(SCENE_KEYS.ADDITION_GAME); }

  create(): void {
    const settings = loadAdditionSettings();
    this.maximumSum = settings.maximumSum;
    this.layout = settings.layout;
    this.enemyShipCount = settings.enemyShipCount;
    this.cameras.main.setBackgroundColor(NEON.dark);
    this.createBackground();
    this.createHeader();
    this.createAnswerArea();
    this.createKeypad();
    this.createKeypadToggle();
    this.bindKeyboard();
    this.newProblem();
  }

  update(time: number, delta: number): void {
    if (this.phase !== "combat") return;
    this.scrollBackground(delta);
    this.movePlayer(delta);
    this.spawnShips(time);
    this.updateEnemies(time, delta);
    this.updateProjectiles(delta);
  }

  private trackMath<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.mathObjects.push(object);
    return object;
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, NEON.dark);
    for (let index = 0; index < 75; index += 1) {
      const dot = this.add.circle(Phaser.Math.Between(16, GAME_WIDTH - 16), Phaser.Math.Between(18, GAME_HEIGHT - 18), Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.12, 0.42));
      dot.setData("scrollSpeed", Phaser.Math.FloatBetween(0.05, 0.28));
      this.backgroundStars.push(dot);
      this.tweens.add({ targets: dot, alpha: 0.08, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1 });
    }
    this.mathStagePanels.push(
      this.add.rectangle(683, 404, 760, 546, NEON.panel, 0.92).setStrokeStyle(2, NEON.purple, 0.35),
      this.add.rectangle(683, 404, 730, 516, 0x090610, 0.64).setStrokeStyle(1, NEON.cyan, 0.12)
    );
  }

  private scrollBackground(delta: number): void {
    this.backgroundStars.forEach((star) => {
      star.y += Number(star.getData("scrollSpeed")) * delta;
      if (star.y > GAME_HEIGHT + 4) {
        star.y = -4;
        star.x = Phaser.Math.Between(16, GAME_WIDTH - 16);
      }
    });
  }

  private createHeader(): void {
    this.trackMath(this.add.text(76, 58, "NEON NUMBER LAB", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "27px", color: "#ffffff", letterSpacing: 2 }));
    this.trackMath(this.add.text(77, 94, "addition practice", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px", color: NEON.muted, letterSpacing: 1 }));
    this.trackMath(this.add.text(925, 70, `MAX SUM: ${this.maximumSum}  •  ${this.layout.toUpperCase()}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#45f6e5", letterSpacing: 2 }).setOrigin(1, 0.5));
    this.correctCountText = this.trackMath(this.add.text(GAME_WIDTH - 75, 70, `CORRECT  0 / ${CORRECT_ANSWERS_TO_LAUNCH}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#ffe45c", letterSpacing: 1 }).setOrigin(1, 0.5));
  }

  private createAnswerArea(): void {
    this.trackMath(this.add.rectangle(GAME_WIDTH / 2, 584, 190, 94, 0x08050f, 0.9).setStrokeStyle(3, NEON.cyan, 0.85));
    this.answerText = this.trackMath(this.add.text(GAME_WIDTH / 2, 584, "", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "66px", color: "#45f6e5" }).setOrigin(0.5));
    this.statusText = this.trackMath(this.add.text(GAME_WIDTH / 2, 654, "Type an answer or use the number pad", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", color: NEON.muted }).setOrigin(0.5));
  }

  private createKeypad(): void {
    const keypadLayer = this.trackMath(this.add.container(0, 0));
    this.keypadLayer = keypadLayer;
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "go"].forEach((value, index) => {
      const x = 1120 + (index % 3) * 77;
      const y = 410 + Math.floor(index / 3) * 64;
      const isGo = value === "go";
      const isClear = value === "clear";
      const bg = this.add.rectangle(x, y, 62, 51, isGo ? NEON.cyan : 0x1b1430, 1).setStrokeStyle(2, isGo ? NEON.cyan : isClear ? NEON.pink : NEON.purple, 0.8);
      const text = this.add.text(x, y + 1, isGo ? "GO" : isClear ? "⌫" : value, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: isClear ? "24px" : "21px", color: isGo ? "#090610" : NEON.ink }).setOrigin(0.5);
      const zone = this.add.zone(x, y, 62, 51).setInteractive({ useHandCursor: true }).on("pointerover", () => { bg.setScale(1.08); text.setScale(1.08); }).on("pointerout", () => { bg.setScale(1); text.setScale(1); }).on("pointerup", () => this.handlePad(value));
      keypadLayer.add([bg, text, zone]);
    });
    keypadLayer.setVisible(false);
  }

  private createKeypadToggle(): void {
    const x = 986; const y = 70;
    this.keypadToggleBackground = this.trackMath(this.add.rectangle(x, y, 52, 46, 0x171028, 1).setStrokeStyle(2, NEON.purple, 0.8));
    const label = this.trackMath(this.add.text(x, y + 1, "⌨", { fontFamily: "Arial, sans-serif", fontSize: "28px", color: NEON.ink }).setOrigin(0.5));
    const zone = this.trackMath(this.add.zone(x, y, 52, 46).setInteractive({ useHandCursor: true }).on("pointerover", () => this.keypadToggleBackground?.setStrokeStyle(2, NEON.cyan, 1)).on("pointerout", () => this.refreshKeypadToggle()).on("pointerup", () => {
      this.keypadVisible = !this.keypadVisible;
      this.keypadLayer?.setVisible(this.keypadVisible);
      this.statusText?.setText(this.keypadVisible ? "Click numbers, or type an answer" : "Type an answer, or open the number pad").setColor(NEON.muted);
      this.refreshKeypadToggle();
    }));
    void label; void zone;
  }

  private bindKeyboard(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.moveKeys = this.input.keyboard?.addKeys("W,A,S,D") as typeof this.moveKeys;
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Escape") { this.scene.start(SCENE_KEYS.ADDITION_TITLE); return; }
      if (this.phase === "ended" && event.key.toLowerCase() === "r") { this.scene.restart(); return; }
      if (this.phase === "combat") { if (event.code === "Space") this.firePlayerLaser(); return; }
      if (this.phase !== "learning") return;
      if (/^[0-9]$/.test(event.key)) this.addDigit(event.key);
      if (event.key === "Backspace") this.answer = this.answer.slice(0, -1);
      if (event.key === "Enter") this.checkAnswer();
      this.refreshAnswer();
    });
  }

  private refreshKeypadToggle(): void { this.keypadToggleBackground?.setFillStyle(this.keypadVisible ? NEON.purple : 0x171028).setStrokeStyle(2, this.keypadVisible ? NEON.cyan : NEON.purple, 0.8); }
  private handlePad(value: string): void { if (this.phase !== "learning") return; if (/^[0-9]$/.test(value)) this.addDigit(value); if (value === "clear") this.answer = this.answer.slice(0, -1); if (value === "go") this.checkAnswer(); this.refreshAnswer(); }
  private addDigit(value: string): void { if (this.answer.length < 2) this.answer += value; }
  private refreshAnswer(): void { this.answerText?.setText(this.answer); }

  private newProblem(): void {
    const total = Phaser.Math.Between(2, this.maximumSum);
    const first = Phaser.Math.Between(1, total - 1);
    this.problem = { first, second: total - first, total };
    this.answer = "";
    this.statusText?.setText(this.keypadVisible ? "Click numbers, or type an answer" : "Type an answer, or open the number pad").setColor(NEON.muted);
    this.refreshAnswer(); this.renderProblem();
  }

  private renderProblem(): void {
    this.problemLayer?.destroy(true);
    const layer = this.trackMath(this.add.container(0, 0)); this.problemLayer = layer;
    const makeText = (x: number, y: number, value: string, color: string): void => { layer.add(this.add.text(x, y, value, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "116px", color, stroke: "#ffffff", strokeThickness: 1 }).setOrigin(0.5)); };
    if (this.layout === "horizontal") { makeText(500, 400, String(this.problem.first), "#ffe45c"); makeText(620, 400, "+", "#43baff"); makeText(748, 400, String(this.problem.second), "#ff8a3d"); }
    else { makeText(720, 320, String(this.problem.first), "#ffe45c"); makeText(640, 420, "+", "#43baff"); makeText(720, 420, String(this.problem.second), "#ff8a3d"); layer.add(this.add.rectangle(720, 488, 210, 4, NEON.purple)); }
  }

  private checkAnswer(): void {
    if (!this.answer) return;
    if (Number(this.answer) !== this.problem.total) {
      this.statusText?.setText("TRY AGAIN — YOU'VE GOT THIS!").setColor("#ff70b8");
      this.tweens.add({ targets: this.answerText, x: "+=10", duration: 55, yoyo: true, repeat: 3 }); return;
    }
    this.correctCount += 1;
    this.correctCountText?.setText(`CORRECT  ${this.correctCount} / ${CORRECT_ANSWERS_TO_LAUNCH}`);
    this.statusText?.setText(this.correctCount >= CORRECT_ANSWERS_TO_LAUNCH ? "LAUNCH SEQUENCE READY!" : "BRILLIANT!  NEXT SUM LOADING...").setColor("#45f6e5");
    this.tweens.add({ targets: [this.problemLayer, this.answerText], scale: 1.06, duration: 120, yoyo: true });
    this.time.delayedCall(750, () => this.correctCount >= CORRECT_ANSWERS_TO_LAUNCH ? this.launchCombat() : this.newProblem());
  }

  private launchCombat(): void {
    if (this.phase !== "learning") return;
    this.phase = "launching";
    this.mathObjects.forEach((object) => object.destroy(true));
    this.mathObjects = [];
    this.mathStagePanels.forEach((panel) => panel.destroy());
    this.mathStagePanels = [];
    this.player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT + 70, ASSET_KEYS.PLAYER_STARSHIP).setDisplaySize(78, 87).setDepth(4);
    this.combatStatusText = this.add.text(GAME_WIDTH / 2, 390, "MATH CORE CHARGED — DEFEND THE LAB!", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "28px", color: "#45f6e5" }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: this.player, y: 620, duration: 900, ease: "Sine.easeOut", onComplete: () => this.beginCombat() });
  }

  private beginCombat(): void {
    this.phase = "combat";
    this.nextSpawnAt = this.time.now + 550;
    this.combatStatusText?.setText("ARROWS / WASD TO FLY  •  SPACE TO FIRE").setFontSize(20);
    this.healthText = this.add.text(55, 52, "HULL  100", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "24px", color: "#45f6e5" }).setDepth(6);
    this.fleetText = this.add.text(GAME_WIDTH - 55, 52, `FLEET  0 / ${this.enemyShipCount}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "24px", color: "#ffe45c" }).setOrigin(1, 0).setDepth(6);
    this.time.delayedCall(2600, () => this.combatStatusText?.setVisible(false));
  }

  private movePlayer(delta: number): void {
    if (!this.player) return;
    const speed = 0.48 * delta;
    let x = this.player.x; let y = this.player.y;
    if (this.cursors?.left.isDown || this.moveKeys?.A.isDown) x -= speed;
    if (this.cursors?.right.isDown || this.moveKeys?.D.isDown) x += speed;
    if (this.cursors?.up.isDown || this.moveKeys?.W.isDown) y -= speed;
    if (this.cursors?.down.isDown || this.moveKeys?.S.isDown) y += speed;
    this.player.setPosition(Phaser.Math.Clamp(x, 45, GAME_WIDTH - 45), Phaser.Math.Clamp(y, 330, GAME_HEIGHT - 50));
  }

  private firePlayerLaser(): void {
    if (!this.player || this.time.now < this.nextShotAt) return;
    this.nextShotAt = this.time.now + 220;
    const laser = this.add.image(this.player.x, this.player.y - 50, ASSET_KEYS.PLAYER_LASER).setDisplaySize(18, 34).setDepth(3);
    this.projectiles.push({ sprite: laser, speed: -0.95, damage: 1, playerOwned: true });
  }

  private spawnShips(time: number): void {
    if (time < this.nextSpawnAt) return;
    if (this.shipsSpawned < this.enemyShipCount) {
      this.shipsSpawned += 1;
      this.spawnEnemy(false);
      this.nextSpawnAt = time + Phaser.Math.Between(700, 1150);
    } else if (this.shipsDestroyed === this.enemyShipCount && !this.bossSpawned && this.enemies.length === 0) {
      this.bossSpawned = true; this.spawnEnemy(true);
      this.combatStatusText?.setText("WARNING — BOSS STARSHIP INCOMING!").setColor("#ff70b8").setVisible(true);
    }
  }

  private spawnEnemy(boss: boolean): void {
    const ship = this.add.image(Phaser.Math.Between(80, GAME_WIDTH - 80), -75, ASSET_KEYS.ENEMY_STARSHIP_SHEET, boss ? 1 : Phaser.Math.Between(0, 1)).setDepth(2);
    ship.setDisplaySize(boss ? 118 : 64, boss ? 146 : 80);
    if (boss) ship.setTint(0xff70b8);
    this.enemies.push({ ship, health: boss ? 20 : 2, speed: boss ? 0.095 : Phaser.Math.FloatBetween(0.06, 0.16), fireAt: this.time.now + Phaser.Math.Between(800, 1600), boss });
  }

  private recycleEnemy(enemy: Enemy, time: number): void {
    enemy.ship.setPosition(Phaser.Math.Between(80, GAME_WIDTH - 80), -75);
    enemy.speed = enemy.boss ? 0.095 : Phaser.Math.FloatBetween(0.06, 0.16);
    enemy.fireAt = time + Phaser.Math.Between(800, 1600);
  }

  private updateEnemies(time: number, delta: number): void {
    for (const enemy of [...this.enemies]) {
      if (enemy.boss) {
        enemy.ship.y = Math.min(190, enemy.ship.y + enemy.speed * delta);
        if (enemy.ship.y >= 190) enemy.ship.x = Phaser.Math.Clamp(enemy.ship.x + Math.sin(time / 450) * 0.18 * delta, 80, GAME_WIDTH - 80);
      } else enemy.ship.y += enemy.speed * delta;
      if (time >= enemy.fireAt && enemy.ship.y > 30) { this.fireEnemyWeapon(enemy); enemy.fireAt = time + (enemy.boss ? 650 : Phaser.Math.Between(1300, 2000)); }
      if (!enemy.boss && enemy.ship.y > GAME_HEIGHT + 100) {
        // Keep the same fleet member alive: it re-enters at the top with a
        // fresh lane and speed, so every ship must be defeated to summon the boss.
        this.recycleEnemy(enemy, time);
        continue;
      }
      if (this.player && Phaser.Geom.Intersects.RectangleToRectangle(enemy.ship.getBounds(), this.player.getBounds())) {
        this.damagePlayer(enemy.boss ? 25 : 15);
        if (this.phase === "combat") this.recycleEnemy(enemy, time);
      }
    }
  }

  private fireEnemyWeapon(enemy: Enemy): void {
    const bomb = enemy.boss && Phaser.Math.Between(0, 2) === 0;
    const projectile = this.add.image(enemy.ship.x, enemy.ship.y + enemy.ship.displayHeight / 2, bomb ? ASSET_KEYS.ENEMY_BOMB : ASSET_KEYS.ENEMY_LASER).setDisplaySize(bomb ? 34 : 18, bomb ? 39 : 34).setDepth(3);
    this.projectiles.push({ sprite: projectile, speed: bomb ? 0.36 : 0.56, damage: bomb ? 20 : 10, playerOwned: false });
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of [...this.projectiles]) {
      projectile.sprite.y += projectile.speed * delta;
      if (projectile.sprite.y < -50 || projectile.sprite.y > GAME_HEIGHT + 50) { this.removeProjectile(projectile); continue; }
      if (projectile.playerOwned) {
        const target = this.enemies.find((enemy) => Phaser.Geom.Intersects.RectangleToRectangle(projectile.sprite.getBounds(), enemy.ship.getBounds()));
        if (target) { target.health -= projectile.damage; this.removeProjectile(projectile); target.ship.setTintFill(0xffffff); this.time.delayedCall(45, () => target.ship.active && target.ship.clearTint()); if (target.health <= 0) this.removeEnemy(target, true); }
      } else if (this.player && Phaser.Geom.Intersects.RectangleToRectangle(projectile.sprite.getBounds(), this.player.getBounds())) { this.damagePlayer(projectile.damage); this.removeProjectile(projectile); }
    }
  }

  private removeProjectile(projectile: Projectile): void { projectile.sprite.destroy(); this.projectiles = this.projectiles.filter((item) => item !== projectile); }
  private removeEnemy(enemy: Enemy, destroyed: boolean): void {
    enemy.ship.destroy(); this.enemies = this.enemies.filter((item) => item !== enemy);
    if (destroyed && !enemy.boss) { this.shipsDestroyed += 1; this.fleetText?.setText(`FLEET  ${this.shipsDestroyed} / ${this.enemyShipCount}`); }
    if (destroyed && enemy.boss) this.finishCombat(true);
  }

  private damagePlayer(amount: number): void {
    if (this.phase !== "combat" || !this.player) return;
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.healthText?.setText(`HULL  ${this.playerHealth}`).setColor(this.playerHealth <= 35 ? "#ff70b8" : "#45f6e5");
    this.player.setTintFill(0xffffff); this.cameras.main.shake(110, 0.006); this.time.delayedCall(70, () => this.player?.clearTint());
    if (this.playerHealth === 0) this.finishCombat(false);
  }

  private finishCombat(won: boolean): void {
    this.phase = "ended";
    this.projectiles.forEach(({ sprite }) => sprite.destroy()); this.projectiles = [];
    this.enemies.forEach(({ ship }) => ship.destroy()); this.enemies = [];
    this.combatStatusText?.setText(won ? "BOSS DEFEATED — NEXT MISSION IN 4..." : "SHIP LOST — NEW MISSION IN 4...").setColor(won ? "#45f6e5" : "#ff70b8").setFontSize(28).setVisible(true);
    this.time.delayedCall(4000, () => this.scene.restart());
  }
}
