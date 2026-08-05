import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./style.css";
import { QuizApp } from "./quiz/QuizApp";
import { SCENE_KEYS } from "./game/utils/sceneKeys";

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app container");

const phaserRoot = document.createElement("div");
phaserRoot.id = "phaser-root";
const quizRoot = document.createElement("div");
quizRoot.id = "quiz-root";
app.append(phaserRoot, quizRoot);

let phaserReady = false;
let game: import("phaser").Game | undefined;
const launchableGameScenes = new Set<string>([
  SCENE_KEYS.SIGHT_WORDS_TITLE,
  SCENE_KEYS.SIGHT_WORDS_QUIZ,
  SCENE_KEYS.BARN_DOOR_VOWELS_TITLE,
  SCENE_KEYS.BARN_DOOR_VOWELS,
  SCENE_KEYS.ADDITION_TITLE,
  SCENE_KEYS.ADDITION_GAME,
  SCENE_KEYS.FOSSIL_DIG_TITLE,
  SCENE_KEYS.FOSSIL_DIG,
  SCENE_KEYS.CAT_CATCH_TITLE,
  SCENE_KEYS.LETTER_CATCH
]);

async function ensureGame(): Promise<import("phaser").Game> {
  if (game) return game;
  const [{ default: Phaser }, { createGameConfig }] = await Promise.all([import("phaser"), import("./game/config/gameConfig")]);
  game = new Phaser.Game(createGameConfig("phaser-root"));
  return game;
}

function startGameScene(activeGame: import("phaser").Game, { scene, sceneData }: { scene: string; sceneData?: object }): void {
  if (!launchableGameScenes.has(scene)) return;

  const targetScene = activeGame.scene.getScene(scene);
  // Keep the title scene visible until Phaser has created the requested
  // activity, so a failed initialization cannot leave a black canvas.
  targetScene.events.once("create", () => {
    phaserRoot.dataset.activeScene = scene;
    if (activeGame.scene.isActive(SCENE_KEYS.TITLE)) activeGame.scene.stop(SCENE_KEYS.TITLE);
  });
  activeGame.scene.start(scene, sceneData);
}

window.addEventListener("phaser:ready", () => { phaserReady = true; });
window.addEventListener("quiz-ui:close", () => { void ensureGame().then((activeGame) => activeGame.scene.start("TitleScene")); });
window.addEventListener("phaser-game:launch", (event) => {
  const launch = (event as CustomEvent<{ scene: string; sceneData?: object }>).detail;
  if (!launch.scene) return;
  void ensureGame().then((activeGame) => {
    if (phaserReady) { startGameScene(activeGame, launch); return; }
    window.addEventListener("phaser:ready", () => startGameScene(activeGame, launch), { once: true });
  });
});
window.addEventListener("phaser-game:stop", () => {
  const activeGame = game;
  if (!activeGame) return;
  activeGame.scene.getScenes(true)
    .filter((scene) => !["BootScene", "PreloadScene", "TitleScene"].includes(scene.scene.key))
    .forEach((scene) => activeGame.scene.stop(scene.scene.key));
  if (!activeGame.scene.isActive("TitleScene")) activeGame.scene.start("TitleScene");
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
