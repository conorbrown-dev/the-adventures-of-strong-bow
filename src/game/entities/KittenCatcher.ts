import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";

const KITTEN_WALK_ANIMATION_KEY = "kitten-catcher-walk";
const JUMP_VELOCITY = -520;
const JUMP_GRAVITY = 1450;

export class KittenCatcher extends Phaser.Physics.Arcade.Sprite {
  private facingDirection: -1 | 1 = 1;
  private groundY: number;
  private verticalVelocity = 0;
  private jumping = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.KITTEN_CATCHER);
    this.groundY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.setScale(0.92);
    this.setCollideWorldBounds(true);
    this.setFrame(0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setSize(124, 50);
    body.setOffset(34, 92);
  }

  move(direction: number, speed: number): void {
    this.setVelocityX(direction * speed);

    if (direction !== 0) {
      this.facingDirection = direction < 0 ? -1 : 1;
      this.setFlipX(direction < 0);
      if (this.anims.currentAnim?.key !== KITTEN_WALK_ANIMATION_KEY || !this.anims.isPlaying) {
        this.play(KITTEN_WALK_ANIMATION_KEY);
      }
      return;
    }

    this.stop();
    this.setFrame(0);
  }

  jump(): void {
    if (this.jumping) {
      return;
    }

    this.jumping = true;
    this.verticalVelocity = JUMP_VELOCITY;
  }

  advance(delta: number): void {
    if (!this.jumping) {
      return;
    }

    const deltaSeconds = delta / 1000;
    this.verticalVelocity += JUMP_GRAVITY * deltaSeconds;
    this.y += this.verticalVelocity * deltaSeconds;

    if (this.y < this.groundY) {
      return;
    }

    this.y = this.groundY;
    this.verticalVelocity = 0;
    this.jumping = false;
  }

  getBasketCatchPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.x + this.facingDirection * 48,
      this.y - 6
    );
  }
}
