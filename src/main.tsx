import Phaser from "phaser";
import { createRoot } from "react-dom/client";
import "./style.css";
import { QuizApp } from "./quiz/QuizApp";
import { createGameConfig } from "./game/config/gameConfig";

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app container");

const phaserRoot = document.createElement("div");
phaserRoot.id = "phaser-root";
const quizRoot = document.createElement("div");
quizRoot.id = "quiz-root";
app.append(phaserRoot, quizRoot);

const game = new Phaser.Game(createGameConfig("phaser-root"));
window.addEventListener("quiz-ui:close", () => game.scene.start("TitleScene"));
createRoot(quizRoot).render(<QuizApp />);
