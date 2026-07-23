import Phaser from "phaser";
import { CurriculumGrade, CurriculumSubject, gradeLabel } from "../data/commonCoreQuizzes";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { saveStudentSession, studentApi, type StudentSession } from "../utils/studentSession";

type Mode = "login" | "create";
const GRADES: CurriculumGrade[] = ["K", "GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5"];
const NEON = { cyan: 0x45f6e5, purple: 0xc681ff, pink: 0xff70b8, panel: 0x130d25, ink: "#f7f2ff", muted: "#c5b5df" };

export class StudentLoginScene extends Phaser.Scene {
  private username = "";
  private pin = "";
  private activeField: "username" | "pin" = "username";
  private mode: Mode = "login";
  private grade: CurriculumGrade = "K";
  private subjects: CurriculumSubject[] = ["ELA", "MATH"];
  private formText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private busy = false;

  constructor() { super(SCENE_KEYS.STUDENT_LOGIN); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x05030b);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05030b);
    for (let index = 0; index < 85; index++) this.add.circle(Phaser.Math.Between(10, GAME_WIDTH - 10), Phaser.Math.Between(10, GAME_HEIGHT - 10), Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.12, 0.45));
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 780, 620, NEON.panel, 0.98).setStrokeStyle(4, NEON.purple);
    this.add.text(GAME_WIDTH / 2, 165, "STUDENT ACCESS", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "52px", fontStyle: "bold", color: "#ffffff", letterSpacing: 3 }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 218, "Use your existing username and four-digit PIN.", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "23px", color: NEON.muted }).setOrigin(0.5);
    this.formText = this.add.text(GAME_WIDTH / 2, 335, "", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "30px", color: NEON.ink, align: "center", lineSpacing: 16 }).setOrigin(0.5);
    this.messageText = this.add.text(GAME_WIDTH / 2, 570, "", { fontFamily: "Trebuchet MS", fontSize: "21px", color: "#ff70b8", align: "center", wordWrap: { width: 650 } }).setOrigin(0.5);

    this.button(260, 475, "Sign In", () => void this.submit());
    this.button(460, 475, "New Student", () => this.toggleMode());
    this.button(660, 475, "Demo Mode", () => this.startDemo());
    this.button(860, 475, "Back", () => this.scene.start(SCENE_KEYS.TITLE));
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off("keydown", this.handleKey, this));
    this.renderForm();
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.busy) return;
    if (event.key === "Tab") { this.activeField = this.activeField === "username" ? "pin" : "username"; this.renderForm(); return; }
    if (event.key === "Enter") { void this.submit(); return; }
    if (event.key === "Escape") { this.scene.start(SCENE_KEYS.TITLE); return; }
    if (this.mode === "create" && event.key === "ArrowLeft") { this.grade = GRADES[(GRADES.indexOf(this.grade) + GRADES.length - 1) % GRADES.length]; this.renderForm(); return; }
    if (this.mode === "create" && event.key === "ArrowRight") { this.grade = GRADES[(GRADES.indexOf(this.grade) + 1) % GRADES.length]; this.renderForm(); return; }
    if (this.mode === "create" && event.key.toLowerCase() === "e") { this.toggleSubject("ELA"); return; }
    if (this.mode === "create" && event.key.toLowerCase() === "m") { this.toggleSubject("MATH"); return; }
    if (event.key === "Backspace") { if (this.activeField === "username") this.username = this.username.slice(0, -1); else this.pin = this.pin.slice(0, -1); this.renderForm(); return; }
    if (this.activeField === "username" && /^[a-zA-Z0-9 _-]$/.test(event.key) && this.username.length < 24) this.username += event.key;
    if (this.activeField === "pin" && /^\d$/.test(event.key) && this.pin.length < 4) this.pin += event.key;
    this.renderForm();
  }

  private renderForm(): void {
    const usernameCursor = this.activeField === "username" ? " ◀" : "";
    const pinCursor = this.activeField === "pin" ? " ◀" : "";
    const createHelp = this.mode === "create" ? `\n\nAssigned grade: ${gradeLabel(this.grade)}  (use ← →)\nSubjects: ${this.subjects.join(" + ")}  (press E or M to toggle)` : "";
    this.formText?.setText(`Username:  ${this.username || "________________"}${usernameCursor}\nPIN:  ${this.pin ? "•".repeat(this.pin.length) : "____"}${pinCursor}${createHelp}`);
  }

  private toggleSubject(subject: CurriculumSubject): void {
    if (this.subjects.includes(subject)) {
      if (this.subjects.length === 1) { this.messageText?.setColor("#ff70b8").setText("Assign at least one subject."); return; }
      this.subjects = this.subjects.filter((item) => item !== subject);
    } else this.subjects = [...this.subjects, subject];
    this.renderForm();
  }

  private toggleMode(): void {
    this.mode = this.mode === "login" ? "create" : "login";
    this.messageText?.setColor(NEON.muted).setText(this.mode === "create" ? "Create a new student. Grade can be changed with the arrow keys." : "Sign in to continue learning.");
    this.renderForm();
  }

  private async submit(): Promise<void> {
    if (!this.username.trim() || !/^\d{4}$/.test(this.pin)) { this.messageText?.setColor("#ff70b8").setText("Enter a username and exactly four PIN digits."); return; }
    this.busy = true;
    this.messageText?.setColor(NEON.muted).setText("Connecting to the learning server…");
    try {
      const session = await studentApi<StudentSession>(this.mode === "login" ? "/auth/login" : "/students", "POST", this.mode === "login" ? { username: this.username.trim(), pin: this.pin } : { username: this.username.trim(), pin: this.pin, grade: this.grade, subjects: this.subjects });
      saveStudentSession(session);
      this.scene.start(SCENE_KEYS.CURRICULUM_QUIZ);
    } catch (error) { this.messageText?.setColor("#ff70b8").setText(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { this.busy = false; }
  }

  private startDemo(): void {
    saveStudentSession({
      demo: true,
      token: "demo-mode",
      student: { id: "demo-player", username: "Demo Player", grade: "K", subjects: ["ELA", "MATH"] }
    });
    this.scene.start(SCENE_KEYS.CURRICULUM_QUIZ);
  }

  private button(x: number, y: number, label: string, action: () => void): void {
    const isBack = label === "Back";
    const color = isBack ? NEON.pink : NEON.cyan;
    const rect = this.add.rectangle(x, y, 170, 58, 0x1b1430).setStrokeStyle(3, color).setInteractive({ useHandCursor: true });
    rect.on("pointerover", () => rect.setFillStyle(color, 0.55));
    rect.on("pointerout", () => rect.setFillStyle(0x1b1430));
    this.add.text(x, y, label.toUpperCase(), { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5);
    rect.on("pointerup", action);
  }
}
