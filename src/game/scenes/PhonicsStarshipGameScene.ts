import Phaser from "phaser";

import { PHONICS_CHALLENGES, type PhonicsChallenge } from "../data/phonicsChallenges";
import { type StarshipDifficulty, loadAdditionSettings } from "../settings/additionSettings";
import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { addGameNavigation } from "../utils/gameNavigation";
import { SCENE_KEYS } from "../utils/sceneKeys";

const NEON = {
  yellow: 0xffe45c, blue: 0x43baff, orange: 0xff8a3d, purple: 0xc681ff,
  cyan: 0x45f6e5, pink: 0xff70b8, dark: 0x0b0714, panel: 0x130d25,
  ink: "#f7f2ff", muted: "#a99ac3"
} as const;
const CORRECT_ANSWERS_TO_LAUNCH = 5;
interface Enemy {
  ship: Phaser.GameObjects.Image;
  health: number;
  speed: number;
  fireAt: number;
  boss: boolean;
}
interface Projectile { sprite: Phaser.GameObjects.Image; speed: number; damage: number; playerOwned: boolean; }
interface RepairKit { pickup: Phaser.GameObjects.Container; speed: number; }
interface CombatDifficultySettings {
  normalHealth: number; bossHealth: number; minSpeed: number; maxSpeed: number;
  normalFireDelay: [number, number]; bossFireDelay: number; normalDamage: number;
  bossCollisionDamage: number; bombDamage: number; playerSpeed: number;
}
const COMBAT_DIFFICULTIES: Record<StarshipDifficulty, CombatDifficultySettings> = {
  easy: { normalHealth: 1, bossHealth: 10, minSpeed: 0.04, maxSpeed: 0.09, normalFireDelay: [2200, 3400], bossFireDelay: 1000, normalDamage: 7, bossCollisionDamage: 15, bombDamage: 12, playerSpeed: 0.58 },
  normal: { normalHealth: 2, bossHealth: 20, minSpeed: 0.06, maxSpeed: 0.16, normalFireDelay: [1300, 2000], bossFireDelay: 650, normalDamage: 10, bossCollisionDamage: 25, bombDamage: 20, playerSpeed: 0.48 },
  hard: { normalHealth: 3, bossHealth: 30, minSpeed: 0.1, maxSpeed: 0.2, normalFireDelay: [800, 1400], bossFireDelay: 450, normalDamage: 12, bossCollisionDamage: 35, bombDamage: 25, playerSpeed: 0.42 }
};

export class PhonicsStarshipGameScene extends Phaser.Scene {
  private enemyShipCount = 8;
  private starshipDifficulty: StarshipDifficulty = "easy";
  private problem: PhonicsChallenge = PHONICS_CHALLENGES[0];
  private answer = "";
  private problemLayer?: Phaser.GameObjects.Container;
  private answerText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private correctCount = 0;
  private correctCountText?: Phaser.GameObjects.Text;
  private keypadLayer?: Phaser.GameObjects.Container;
  private mathObjects: Phaser.GameObjects.GameObject[] = [];
  private mathStagePanels: Phaser.GameObjects.Rectangle[] = [];
  private backgroundStars: Phaser.GameObjects.Arc[] = [];

  private phase: "learning" | "launching" | "combat" | "ended" = "learning";
  private player?: Phaser.GameObjects.Image;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private repairKits: RepairKit[] = [];
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
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() { super(SCENE_KEYS.PHONICS_STARSHIP_GAME); }

  init(): void {
    this.phase = "learning";
    this.answer = "";
    this.correctCount = 0;
    this.mathObjects = [];
    this.mathStagePanels = [];
    this.backgroundStars = [];
    this.enemies = [];
    this.projectiles = [];
    this.repairKits = [];
    this.playerHealth = 100;
    this.shipsDestroyed = 0;
    this.shipsSpawned = 0;
    this.bossSpawned = false;
    this.nextSpawnAt = 0;
    this.nextShotAt = 0;
  }

  create(): void {
    const settings = loadAdditionSettings();
    this.enemyShipCount = settings.enemyShipCount;
    this.starshipDifficulty = settings.starshipDifficulty;
    this.cameras.main.setBackgroundColor(NEON.dark);
    this.createBackground();
    this.createHeader();
    this.createAnswerArea();
    this.createKeypad();
    this.bindKeyboard();
    addGameNavigation(this);
    this.newProblem();
  }

