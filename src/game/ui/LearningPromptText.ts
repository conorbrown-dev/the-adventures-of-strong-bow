import Phaser from "phaser";

import { fossilTextureKeys } from "../data/fossils";
import { LearningType } from "../data/learningTypes";
import type { PromptDescriptor } from "../modes/fossil-dig/FossilDigContent";
import { COLORS } from "../utils/constants";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

export class LearningPromptText extends Phaser.GameObjects.Container {
  private readonly speakerButton: Phaser.GameObjects.Container;
  private readonly objectiveCard: Phaser.GameObjects.Rectangle;
  private readonly objectiveSprite: Phaser.GameObjects.Image;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly objectiveGem: Phaser.GameObjects.Graphics;
  private readonly objectiveBurst: Phaser.GameObjects.Graphics;
  private onSpeakerPressed?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x, y);

    const bg = scene.add
      .rectangle(0, 0, width, 56, COLORS.HUD_PANEL)
      .setStrokeStyle(2, 0x5e4127);
    const speakerBackground = scene.add.circle(
      -width / 2 + 34,
      0,
      18,
      0xffdc6b,
      1
    );
    speakerBackground.setStrokeStyle(2, 0x5e4127);
    const speakerIcon = this.createSpeakerIcon(scene, speakerBackground.x, 0);
    this.speakerButton = scene.add.container(0, 0, [
      speakerBackground,
      speakerIcon
    ]);
    this.speakerButton.setSize(40, 40);
    this.speakerButton.setInteractive(
      new Phaser.Geom.Circle(speakerBackground.x, 0, 18),
      Phaser.Geom.Circle.Contains
    );
    this.speakerButton.on("pointerdown", () => {
      playButtonClick(scene);
      this.onSpeakerPressed?.();
    });
    this.speakerButton.on("pointerover", () => {
      playButtonHover(scene);
      this.speakerButton.setScale(1.06);
    });
    this.speakerButton.on("pointerout", () => {
      this.speakerButton.setScale(1);
    });

    const pathDots = scene.add.graphics();
    pathDots.lineStyle(4, 0x5e4127, 0.3);
    pathDots.beginPath();
    pathDots.moveTo(-width / 2 + 62, 0);
    pathDots.lineTo(-16, 0);
    pathDots.strokePath();

    this.objectiveCard = scene.add
      .rectangle(54, 0, 98, 40, 0xfff8ea)
      .setStrokeStyle(2, 0x5e4127);
    this.objectiveSprite = scene.add
      .image(54, 0, fossilTextureKeys[0])
      .setDisplaySize(30, 30);
    this.objectiveText = scene.add
      .text(54, 0, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.objectiveGem = scene.add.graphics().setVisible(false);
    this.objectiveBurst = scene.add.graphics().setVisible(false);

    this.add([
      bg,
      this.speakerButton,
      pathDots,
      this.objectiveCard,
      this.objectiveSprite,
      this.objectiveText,
      this.objectiveGem,
      this.objectiveBurst
    ]);
    scene.add.existing(this);
  }

  setPrompt(prompt: PromptDescriptor): void {
    this.objectiveSprite.setVisible(false);
    this.objectiveText.setVisible(false);
    this.objectiveGem.clear().setVisible(false);
    this.objectiveBurst.clear().setVisible(false);

    if (
      prompt.kind === "find_specific" &&
      prompt.targetType === LearningType.CVC_WORD
    ) {
      this.objectiveSprite
        .setTexture(fossilTextureKeys[0])
        .setDisplaySize(30, 30)
        .setVisible(true);
      return;
    }

    if (prompt.displayText.toLowerCase().includes("gem")) {
      this.drawGemIcon(this.objectiveGem, 54, 0);
      this.objectiveGem.setVisible(true);
      return;
    }

    if (
      prompt.displayText.toLowerCase().includes("dinosaur") ||
      prompt.displayText.toLowerCase().includes("run")
    ) {
      this.drawBurstIcon(this.objectiveBurst, 54, 0, 0xff8a65);
      this.objectiveBurst.setVisible(true);
      return;
    }

    if (prompt.kind === "find_category") {
      this.objectiveText
        .setText(prompt.targetType === LearningType.VOWEL ? "A" : "B")
        .setVisible(true);
      return;
    }

    if (prompt.kind === "find_specific" && prompt.targetValue) {
      this.objectiveText.setText(prompt.targetValue).setVisible(true);
      return;
    }

    this.drawBurstIcon(this.objectiveBurst, 54, 0, 0xffdc6b);
    this.objectiveBurst.setVisible(true);
  }

  setSpeakerHandler(handler: (() => void) | undefined): void {
    this.onSpeakerPressed = handler;
    this.speakerButton.setAlpha(handler ? 1 : 0.55);
  }

  private createSpeakerIcon(
    scene: Phaser.Scene,
    x: number,
    y: number
  ): Phaser.GameObjects.Graphics {
    const graphics = scene.add.graphics({ x, y });
    graphics.fillStyle(0x5e4127, 1);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(-9, -7),
        new Phaser.Geom.Point(-3, -7),
        new Phaser.Geom.Point(4, -12),
        new Phaser.Geom.Point(4, 12),
        new Phaser.Geom.Point(-3, 7),
        new Phaser.Geom.Point(-9, 7)
      ],
      true
    );
    graphics.lineStyle(2, 0x5e4127, 1);
    graphics.strokeCircle(8, 0, 5);
    graphics.strokeCircle(8, 0, 10);
    return graphics;
  }

  private drawGemIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number
  ): void {
    graphics.clear();
    graphics.fillStyle(0x8b5cf6, 1);
    graphics.lineStyle(3, 0x5e4127, 1);
    const points = [
      new Phaser.Geom.Point(x, y - 15),
      new Phaser.Geom.Point(x + 13, y),
      new Phaser.Geom.Point(x, y + 15),
      new Phaser.Geom.Point(x - 13, y)
    ];
    graphics.fillPoints(points, true);
    graphics.strokePoints(points, true, true);
  }

  private drawBurstIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    const points = [
      new Phaser.Geom.Point(x, y - 16),
      new Phaser.Geom.Point(x + 6, y - 6),
      new Phaser.Geom.Point(x + 16, y),
      new Phaser.Geom.Point(x + 6, y + 6),
      new Phaser.Geom.Point(x, y + 16),
      new Phaser.Geom.Point(x - 6, y + 6),
      new Phaser.Geom.Point(x - 16, y),
      new Phaser.Geom.Point(x - 6, y - 6)
    ];
    graphics.fillPoints(points, true);
  }
}
