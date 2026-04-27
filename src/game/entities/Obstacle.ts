import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, ASSET_KEYS.OBSTACLE);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(true);
    this.setDisplaySize(84, 72);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setSize(74, 60);
  }
}