  update(time: number, delta: number): void {
    if (this.phase !== "combat") return;
    this.scrollBackground(delta);
    this.movePlayer(delta);
    this.spawnShips(time);
    this.updateEnemies(time, delta);
    this.updateProjectiles(delta);
    this.updateRepairKits(delta);
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
    this.trackMath(this.add.text(76, 58, "PHONICS STARSHIP", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "27px", color: "#ffffff", letterSpacing: 2 }));
    this.trackMath(this.add.text(77, 94, "vowels, teams, silent e, and digraphs", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px", color: NEON.muted, letterSpacing: 1 }));
    this.correctCountText = this.trackMath(this.add.text(GAME_WIDTH - 75, 70, `CORRECT  0 / ${CORRECT_ANSWERS_TO_LAUNCH}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#ffe45c", letterSpacing: 1 }).setOrigin(1, 0.5));
  }

  private createAnswerArea(): void {
    this.answerText = this.trackMath(this.add.text(GAME_WIDTH / 2, 620, "", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "28px", color: "#45f6e5" }).setOrigin(0.5));
    this.statusText = this.trackMath(this.add.text(GAME_WIDTH / 2, 666, "Choose an answer, or press 1, 2, or 3", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", color: NEON.muted }).setOrigin(0.5));
  }

  private createKeypad(): void {
    const keypadLayer = this.trackMath(this.add.container(0, 0));
    this.keypadLayer = keypadLayer;
  }

  private bindKeyboard(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);
    this.moveKeys = this.input.keyboard?.addKeys("W,A,S,D") as typeof this.moveKeys;
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (this.phase === "ended" && event.key.toLowerCase() === "r") { this.scene.restart(); return; }
      if (this.phase === "combat") { if (event.code === "Space") this.firePlayerLaser(); return; }
      if (this.phase !== "learning") return;
      if (/^[1-3]$/.test(event.key)) this.selectChoice(Number(event.key) - 1);
    };
    this.input.keyboard?.on("keydown", this.keyboardHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) this.input.keyboard?.off("keydown", this.keyboardHandler);
      this.keyboardHandler = undefined;
      this.input.keyboard?.removeCapture([
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.SPACE
      ]);
    });
  }

  private refreshAnswer(): void {
    const choiceIndex = Number(this.answer);
    this.answerText?.setText(Number.isInteger(choiceIndex) ? `Selected: ${this.problem.choices[choiceIndex]}` : "");
  }

  private selectChoice(choiceIndex: number): void {
    if (this.phase !== "learning" || choiceIndex >= this.problem.choices.length) return;
    this.answer = String(choiceIndex);
    this.refreshAnswer();
    this.checkAnswer();
  }

  private newProblem(): void {
    this.problem = PHONICS_CHALLENGES[Phaser.Math.Between(0, PHONICS_CHALLENGES.length - 1)] ?? PHONICS_CHALLENGES[0];
    this.answer = "";
    this.statusText?.setText("Choose an answer, or press 1, 2, or 3").setColor(NEON.muted);
    this.refreshAnswer(); this.renderProblem();
  }

  private renderProblem(): void {
    this.problemLayer?.destroy(true);
    const layer = this.trackMath(this.add.container(0, 0)); this.problemLayer = layer;
    layer.add(this.add.text(GAME_WIDTH / 2, 285, this.problem.prompt, {
      fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "36px", color: "#f7f2ff",
      align: "center", wordWrap: { width: 820 }, lineSpacing: 10
    }).setOrigin(0.5));
    this.keypadLayer?.removeAll(true);
    this.problem.choices.forEach((choice, index) => this.createChoiceButton(340 + index * 340, 500, index, choice));
  }

  private createChoiceButton(x: number, y: number, index: number, choice: string): void {
    const bg = this.add.rectangle(x, y, 300, 100, 0x1b1430, 1).setStrokeStyle(3, [NEON.yellow, NEON.cyan, NEON.orange][index], 0.9);
    const label = this.add.text(x, y, `${index + 1}. ${choice}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "30px", color: NEON.ink }).setOrigin(0.5);
    const zone = this.add.zone(x, y, 300, 100).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { bg.setFillStyle(0x33244f); label.setScale(1.06); })
      .on("pointerout", () => { bg.setFillStyle(0x1b1430); label.setScale(1); })
      .on("pointerup", () => this.selectChoice(index));
    this.keypadLayer?.add([bg, label, zone]);
  }

