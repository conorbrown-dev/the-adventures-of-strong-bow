import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";
import {
  CHASE_BOOST_SPEED,
  CHASE_JUMP_SPEED,
  CHASE_RUN_SPEED,
  DIG_PLAYER_SPEED
} from "../utils/constants";

type KeyMap = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  dig?: Phaser.Input.Keyboard.Key;
  jump?: Phaser.Input.Keyboard.Key;
};

type ControlMode = "disabled" | "dig" | "chase";

const PLAYER_ANIMS = {
  IDLE: "player-idle",
  DIG_WALK: "player-dig-walk",
  DIG_ACTION: "player-dig-action",
  CHASE_RUN: "player-chase-run",
  JUMP: "player-jump"
} as const;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  static readonly DISPLAY_WIDTH = 104;
  static readonly DISPLAY_HEIGHT = 104;
  static readonly RUN_VISUAL_WIDTH = 124;
  static readonly RUN_VISUAL_HEIGHT = 124;
  static readonly DIG_VISUAL_WIDTH = 104;
  static readonly DIG_VISUAL_HEIGHT = 104;
  static readonly BODY_WIDTH = 36;
  static readonly BODY_HEIGHT = 44;
  static readonly BODY_OFFSET_X = 34;
  static readonly BODY_OFFSET_Y = 38;

  private controlMode: ControlMode = "disabled";
  private keys?: KeyMap;
  private readonly runSprite: Phaser.GameObjects.Sprite;
  private readonly digSprite: Phaser.GameObjects.Sprite;
  private readonly shovel: Phaser.GameObjects.Image;
  private digTween?: Phaser.Tweens.Tween;
  private facingDirection = new Phaser.Math.Vector2(1, 0);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.PLAYER);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(20);
    this.setCollideWorldBounds(true);
    this.setDisplaySize(Player.DISPLAY_WIDTH, Player.DISPLAY_HEIGHT);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(Player.BODY_WIDTH, Player.BODY_HEIGHT);
    body.setOffset(Player.BODY_OFFSET_X, Player.BODY_OFFSET_Y);
    this.runSprite = scene.add
      .sprite(x, y, ASSET_KEYS.PLAYER)
      .setDepth(20)
      .setDisplaySize(Player.RUN_VISUAL_WIDTH, Player.RUN_VISUAL_HEIGHT);
    this.digSprite = scene.add
      .sprite(x, y, ASSET_KEYS.PLAYER_DIGGING)
      .setDepth(20)
      .setDisplaySize(Player.DIG_VISUAL_WIDTH, Player.DIG_VISUAL_HEIGHT)
      .setVisible(false);
    this.shovel = scene.add
      .image(x, y, ASSET_KEYS.SHOVEL)
      .setVisible(false)
      .setDepth(21)
      .setDisplaySize(22, 22);
    this.runSprite.play(PLAYER_ANIMS.IDLE);
  }

  configureForDigScene(keys: KeyMap): void {
    this.keys = keys;
    this.controlMode = "dig";
    this.setVelocity(0, 0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
  }

  configureForChaseScene(keys: KeyMap): void {
    this.keys = keys;
    this.controlMode = "chase";
    this.setVelocity(0, 0);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = true;
  }

  disableControls(): void {
    this.controlMode = "disabled";
    this.setVelocity(0, 0);
    this.hideShovel();
    this.showRunVisual();
    this.runSprite.play(PLAYER_ANIMS.IDLE, true);
  }

  getDigInputVector(): Phaser.Math.Vector2 {
    if (this.controlMode !== "dig" || !this.keys) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const x =
      Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    const y = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
    const vector = new Phaser.Math.Vector2(x, y);

    if (vector.lengthSq() > 0) {
      vector.normalize();
    }

    return vector;
  }

  updateChaseMovement(): void {
    if (this.controlMode !== "chase" || !this.keys) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isBoosting = this.keys.right.isDown;
    const isBraking = this.keys.left.isDown;
    const targetSpeed = isBoosting
      ? CHASE_BOOST_SPEED
      : isBraking
        ? CHASE_RUN_SPEED - 45
        : CHASE_RUN_SPEED;

    this.setVelocityX(targetSpeed);

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump ?? this.keys.up);

    if (jumpPressed && body.blocked.down) {
      this.setVelocityY(-CHASE_JUMP_SPEED);
    }

    if (body.blocked.down) {
      this.showRunVisual();
      this.runSprite.play(PLAYER_ANIMS.CHASE_RUN, true);
    } else {
      this.showRunVisual();
      this.runSprite.play(PLAYER_ANIMS.JUMP, true);
    }
  }

  getDigSpeed(): number {
    return DIG_PLAYER_SPEED;
  }

  getCollisionFootprint(): { width: number; height: number } {
    return {
      width: this.body.width,
      height: this.body.height
    };
  }

  getCollisionCenterOffset(): { x: number; y: number } {
    return {
      x:
        Player.BODY_OFFSET_X +
        Player.BODY_WIDTH / 2 -
        Player.DISPLAY_WIDTH / 2,
      y:
        Player.BODY_OFFSET_Y +
        Player.BODY_HEIGHT / 2 -
        Player.DISPLAY_HEIGHT / 2
    };
  }

  updateDigAnimation(input: Phaser.Math.Vector2): void {
    this.updateFacing(input);

    if (input.lengthSq() === 0) {
      this.showRunVisual();
      this.runSprite.play(PLAYER_ANIMS.IDLE, true);
      this.hideShovel();
      return;
    }

    this.updateFacingFlip(input);
    this.showRunVisual();
    this.runSprite.play(PLAYER_ANIMS.DIG_WALK, true);
  }

  updateDigAction(input: Phaser.Math.Vector2, isDigging: boolean): void {
    this.updateFacing(input);

    if (!isDigging || input.lengthSq() === 0) {
      this.showRunVisual();
      this.hideShovel();
      return;
    }

    this.updateFacingFlip(input);
    this.hideShovel();
    const digWasHidden = !this.digSprite.visible;
    this.showDigVisual();
    this.digSprite.setAlpha(1);
    if (digWasHidden || this.digSprite.anims.currentAnim?.key !== PLAYER_ANIMS.DIG_ACTION) {
      this.digSprite.setFrame(0);
      this.digSprite.play(PLAYER_ANIMS.DIG_ACTION, true);
    }
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.runSprite.setPosition(this.x, this.y);
    this.digSprite.setPosition(this.x, this.y);
    this.updateShovelPlacement();
  }

  override destroy(fromScene?: boolean): void {
    this.digTween?.stop();
    this.runSprite.destroy();
    this.digSprite.destroy();
    this.shovel.destroy();
    super.destroy(fromScene);
  }

  private updateFacing(input: Phaser.Math.Vector2): void {
    if (input.lengthSq() === 0) {
      return;
    }

    this.facingDirection = input.clone().normalize();
  }

  private updateShovelPlacement(): void {
    if (!this.shovel.visible) {
      return;
    }

    const offset = this.getShovelOffset(this.facingDirection);
    this.shovel.setPosition(this.x + offset.x, this.y + offset.y);
  }

  private hideShovel(): void {
    this.shovel.setVisible(false);
    this.shovel.setScale(1);
    this.digTween?.stop();
    this.digTween = undefined;
  }

  private updateFacingFlip(input: Phaser.Math.Vector2): void {
    if (input.x < 0) {
      this.runSprite.setFlipX(true);
      this.digSprite.setFlipX(true);
    } else if (input.x > 0) {
      this.runSprite.setFlipX(false);
      this.digSprite.setFlipX(false);
    }
  }

  private showRunVisual(): void {
    this.runSprite.setVisible(true);
    this.digSprite.setVisible(false);
    this.digSprite.stop();
  }

  private showDigVisual(): void {
    this.runSprite.setVisible(false);
    this.digSprite.setVisible(true);
  }

  private getShovelOffset(direction: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      return new Phaser.Math.Vector2(direction.x > 0 ? 18 : -18, 6);
    }

    if (direction.y > 0) {
      return new Phaser.Math.Vector2(0, 18);
    }

    return new Phaser.Math.Vector2(0, -18);
  }
}
