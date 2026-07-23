import Phaser from "phaser";
import { commonCoreQuizzes, gradeLabel, type CurriculumQuiz } from "../data/commonCoreQuizzes";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { clearStudentSession, loadStudentSession, studentApi } from "../utils/studentSession";

const NEON = { cyan: 0x45f6e5, purple: 0xc681ff, pink: 0xff70b8, yellow: 0xffe45c, panel: 0x130d25, ink: "#f7f2ff", muted: "#c5b5df" };

export class CurriculumQuizScene extends Phaser.Scene {
  private quiz?: CurriculumQuiz;
  private questionIndex = 0;
  private correctAnswers = 0;
  private startedAt = 0;
  private content?: Phaser.GameObjects.Container;

  constructor() { super(SCENE_KEYS.CURRICULUM_QUIZ); }

  create(): void {
    const session = loadStudentSession();
    if (!session) { this.scene.start(SCENE_KEYS.STUDENT_LOGIN); return; }
    const available = session.demo
      ? commonCoreQuizzes
      : commonCoreQuizzes.filter((quiz) => quiz.grade === session.student.grade && session.student.subjects.includes(quiz.subject));
    this.quiz = Phaser.Utils.Array.GetRandom(available);
    if (!this.quiz) { this.showMessage("No quizzes are assigned yet. Ask a parent or teacher to select ELA or Math."); return; }
    this.cameras.main.setBackgroundColor(0x05030b);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05030b).setDepth(-2);
    for (let index = 0; index < 85; index++) this.add.circle(Phaser.Math.Between(10, GAME_WIDTH - 10), Phaser.Math.Between(10, GAME_HEIGHT - 10), Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.12, 0.45)).setDepth(-1);
    this.startedAt = Date.now();
    this.renderQuestion();
  }

  private renderQuestion(): void {
    this.content?.destroy(true);
    const session = loadStudentSession();
    const quiz = this.quiz!;
    const question = quiz.questions[this.questionIndex];
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 920, 650, NEON.panel, 0.97).setStrokeStyle(4, NEON.purple));
    objects.push(this.add.text(GAME_WIDTH / 2, 130, `${session?.demo ? "DEMO MODE • ALL ACCESS" : session?.student.username} • ${gradeLabel(quiz.grade)} ${quiz.subject === "ELA" ? "ELA" : "Math"}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "26px", color: "#45f6e5", fontStyle: "bold", letterSpacing: 1 }).setOrigin(0.5));
    objects.push(this.add.text(GAME_WIDTH / 2, 182, `${quiz.title.toUpperCase()}  •  ${this.questionIndex + 1} OF ${quiz.questions.length}`, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "23px", color: NEON.muted }).setOrigin(0.5));
    objects.push(this.add.text(GAME_WIDTH / 2, 290, question.prompt, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "38px", color: NEON.ink, fontStyle: "bold", align: "center", wordWrap: { width: 790 } }).setOrigin(0.5));
    question.choices.forEach((choice, index) => {
      const y = 405 + index * 88;
      const rect = this.add.rectangle(GAME_WIDTH / 2, y, 620, 62, 0x1b1430).setStrokeStyle(3, index % 2 ? NEON.purple : NEON.cyan, 0.85).setInteractive({ useHandCursor: true });
      const label = this.add.text(GAME_WIDTH / 2, y, choice, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "28px", color: NEON.ink, fontStyle: "bold" }).setOrigin(0.5);
      rect.on("pointerover", () => rect.setFillStyle(index % 2 ? NEON.purple : NEON.cyan, 0.55));
      rect.on("pointerout", () => rect.setFillStyle(0x1b1430));
      rect.on("pointerup", () => this.answer(index));
      objects.push(rect, label);
    });
    const quit = this.add.text(910, 740, "SIGN OUT", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "17px", color: "#ff70b8" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    quit.on("pointerup", () => { clearStudentSession(); this.scene.start(SCENE_KEYS.STUDENT_LOGIN); });
    const progress = this.add.text(105, 740, "MY PROGRESS", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "17px", color: "#ffe45c" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    progress.on("pointerup", () => void this.showProgress());
    objects.push(quit, progress);
    this.content = this.add.container(0, 0, objects);
  }

  private answer(index: number): void {
    const question = this.quiz!.questions[this.questionIndex];
    if (index === question.answerIndex) this.correctAnswers++;
    this.questionIndex++;
    if (this.questionIndex < this.quiz!.questions.length) this.renderQuestion(); else void this.finish();
  }

  private async finish(): Promise<void> {
    const quiz = this.quiz!;
    const session = loadStudentSession();
    this.content?.destroy(true);
    const score = `${this.correctAnswers} / ${quiz.questions.length}`;
    this.showMessage(`Great learning!\nYou scored ${score}.\n\nYour progress has been saved.`, () => this.scene.restart());
    if (!session || session.demo) return;
    try {
      await studentApi(`/students/${session.student.id}/quiz-attempts`, "POST", { subject: quiz.subject, grade: quiz.grade, quizId: quiz.id, standardCode: quiz.questions.map((question) => question.standardCode).join(", "), correctAnswers: this.correctAnswers, questionCount: quiz.questions.length, durationMs: Date.now() - this.startedAt });
    } catch { /* The player can keep learning if the server temporarily disconnects. */ }
  }

  private showMessage(message: string, action?: () => void): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 840, 440, NEON.panel).setStrokeStyle(5, NEON.purple);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 45, message, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "37px", fontStyle: "bold", color: NEON.ink, align: "center", lineSpacing: 18 }).setOrigin(0.5);
    if (action) {
      const button = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 145, 270, 66, NEON.cyan).setStrokeStyle(3, 0xffffff, 0.8).setInteractive({ useHandCursor: true });
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 145, "NEXT QUIZ", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "24px", fontStyle: "bold", color: "#090610" }).setOrigin(0.5);
      button.on("pointerup", action);
    }
  }

  private async showProgress(): Promise<void> {
    const session = loadStudentSession();
    if (!session) return;
    if (session.demo) {
      this.showMessage("DEMO MODE\n\nAll grades and subjects are unlocked.\nDemo activity is not saved.");
      return;
    }
    try {
      const progress = await studentApi<{ summary: { completedQuizzes: number; accuracy: number | null; masteredSightWords: number } }>(`/students/${session.student.id}/progress`);
      const panel = this.add.container(0, 0).setDepth(20);
      const close = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 155, 150, 44, NEON.cyan).setInteractive({ useHandCursor: true });
      close.on("pointerup", () => panel.destroy(true));
      panel.add([
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 610, 340, NEON.panel).setStrokeStyle(4, NEON.purple),
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15, `MY PROGRESS\n\nQuizzes completed: ${progress.summary.completedQuizzes}\nQuiz accuracy: ${progress.summary.accuracy === null ? "Not scored yet" : `${progress.summary.accuracy}%`}\nMastered sight words: ${progress.summary.masteredSightWords}`, { fontFamily: "Trebuchet MS", fontSize: "27px", color: NEON.ink, align: "center", lineSpacing: 9 }).setOrigin(0.5),
        close,
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 155, "CLOSE", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "20px", color: "#090610", fontStyle: "bold" }).setOrigin(0.5)
      ]);
    } catch {
      this.showMessage("Progress will appear here once the learning server is available.");
    }
  }
}
