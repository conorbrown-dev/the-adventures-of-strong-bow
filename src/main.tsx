import Phaser from "phaser";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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
let phaserReady = false;

function startGameScene({ scene, sceneData }: { scene: string; sceneData?: object }): void {
  game.scene.stop("TitleScene");
  game.scene.start(scene, sceneData);
}

window.addEventListener("phaser:ready", () => { phaserReady = true; });
window.addEventListener("quiz-ui:close", () => game.scene.start("TitleScene"));
window.addEventListener("phaser-game:launch", (event) => {
  const launch = (event as CustomEvent<{ scene: string; sceneData?: object }>).detail;
  if (!launch.scene) return;
  if (phaserReady) { startGameScene(launch); return; }
  window.addEventListener("phaser:ready", () => startGameScene(launch), { once: true });
});
window.addEventListener("phaser-game:stop", () => {
  game.scene.getScenes(true)
    .filter((scene) => !["BootScene", "PreloadScene", "TitleScene"].includes(scene.scene.key))
    .forEach((scene) => game.scene.stop(scene.scene.key));
  if (!game.scene.isActive("TitleScene")) game.scene.start("TitleScene");
});
createRoot(quizRoot).render(<BrowserRouter><QuizApp /></BrowserRouter>);

async function requestInitialMicrophoneAccess(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // The focused activities will show their existing microphone guidance if
    // access is declined or the browser requires a later user gesture.
  }
}

void requestInitialMicrophoneAccess();
