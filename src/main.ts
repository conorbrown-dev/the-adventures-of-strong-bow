import Phaser from "phaser";

import "./style.css";
import { createGameConfig } from "./game/config/gameConfig";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Missing #app container");
}

new Phaser.Game(createGameConfig("app"));
