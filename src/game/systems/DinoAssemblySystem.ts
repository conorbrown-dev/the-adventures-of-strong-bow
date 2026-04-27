import Phaser from "phaser";

import type { DinoDefinition } from "../data/dinos";
import { DinoSkeleton } from "../entities/DinoSkeleton";

export class DinoAssemblySystem {
  constructor(private readonly scene: Phaser.Scene) {}

  async playSequence(
    x: number,
    y: number,
    dinoDefinition: DinoDefinition
  ): Promise<DinoSkeleton> {
    const assemblyText = this.scene.add
      .text(x, y - 120, "Assembling fossil...", {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#fff8e8",
        fontStyle: "bold",
        stroke: "#2d1f14",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(40);

    // TODO: Replace this with piece-by-piece fossil assembly when real art exists.
    const dino = new DinoSkeleton(this.scene, x, y, dinoDefinition);
    await dino.assemble();
    await dino.flash();

    assemblyText.destroy();
    return dino;
  }
}
