import Phaser from "phaser";
import { useEffect, useRef } from "react";

import { speak, stopSpeaking } from "../quiz/speech";
import starshipWindowUrl from "./assets/guided-lesson-starship-window.png";
import type { LessonPlanActivity, LessonPlanView } from "./learningApplication";

type GuidedLessonStep = { title: string; minutes?: number; directions: string[] };
type GuidedLessonSceneOptions = { plan: LessonPlanView };

const sceneKey = "LearningGuidedLessonScene";
const backgroundKey = "guided-lesson-starship-window";

function activityStep(title: string, activity: LessonPlanActivity): GuidedLessonStep {
  return { title, minutes: activity.minutes, directions: activity.directions };
}

export function guidedLessonSteps(plan: LessonPlanView): GuidedLessonStep[] {
  const day = plan.days[0];
  if (!day) return [];
  return [
    activityStep("Warm up", day.warmUp),
    activityStep("Watch the model", day.explicitModel),
    activityStep("Practice together", day.guidedPractice),
    activityStep("Try it on your own", day.independentPractice),
    activityStep("Keep exploring", day.extension),
    activityStep("Try a different way", day.reteach),
    { title: "What to look for", directions: day.masteryEvidence },
  ];
}

class GuidedLessonScene extends Phaser.Scene {
  private readonly plan: LessonPlanView;
  private readonly steps: GuidedLessonStep[];
  private stepIndex = 0;
  private isGetReadyOpen = true;
  private isNarrating = false;

  constructor({ plan }: GuidedLessonSceneOptions) {
    super(sceneKey);
    this.plan = plan;
    this.steps = guidedLessonSteps(plan);
  }

  preload(): void {
    this.load.image(backgroundKey, starshipWindowUrl);
  }

