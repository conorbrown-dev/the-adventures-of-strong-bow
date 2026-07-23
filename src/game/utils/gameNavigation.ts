import Phaser from "phaser";

import { GAME_WIDTH } from "./constants";
import { SCENE_KEYS } from "./sceneKeys";

/** Adds the shared pause affordance and Escape-to-app-menu behavior to a game scene. */
export function addGameNavigation(scene: Phaser.Scene): void {
  const button = scene.add
    .rectangle(GAME_WIDTH - 66, 112, 104, 42, 0x1b1430, 0.92)
    .setStrokeStyle(2, 0x45f6e5, 0.85)
    .setScrollFactor(0)
    .setDepth(100);
  const label = scene.add
    .text(GAME_WIDTH - 66, 112, "Ⅱ  PAUSE", {
      fontFamily: "Arial Black, Trebuchet MS, sans-serif",
      fontSize: "15px",
      color: "#ffffff"
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(101);
  const zone = scene.add
    .zone(GAME_WIDTH - 66, 112, 104, 42)
    .setInteractive({ useHandCursor: true })
    .setScrollFactor(0)
    .setDepth(102)
    .on("pointerover", () => button.setFillStyle(0x3b285f, 1))
    .on("pointerout", () => button.setFillStyle(0x1b1430, 0.92))
    .on("pointerup", () => {
      scene.scene.launch(SCENE_KEYS.PAUSE, { pausedSceneKey: scene.scene.key });
      scene.scene.pause(scene.scene.key);
    });

  const escapeHandler = (): void => { scene.scene.start(SCENE_KEYS.TITLE); };
  scene.input.keyboard?.on("keydown-ESC", escapeHandler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.keyboard?.off("keydown-ESC", escapeHandler);
    zone.destroy(); label.destroy(); button.destroy();
  });
}