  private checkAnswer(): void {
    if (!this.answer) return;
    if (Number(this.answer) !== this.problem.correctChoice) {
      this.statusText?.setText("TRY AGAIN — YOU'VE GOT THIS!").setColor("#ff70b8");
      this.tweens.add({ targets: this.answerText, x: "+=10", duration: 55, yoyo: true, repeat: 3 }); return;
    }
    this.correctCount += 1;
    this.correctCountText?.setText(`CORRECT  ${this.correctCount} / ${CORRECT_ANSWERS_TO_LAUNCH}`);
    this.statusText?.setText(this.correctCount >= CORRECT_ANSWERS_TO_LAUNCH ? "LAUNCH SEQUENCE READY!" : `${this.problem.teachingNote}  NEXT QUESTION LOADING...`).setColor("#45f6e5");
    this.createCorrectAnswerConfetti();
    this.time.delayedCall(750, () => this.correctCount >= CORRECT_ANSWERS_TO_LAUNCH ? this.launchCombat() : this.newProblem());
  }

  private createCorrectAnswerConfetti(): void {
    const colors = [NEON.yellow, NEON.cyan, NEON.pink, NEON.purple, NEON.orange];
    for (let index = 0; index < 32; index += 1) {
      const confetti = this.add.rectangle(
        GAME_WIDTH / 2 + Phaser.Math.Between(-70, 70),
        365 + Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(7, 12),
        Phaser.Math.Between(12, 20),
        Phaser.Utils.Array.GetRandom(colors) ?? NEON.cyan
      ).setRotation(Phaser.Math.FloatBetween(-0.8, 0.8)).setDepth(8);
      this.tweens.add({
        targets: confetti,
        x: confetti.x + Phaser.Math.Between(-260, 260),
        y: confetti.y + Phaser.Math.Between(-140, 220),
        angle: Phaser.Math.Between(-540, 540),
        alpha: 0,
        duration: Phaser.Math.Between(600, 1000),
        ease: "Quad.Out",
        onComplete: () => confetti.destroy()
      });
    }
  }

