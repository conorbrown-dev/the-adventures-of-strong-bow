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
window.addEventListener("phaser-game:launch", (event) => {
  const { scene: sceneKey, sceneData } = (event as CustomEvent<{ scene: string; sceneData?: object }>).detail;
  if (sceneKey) {
    game.scene.stop("TitleScene");
    game.scene.start(sceneKey, sceneData);
  }
});
createRoot(quizRoot).render(<QuizApp />);

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
