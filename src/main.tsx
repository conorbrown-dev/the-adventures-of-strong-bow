import Phaser from "phaser";
import { createRoot } from "react-dom/client";
import "./style.css";
import { QuizApp } from "./quiz/QuizApp";
import { createGameConfig } from "./game/config/gameConfig";
import { SCENE_KEYS } from "./game/utils/sceneKeys";

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app container");

const phaserRoot = document.createElement("div");
phaserRoot.id = "phaser-root";
const quizRoot = document.createElement("div");
quizRoot.id = "quiz-root";
app.append(phaserRoot, quizRoot);

const game = new Phaser.Game(createGameConfig("phaser-root"));
const launchableGameScenes = new Set<string>([
  SCENE_KEYS.SIGHT_WORDS_TITLE,
  SCENE_KEYS.BARN_DOOR_VOWELS_TITLE,
  SCENE_KEYS.ADDITION_TITLE,
  SCENE_KEYS.FOSSIL_DIG_TITLE,
  SCENE_KEYS.CAT_CATCH_TITLE
]);

window.addEventListener("quiz-ui:close", () => game.scene.start(SCENE_KEYS.TITLE));
window.addEventListener("phaser-game:launch", (event) => {
  const sceneKey = (event as CustomEvent<string>).detail;
  if (!launchableGameScenes.has(sceneKey)) return;

  const targetScene = game.scene.getScene(sceneKey);
  // Keep the title scene visible until Phaser has successfully created the
  // requested activity. A failed scene initialization used to leave the canvas
  // with no running scene, which appeared as a black screen.
  targetScene.events.once(Phaser.Scenes.Events.CREATE, () => {
    phaserRoot.dataset.activeScene = sceneKey;
    if (game.scene.isActive(SCENE_KEYS.TITLE)) game.scene.stop(SCENE_KEYS.TITLE);
  });
  game.scene.start(sceneKey);
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
