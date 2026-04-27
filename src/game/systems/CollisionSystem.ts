import Phaser from "phaser";

export class CollisionSystem {
  static addOverlap(
    scene: Phaser.Scene,
    object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Group
      | Phaser.Physics.Arcade.StaticGroup,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Group
      | Phaser.Physics.Arcade.StaticGroup,
    callback: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): Phaser.Physics.Arcade.Collider {
    return scene.physics.add.overlap(object1, object2, callback);
  }

  static addCollider(
    scene: Phaser.Scene,
    object1:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Group
      | Phaser.Physics.Arcade.StaticGroup,
    object2:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Group
      | Phaser.Physics.Arcade.StaticGroup,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): Phaser.Physics.Arcade.Collider {
    return scene.physics.add.collider(object1, object2, callback);
  }
}
