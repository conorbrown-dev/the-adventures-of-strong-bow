import type Phaser from "phaser";
import { speak, speakOnHover, stopSpeaking } from "../../quiz/speech";
import { FOSSIL_DIG_MODE_OPTIONS, isFossilDigModeEnabled, loadLearningModeSettings, saveLearningModeSettings } from "../settings/learningModeSettings";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

export function showLearningModeSettingsDialog(scene: Phaser.Scene, openDigSettings: () => void): () => void {
  const settings = loadLearningModeSettings();
  const dialog = document.createElement("dialog");
  dialog.className = "learning-mode-settings";
  dialog.setAttribute("aria-labelledby", "learning-mode-settings-title");
  const title = document.createElement("h2");
  title.id = "learning-mode-settings-title";
  title.textContent = "Parent & teacher settings";
  const note = document.createElement("p");
  note.textContent = "Turn off mastered skills. Changes are saved for all students using this browser.";
  dialog.append(title, note);

  const checkboxes = new Map<string, HTMLInputElement>();
  function checkbox(labelText: string, checked: boolean, onChange: (checked: boolean) => void): HTMLInputElement {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    label.append(input, document.createTextNode(labelText));
    label.addEventListener("pointerenter", () => { playButtonHover(scene); speakOnHover(labelText); });
    input.addEventListener("change", () => {
      playButtonClick(scene);
      onChange(input.checked);
      saveLearningModeSettings(settings);
      void speak(`${labelText} ${input.checked ? "enabled" : "disabled"}.`);
    });
    dialog.append(label);
    return input;
  }

  checkbox("CVC practice across games", settings.isCvcEnabled, (checked) => {
    settings.isCvcEnabled = checked;
    refreshModes();
  });
  const cvcHelp = document.createElement("p");
  cvcHelp.textContent = "CVC practice includes Fossil Dig CVC and Short Vowels, Racing Short Vowels, and Barn Door Vowels.";
  dialog.append(cvcHelp);
  const heading = document.createElement("h3");
  heading.textContent = "Fossil Dig lessons";
  dialog.append(heading);
  for (const option of FOSSIL_DIG_MODE_OPTIONS) {
    const input = checkbox(option.label, !settings.disabledFossilDigModes.includes(option.id), (checked) => {
      settings.disabledFossilDigModes = settings.disabledFossilDigModes.filter((id) => id !== option.id);
      if (!checked) settings.disabledFossilDigModes.push(option.id);
    });
    checkboxes.set(option.id, input);
  }
  function refreshModes(): void {
    for (const option of FOSSIL_DIG_MODE_OPTIONS) {
      const input = checkboxes.get(option.id);
      if (!input) continue;
      input.disabled = !settings.isCvcEnabled && (option.id === "cvc" || option.id === "short-vowels");
      input.checked = isFossilDigModeEnabled(option.id, settings);
    }
  }
  refreshModes();

  const keyboard = scene.input.keyboard;
  const wasKeyboardEnabled = keyboard?.enabled;
  if (keyboard) keyboard.enabled = false;
  let isClosed = false;
  const close = (): void => {
    if (isClosed) return;
    isClosed = true;
    stopSpeaking();
    if (keyboard) {
      keyboard.resetKeys();
      keyboard.enabled = wasKeyboardEnabled ?? true;
    }
    scene.events.off("shutdown", close);
    dialog.close();
    dialog.remove();
  };
  function button(label: string, onClick: () => void): void {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = label;
    control.addEventListener("pointerenter", () => { playButtonHover(scene); speakOnHover(label); });
    control.addEventListener("click", () => { playButtonClick(scene); onClick(); });
    dialog.append(control);
  }
  button("Dig length & sound", () => { close(); openDigSettings(); });
  button("Done", close);
  dialog.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
  dialog.addEventListener("keyup", (event) => event.stopPropagation());
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  scene.events.once("shutdown", close);
  document.body.append(dialog);
  stopSpeaking();
  dialog.showModal();
  void speak("Parent and teacher settings. Turn off skills that are already mastered.");
  return close;
}
