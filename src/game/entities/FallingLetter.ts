import Phaser from "phaser";

import type { LetterData } from "../data/letters";
import { LearningType } from "../data/learningTypes";

const YARN_SOURCE_CROP = {
  x: 226,
  y: 180,
  width: 820,
  height: 820
} as const;
const DEFAULT_YARN_DISPLAY_SIZE = 82;

export class FallingLetter extends Phaser.Physics.Arcade.Sprite {
  private readonly labelText: Phaser.GameObjects.Text;
  private collected = false;
  private readonly driftSpeed = Phaser.Math.FloatBetween(-24, 24);
  private fallSpeed = 0;
  private spinSpeed = 0;
  private yarnDisplaySize = DEFAULT_YARN_DISPLAY_SIZE;
  private bouncingOffscreen = false;
  private bounceVelocityX = 0;
  private bounceVelocityY = 0;
  private remainingGroundBounces = 0;
  private exitingAfterBounces = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly letterData: LetterData,
    textureKey: string
  ) {
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(6);
    this.setCrop(
      YARN_SOURCE_CROP.x,
      YARN_SOURCE_CROP.y,
      YARN_SOURCE_CROP.width,
      YARN_SOURCE_CROP.height
    );
    this.yarnDisplaySize = FallingLetter.getRandomDisplaySize();
    this.setDisplaySize(this.yarnDisplaySize, this.yarnDisplaySize);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setCircle(
      this.yarnDisplaySize * 0.4,
      this.yarnDisplaySize * 0.1,
      this.yarnDisplaySize * 0.1
    );

    this.labelText = scene.add
      .text(x, y + 1, letterData.displayText, {
        fontFamily: "Trebuchet MS",
        fontSize: `${Math.round(this.yarnDisplaySize * 0.44)}px`,
        fontStyle: "bold",
        color: "#fffaf0",
        stroke: "#2d1f14",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(7);
  }

  get learningType(): LearningType.VOWEL | LearningType.CONSONANT {
    return this.letterData.type;
  }

  get label(): string {
    return this.letterData.displayText;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  get isBouncingOffscreen(): boolean {
    return this.bouncingOffscreen;
  }

  getBasketContactPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y + this.yarnDisplaySize * 0.42);
  }

  private static getRandomDisplaySize(): number {
    const roll = Phaser.Math.FloatBetween(0, 1);

    if (roll < 0.68) {
      return Phaser.Math.Between(68, 86);
    }

    if (roll < 0.9) {
      return Phaser.Math.Between(87, 104);
    }

    if (roll < 0.98) {
      return Phaser.Math.Between(105, 124);
    }

    return Phaser.Math.Between(125, 148);
  }

  launch(speed: number): void {
    this.fallSpeed = speed;
    this.spinSpeed = Phaser.Math.Between(-40, 40);
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
  }

  markCollected(): void {
    this.collected = true;
    this.bouncingOffscreen = false;
    this.fallSpeed = 0;
    this.spinSpeed = 0;
    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
  }

  popAndDestroy(): void {
    this.scene.tweens.add({
      targets: [this, this.labelText],
      y: this.y - 26,
      alpha: 0,
      scale: 1.15,
      duration: 180,
      onComplete: () => this.destroy()
    });
  }

  fadeAndDestroy(): void {
    this.scene.tweens.add({
      targets: [this, this.labelText],
      alpha: 0,
      duration: 120,
      onComplete: () => this.destroy()
    });
  }

  bounceOffscreen(groundY: number): void {
    if (this.collected || this.bouncingOffscreen) {
      return;
    }

    this.bouncingOffscreen = true;
    this.fallSpeed = 0;
    this.remainingGroundBounces = Phaser.Math.Between(2, 3);
    this.exitingAfterBounces = false;
    this.bounceVelocityX = Phaser.Math.Between(90, 150) *
      (this.x < this.scene.scale.gameSize.width / 2 ? -1 : 1);
    this.bounceVelocityY = -Phaser.Math.Between(360, 520);
    this.setY(groundY - this.yarnDisplaySize * 0.42);
  }

  advance(delta: number): void {
    if (this.collected) {
      this.labelText.setPosition(this.x, this.y + 1);
      return;
    }

    const deltaSeconds = delta / 1000;

    if (this.bouncingOffscreen) {
      this.bounceVelocityY += 860 * deltaSeconds;
      this.setPosition(
        this.x + this.bounceVelocityX * deltaSeconds,
        this.y + this.bounceVelocityY * deltaSeconds
      );
      if (
        !this.exitingAfterBounces &&
        this.bounceVelocityY > 0 &&
        this.getBasketContactPoint().y >= this.scene.scale.gameSize.height
      ) {
        this.setY(
          this.scene.scale.gameSize.height - this.yarnDisplaySize * 0.42
        );

        if (this.remainingGroundBounces > 0) {
          this.remainingGroundBounces -= 1;
          this.bounceVelocityY = -Math.max(
            180,
            Math.abs(this.bounceVelocityY) * 0.66
          );
          this.bounceVelocityX *= 1.08;
        } else {
          this.exitingAfterBounces = true;
          this.bounceVelocityX = Phaser.Math.Between(230, 340) *
            (this.x < this.scene.scale.gameSize.width / 2 ? -1 : 1);
          this.bounceVelocityY = -Phaser.Math.Between(260, 380);
        }
      }
      this.setRotation(
        this.rotation + Phaser.Math.DegToRad(this.spinSpeed * 2.2 * deltaSeconds)
      );
      (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    } else if (this.fallSpeed > 0) {
      this.setPosition(
        this.x + this.driftSpeed * deltaSeconds,
        this.y + this.fallSpeed * deltaSeconds
      );
      this.setRotation(
        this.rotation + Phaser.Math.DegToRad(this.spinSpeed * deltaSeconds)
      );
      (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    }
    this.labelText.setPosition(this.x, this.y + 1);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.labelText.setPosition(this.x, this.y + 1);
  }

  override destroy(fromScene?: boolean): void {
    this.labelText.destroy();
    super.destroy(fromScene);
  }
}
