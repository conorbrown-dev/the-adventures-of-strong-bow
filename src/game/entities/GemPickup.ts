import Phaser from "phaser";

export class GemPickup extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  private readonly labelText: Phaser.GameObjects.Text;
  private collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(12);
    this.setDisplaySize(104, 104);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setSize(this.width * 0.8, this.height * 0.8);
    body.setOffset(this.width * 0.1, this.height * 0.1);

    this.labelText = scene.add
      .text(x, y + 34, "GEM", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#f4ecff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(13);

    this.deactivate();
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.labelText.setPosition(this.x, this.y + 62);
  }

  activate(): void {
    this.collected = false;
    this.enableBody(false, this.x, this.y, true, true);
    this.setAlpha(1);
    this.labelText.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      y: this.y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });
  }

  deactivate(): void {
    this.disableBody(true, true);
    this.labelText.setVisible(false);
  }

  collect(): boolean {
    if (this.collected || !this.active) {
      return false;
    }

    this.collected = true;
    this.scene.tweens.killTweensOf(this);
    this.disableBody(true, true);
    this.labelText.setVisible(false);

    return true;
  }

  override destroy(fromScene?: boolean): void {
    this.scene.tweens.killTweensOf(this);
    this.labelText.destroy();
    super.destroy(fromScene);
  }
}
