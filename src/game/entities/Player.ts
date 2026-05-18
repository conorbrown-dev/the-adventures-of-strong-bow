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
type FacingHorizontal = "left" | "right";

const PLAYER_ANIMS = {
  WALK_RIGHT: "player-walk-right",
  WALK_LEFT: "player-walk-left",
  CLIMB_UP: "player-climb-up",
  CLIMB_DOWN: "player-climb-down",
  DIG_RIGHT: "player-dig-right",
  DIG_LEFT: "player-dig-left"
} as const;

const DIG_WALK_CYCLE_DURATION_MS = 800;
const PLAYER_IDLE_RIGHT_FRAME = 0;
const PLAYER_IDLE_LEFT_FRAME = 12;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  static readonly DISPLAY_WIDTH = 104;
  static readonly DISPLAY_HEIGHT = 104;
  static readonly VISUAL_WIDTH = 124;
  static readonly VISUAL_HEIGHT = 124;
  static readonly VISUAL_OFFSET_Y = -34;
  static readonly DIG_VISUAL_WIDTH = 124;
  static readonly DIG_VISUAL_HEIGHT = 124;
  static readonly DIG_VISUAL_OFFSET_Y = -34;
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
  private digAnimationCompleteHandler?: () => void;
  private facingDirection = new Phaser.Math.Vector2(1, 0);
  private facingHorizontal: FacingHorizontal = "right";

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
      .setDisplaySize(Player.VISUAL_WIDTH, Player.VISUAL_HEIGHT);
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
    this.setFacingIdleFrame();
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
    this.facingHorizontal = "right";

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = true;
  }

  disableControls(): void {
    this.controlMode = "disabled";
    this.setVelocity(0, 0);
    this.hideShovel();
    this.showRunVisual();
    this.runSprite.anims.timeScale = 1;
    this.playFacingIdle(true);
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

    this.showRunVisual();
    this.runSprite.anims.timeScale = 1;
    if (body.blocked.down) {
      this.runSprite.play(PLAYER_ANIMS.WALK_RIGHT, true);
    } else {
      this.setFacingIdleFrame();
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

  updateDigAnimation(
    input: Phaser.Math.Vector2,
    movementDurationMs?: number
  ): void {
    this.updateFacing(input);

    if (input.lengthSq() === 0) {
      this.showRunVisual();
      this.runSprite.anims.timeScale = 1;
      this.playFacingIdle(true);
      this.hideShovel();
      return;
    }

    this.showRunVisual();
    this.runSprite.anims.timeScale = movementDurationMs
      ? DIG_WALK_CYCLE_DURATION_MS / movementDurationMs
      : 1;
    this.runSprite.play(this.getMovementAnimationKey(input), true);
  }

  updateDigAction(input: Phaser.Math.Vector2, isDigging: boolean): void {
    this.updateFacing(input);

    if (!isDigging || input.lengthSq() === 0) {
      this.cancelDigAction(input);
      return;
    }

    this.startDigAction(input);
  }

  playDigJumpAnimation(input: Phaser.Math.Vector2): void {
    this.updateFacing(input);
    this.hideShovel();
    this.showRunVisual();
    this.runSprite.anims.timeScale = 1;
    this.playFacingIdle(true);
  }

  startDigAction(input: Phaser.Math.Vector2, onComplete?: () => void): void {
    this.updateFacing(input);

    if (input.lengthSq() === 0) {
      this.cancelDigAction();
      return;
    }

    this.clearDigAnimationCompleteHandler();
    this.hideShovel();
    this.showDigVisual();
    this.digSprite.anims.timeScale = 1;

    if (onComplete) {
      this.digAnimationCompleteHandler = () => {
        this.digAnimationCompleteHandler = undefined;
        onComplete();
      };
      this.digSprite.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        this.digAnimationCompleteHandler
      );
    }

    this.digSprite.play(this.getDigAnimationKey(input), true);
  }

  cancelDigAction(input?: Phaser.Math.Vector2): void {
    if (input && input.lengthSq() > 0) {
      this.updateFacing(input);
    }

    this.clearDigAnimationCompleteHandler();
    this.showRunVisual();
    this.runSprite.anims.timeScale = 1;
    this.hideShovel();
    this.playFacingIdle(true);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const runOffset = this.getVisualOffset(
      Player.VISUAL_WIDTH,
      Player.VISUAL_HEIGHT,
      Player.VISUAL_OFFSET_Y
    );
    const digOffset = this.getVisualOffset(
      Player.DIG_VISUAL_WIDTH,
      Player.DIG_VISUAL_HEIGHT,
      Player.DIG_VISUAL_OFFSET_Y
    );

    this.runSprite.setPosition(this.x + runOffset.x, this.y + runOffset.y);
    this.digSprite.setPosition(this.x + digOffset.x, this.y + digOffset.y);
    this.updateShovelPlacement();
  }

  override destroy(fromScene?: boolean): void {
    this.digTween?.stop();
    this.clearDigAnimationCompleteHandler();
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
    if (input.x < 0) {
      this.facingHorizontal = "left";
    } else if (input.x > 0) {
      this.facingHorizontal = "right";
    }
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

  private showRunVisual(): void {
    this.clearDigAnimationCompleteHandler();
    this.runSprite.setVisible(true);
    this.digSprite.setVisible(false);
    this.digSprite.stop();
  }

  private showDigVisual(): void {
    this.runSprite.setVisible(false);
    this.digSprite.setVisible(true);
  }

  private clearDigAnimationCompleteHandler(): void {
    if (!this.digAnimationCompleteHandler) {
      return;
    }

    this.digSprite.off(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      this.digAnimationCompleteHandler
    );
    this.digAnimationCompleteHandler = undefined;
  }

  private playFacingIdle(force = false): void {
    if (force) {
      this.runSprite.anims.stop();
    }

    this.setFacingIdleFrame();
  }

  private getMovementAnimationKey(input: Phaser.Math.Vector2): string {
    if (Math.abs(input.y) > Math.abs(input.x)) {
      return input.y < 0 ? PLAYER_ANIMS.CLIMB_UP : PLAYER_ANIMS.CLIMB_DOWN;
    }

    return input.x < 0 ? PLAYER_ANIMS.WALK_LEFT : PLAYER_ANIMS.WALK_RIGHT;
  }

  private getDigAnimationKey(input: Phaser.Math.Vector2): string {
    if (input.x < 0) {
      return PLAYER_ANIMS.DIG_LEFT;
    }

    if (input.x > 0) {
      return PLAYER_ANIMS.DIG_RIGHT;
    }

    return this.facingHorizontal === "left"
      ? PLAYER_ANIMS.DIG_LEFT
      : PLAYER_ANIMS.DIG_RIGHT;
  }

  private setFacingIdleFrame(): void {
    this.runSprite.anims.stop();
    this.runSprite.setFrame(
      this.facingHorizontal === "left"
        ? PLAYER_IDLE_LEFT_FRAME
        : PLAYER_IDLE_RIGHT_FRAME
    );
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

  private getVisualOffset(
    _visualWidth: number,
    _visualHeight: number,
    offsetY: number
  ): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(0, offsetY);
  }
}