  private launchCombat(): void {
    if (this.phase !== "learning") return;
    this.phase = "launching";
    this.mathObjects.forEach((object) => object.destroy(true));
    this.mathObjects = [];
    this.mathStagePanels.forEach((panel) => panel.destroy());
    this.mathStagePanels = [];
    this.player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT + 70, ASSET_KEYS.PLAYER_STARSHIP).setDisplaySize(78, 87).setDepth(4);
    this.combatStatusText = this.add.text(GAME_WIDTH / 2, 390, "PHONICS CORE CHARGED — DEFEND THE LAB!", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "28px", color: "#45f6e5" }).setOrigin(0.5).setDepth(6);
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
    const speed = COMBAT_DIFFICULTIES[this.starshipDifficulty].playerSpeed * delta;
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
    const difficulty = COMBAT_DIFFICULTIES[this.starshipDifficulty];
    const ship = this.add.image(Phaser.Math.Between(80, GAME_WIDTH - 80), -75, ASSET_KEYS.ENEMY_STARSHIP_SHEET, boss ? 1 : Phaser.Math.Between(0, 1)).setDepth(2);
    ship.setDisplaySize(boss ? 118 : 64, boss ? 146 : 80);
    if (boss) ship.setTint(0xff70b8);
    this.enemies.push({ ship, health: boss ? difficulty.bossHealth : difficulty.normalHealth, speed: boss ? 0.095 : Phaser.Math.FloatBetween(difficulty.minSpeed, difficulty.maxSpeed), fireAt: this.time.now + Phaser.Math.Between(...difficulty.normalFireDelay), boss });
  }

  private recycleEnemy(enemy: Enemy, time: number): void {
    const difficulty = COMBAT_DIFFICULTIES[this.starshipDifficulty];
    enemy.ship.setPosition(Phaser.Math.Between(80, GAME_WIDTH - 80), -75);
    enemy.speed = enemy.boss ? 0.095 : Phaser.Math.FloatBetween(difficulty.minSpeed, difficulty.maxSpeed);
    enemy.fireAt = time + Phaser.Math.Between(...difficulty.normalFireDelay);
  }

  private updateEnemies(time: number, delta: number): void {
    for (const enemy of [...this.enemies]) {
      if (enemy.boss) {
        enemy.ship.y = Math.min(190, enemy.ship.y + enemy.speed * delta);
        if (enemy.ship.y >= 190) enemy.ship.x = Phaser.Math.Clamp(enemy.ship.x + Math.sin(time / 450) * 0.18 * delta, 80, GAME_WIDTH - 80);
      } else enemy.ship.y += enemy.speed * delta;
      if (time >= enemy.fireAt && enemy.ship.y > 30) {
        const difficulty = COMBAT_DIFFICULTIES[this.starshipDifficulty];
        this.fireEnemyWeapon(enemy);
        enemy.fireAt = time + (enemy.boss ? difficulty.bossFireDelay : Phaser.Math.Between(...difficulty.normalFireDelay));
      }
      if (!enemy.boss && enemy.ship.y > GAME_HEIGHT + 100) {
        // Keep the same fleet member alive: it re-enters at the top with a
        // fresh lane and speed, so every ship must be defeated to summon the boss.
        this.recycleEnemy(enemy, time);
        continue;
      }
      if (this.player && Phaser.Geom.Intersects.RectangleToRectangle(enemy.ship.getBounds(), this.player.getBounds())) {
        this.damagePlayer(enemy.boss ? COMBAT_DIFFICULTIES[this.starshipDifficulty].bossCollisionDamage : COMBAT_DIFFICULTIES[this.starshipDifficulty].normalDamage + 5);
        if (this.phase === "combat") this.recycleEnemy(enemy, time);
      }
    }
  }

  private fireEnemyWeapon(enemy: Enemy): void {
    const bomb = enemy.boss && Phaser.Math.Between(0, 2) === 0;
    const projectile = this.add.image(enemy.ship.x, enemy.ship.y + enemy.ship.displayHeight / 2, bomb ? ASSET_KEYS.ENEMY_BOMB : ASSET_KEYS.ENEMY_LASER).setDisplaySize(bomb ? 34 : 18, bomb ? 39 : 34).setDepth(3);
    const difficulty = COMBAT_DIFFICULTIES[this.starshipDifficulty];
    this.projectiles.push({ sprite: projectile, speed: bomb ? 0.36 : 0.56, damage: bomb ? difficulty.bombDamage : difficulty.normalDamage, playerOwned: false });
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

  private spawnRepairKit(x: number, y: number): void {
    const pickup = this.add.container(x, y).setDepth(4);
    const caseShape = this.add.circle(0, 0, 19, 0x43c970).setStrokeStyle(3, 0xe9fff0, 0.9);
    const cross = this.add.text(0, -1, "+", { fontFamily: "Arial Black, sans-serif", fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);
    pickup.add([caseShape, cross]);
    this.repairKits.push({ pickup, speed: 0.11 });
  }

  private updateRepairKits(delta: number): void {
    for (const repairKit of [...this.repairKits]) {
      repairKit.pickup.y += repairKit.speed * delta;
      if (repairKit.pickup.y > GAME_HEIGHT + 40) {
        this.removeRepairKit(repairKit);
        continue;
      }
      if (this.player && Phaser.Geom.Intersects.RectangleToRectangle(repairKit.pickup.getBounds(), this.player.getBounds())) {
        this.playerHealth = Math.min(100, this.playerHealth + 25);
        this.healthText?.setText(`HULL  ${this.playerHealth}`).setColor("#45f6e5");
        this.combatStatusText?.setText("REPAIR KIT COLLECTED  +25 HULL").setColor("#45f6e5").setVisible(true);
        this.time.delayedCall(1200, () => this.phase === "combat" && this.combatStatusText?.setVisible(false));
        this.removeRepairKit(repairKit);
      }
    }
  }

  private removeProjectile(projectile: Projectile): void { projectile.sprite.destroy(); this.projectiles = this.projectiles.filter((item) => item !== projectile); }
  private removeRepairKit(repairKit: RepairKit): void { repairKit.pickup.destroy(); this.repairKits = this.repairKits.filter((item) => item !== repairKit); }
  private removeEnemy(enemy: Enemy, destroyed: boolean): void {
    if (destroyed) this.spawnRepairKit(enemy.ship.x, enemy.ship.y);
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
    this.repairKits.forEach(({ pickup }) => pickup.destroy()); this.repairKits = [];
    this.enemies.forEach(({ ship }) => ship.destroy()); this.enemies = [];
    this.combatStatusText?.setText(won ? "BOSS DEFEATED — NEXT MISSION IN 4..." : "SHIP LOST — NEW MISSION IN 4...").setColor(won ? "#45f6e5" : "#ff70b8").setFontSize(28).setVisible(true);
    this.time.delayedCall(4000, () => this.scene.restart());
  }
}
