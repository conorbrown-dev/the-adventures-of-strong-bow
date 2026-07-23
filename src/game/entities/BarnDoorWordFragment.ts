import Phaser from "phaser";
import type { VowelsAndWordsData } from "../data/letters";

export class BarnDoorWordFragment extends Phaser.GameObjects.Container {
    readonly animal: Phaser.GameObjects.Sprite;
    readonly spawnPosition: Phaser.Math.Vector2;
    private readonly labelText: Phaser.GameObjects.Text;

    constructor(
        scene: Phaser.Scene,
        posX: number,
        posY: number,
        readonly wordData: VowelsAndWordsData,
        textureKey: string
    ) {
        super(scene, posX, posY);

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.spawnPosition = new Phaser.Math.Vector2(posX, posY);
        this.setDepth(12).setSize(92, 80).setInteractive({ useHandCursor: true });

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(76, 62).setOffset(8, 16);
        body.setCollideWorldBounds(true);
        body.allowGravity = false;

        this.animal = scene.add.sprite(0, 20, textureKey, 0).setDisplaySize(116, 116);

        this.labelText = scene.add
            .text(0, -60, wordData.displayWordText, {
                fontFamily: "Trebuchet MS",
                fontSize: "38px",
                fontStyle: "bold",
                color: "#fffaf0",
                stroke: "#2d1f14",
                strokeThickness: 7
            })
            .setOrigin(0.5);
        this.add([this.animal, this.labelText]);
    }

    setSelected(selected: boolean): void {
        this.labelText.setColor(selected ? "#ffdf72" : "#fffaf0");
        this.setDepth(selected ? 16 : 12);
    }

    stopMoving(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
    }
}