  create(): void {
    this.scale.on(Phaser.Scale.Events.RESIZE, this.render, this);
    this.input.keyboard?.on("keydown-LEFT", () => this.previousStep());
    this.input.keyboard?.on("keydown-RIGHT", () => this.nextStep());
    this.input.keyboard?.on("keydown-SPACE", () => this.toggleNarration());
    this.input.keyboard?.on("keydown-R", () => this.playNarration());
    this.input.keyboard?.on("keydown-B", () => this.toggleGetReady());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopSpeaking());
    this.ready();
  }

  private ready(): void {
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const panelWidth = Math.min(width * 0.69, 850);
    const panelHeight = Math.min(height * 0.56, 520);
    const panelX = width / 2 - panelWidth / 2;
    const panelY = Math.max(height * 0.16, (height - panelHeight) / 2);
    const step = this.steps[this.stepIndex];
    const day = this.plan.days[0];

    this.add.image(width / 2, height / 2, backgroundKey).setDisplaySize(width, height);
    const panel = this.add.graphics();
    panel.fillStyle(0x09152b, 0.84).fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 28);
    panel.lineStyle(2, 0xa7d9ff, 0.58).strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 28);
    this.add.text(panelX + 36, panelY + 28, `DAY 1 · ${this.plan.subject.toUpperCase()}`, { fontFamily: "Arial Rounded MT Bold, Trebuchet MS, sans-serif", fontSize: "16px", color: "#8bd7ff", letterSpacing: 1.6 });
    this.add.text(panelX + 36, panelY + 58, day?.title ?? this.plan.title, { fontFamily: "Arial Rounded MT Bold, Trebuchet MS, sans-serif", fontSize: `${Math.min(34, Math.max(22, width * 0.027))}px`, color: "#ffffff", wordWrap: { width: panelWidth - 160 } });
    this.add.text(panelX + panelWidth - 38, panelY + 30, `${this.stepIndex} / ${Math.max(this.steps.length - this.stepIndex, 0)}`, { fontFamily: "Arial Rounded MT Bold, Trebuchet MS, sans-serif", fontSize: "18px", color: "#ffe39a" }).setOrigin(1, 0);
    this.add.text(panelX + panelWidth - 38, panelY + 54, "COMPLETED / REMAINING", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "10px", color: "#b8cce6", letterSpacing: 0.7 }).setOrigin(1, 0);
    if (step) {
      this.add.text(panelX + 36, panelY + 132, step.minutes ? `${step.title} · ${step.minutes} min` : step.title, { fontFamily: "Arial Rounded MT Bold, Trebuchet MS, sans-serif", fontSize: "22px", color: "#8ff1d4" });
      this.add.text(panelX + 38, panelY + 178, step.directions.map((direction) => `• ${direction}`).join("\n\n"), { fontFamily: "Trebuchet MS, sans-serif", fontSize: `${Math.min(24, Math.max(18, width * 0.019))}px`, color: "#f5f8ff", lineSpacing: 8, wordWrap: { width: panelWidth - 76 } });
    }
    this.addButton(panelX + 36, panelY + panelHeight - 68, 62, 42, "↺", () => this.playNarration());
    this.addButton(panelX + 108, panelY + panelHeight - 68, 98, 42, this.isNarrating ? "PAUSE" : "PLAY", () => this.toggleNarration());
    this.addBookButton(panelX + panelWidth - 62, panelY + panelHeight - 60);
    this.addArrow(panelX - 54, panelY + panelHeight / 2, "‹", this.stepIndex > 0, () => this.previousStep());
    this.addArrow(panelX + panelWidth + 54, panelY + panelHeight / 2, "›", this.stepIndex < this.steps.length - 1, () => this.nextStep());
    if (this.isGetReadyOpen) this.renderGetReady(panelX, panelY, panelWidth, panelHeight, day);
  }

  private renderGetReady(panelX: number, panelY: number, panelWidth: number, panelHeight: number, day: LessonPlanView["days"][number] | undefined): void {
    const boxWidth = Math.min(panelWidth * 0.84, 690);
    const boxHeight = Math.min(panelHeight * 0.7, 390);
    const boxX = panelX + (panelWidth - boxWidth) / 2;
    const boxY = panelY + (panelHeight - boxHeight) / 2;
    const box = this.add.graphics();
    box.fillStyle(0x102c52, 0.97).fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 22);
    box.lineStyle(2, 0xffdc80, 0.9).strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 22);
    this.add.text(boxX + 28, boxY + 26, "Get ready", { fontFamily: "Arial Rounded MT Bold, Trebuchet MS, sans-serif", fontSize: "28px", color: "#ffe39a" });
    const materials = this.plan.materials.map((material) => `• ${material.name}`).join("\n");
    const setup = day?.adultSetup.map((item) => `• ${item}`).join("\n") ?? "";
    this.add.text(boxX + 30, boxY + 76, `You will need\n${materials}\n\nSet up\n${setup}`, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "17px", color: "#f5f8ff", lineSpacing: 5, wordWrap: { width: boxWidth - 60 } });
    this.addButton(boxX + boxWidth - 118, boxY + 24, 88, 36, "START", () => this.toggleGetReady());
  }

  private addButton(x: number, y: number, width: number, height: number, label: string, action: () => void): void {
    const button = this.add.rectangle(x, y, width, height, 0x235b86, 0.96).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    button.on("pointerdown", action).on("pointerover", () => button.setFillStyle(0x397eae, 1)).on("pointerout", () => button.setFillStyle(0x235b86, 0.96));
    this.add.text(x + width / 2, y + height / 2, label, { fontFamily: "Arial Rounded MT Bold, Trebuchet MS, sans-serif", fontSize: label.length > 5 ? "13px" : "24px", color: "#ffffff" }).setOrigin(0.5);
  }

  private addBookButton(x: number, y: number): void {
    const button = this.add.circle(x, y, 24, 0xffdc80, 0.96).setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.toggleGetReady()).on("pointerover", () => button.setFillStyle(0xffefb3, 1)).on("pointerout", () => button.setFillStyle(0xffdc80, 0.96));
    const icon = this.add.graphics().lineStyle(3, 0x173459, 1);
    icon.strokeRoundedRect(x - 13, y - 11, 12, 22, 2).strokeRoundedRect(x + 1, y - 11, 12, 22, 2).lineBetween(x, y - 11, x, y + 11);
  }

  private addArrow(x: number, y: number, label: string, isEnabled: boolean, action: () => void): void {
    const button = this.add.circle(x, y, 31, isEnabled ? 0x8bd7ff : 0x41516c, isEnabled ? 0.95 : 0.5);
    if (isEnabled) button.setInteractive({ useHandCursor: true }).on("pointerdown", action);
    this.add.text(x, y - 3, label, { fontFamily: "Arial, sans-serif", fontSize: "54px", color: "#071526" }).setOrigin(0.5);
  }

  private previousStep(): void { if (this.stepIndex === 0) return; this.stepIndex -= 1; this.isGetReadyOpen = false; this.render(); this.playNarration(); }
  private nextStep(): void { if (this.stepIndex >= this.steps.length - 1) return; this.stepIndex += 1; this.isGetReadyOpen = false; this.render(); this.playNarration(); }
  private toggleGetReady(): void {
    const isClosingInitialOverlay = this.isGetReadyOpen && this.stepIndex === 0;
    this.isGetReadyOpen = !this.isGetReadyOpen;
    this.render();
    if (isClosingInitialOverlay) this.playNarration();
  }
  private toggleNarration(): void { if (this.isNarrating) { stopSpeaking(); this.isNarrating = false; this.render(); return; } this.playNarration(); }
  private playNarration(): void {
    const step = this.steps[this.stepIndex];
    if (!step) return;
    stopSpeaking(); this.isNarrating = true; this.render();
    const day = this.plan.days[0];
    void speak(`${day?.title ?? this.plan.title}. ${step.title}. ${step.directions.join(" ")}`).finally(() => {
      if (!this.sys.isActive()) return;
      this.isNarrating = false; this.render();
    });
  }
}

export function GuidedLessonPlayer({ plan, onExit }: { plan: LessonPlanView; onExit: () => void }): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = new Phaser.Game({ type: Phaser.CANVAS, parent: host, backgroundColor: "#061326", pixelArt: true, antialias: false, antialiasGL: false, scale: { mode: Phaser.Scale.RESIZE, width: host.clientWidth, height: host.clientHeight }, scene: [new GuidedLessonScene({ plan })] });
    return () => { stopSpeaking(); game.destroy(true); };
  }, [onExit, plan]);
  return <main className="guided-lesson-player"><div className="guided-lesson-stage" ref={hostRef} aria-label={`${plan.title} guided lesson. Use left and right arrow keys to change steps, space to play or pause narration, R to replay, and B to show Get Ready.`} role="application" /><button className="guided-lesson-exit" onClick={onExit}>BACK TO LEARNING</button></main>;
}
