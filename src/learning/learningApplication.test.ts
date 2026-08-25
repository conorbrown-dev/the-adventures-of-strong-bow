import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveStudentSession } from "../game/utils/studentSession";
import { learningApplication, type SessionView } from "./learningApplication";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}

const question = { schemaVersion: 1, id: "question", templateId: "template", templateVersion: 1, standardIds: ["K.CC.A.1"], responseType: "singleChoice", prompt: { text: "Question", audioText: "Question", instructions: "Choose." }, interaction: {}, explanation: "Explanation", accessibility: { spokenPrompt: "Question", textAlternative: "Question" } };
const session = { sessionId: "session-1", position: 0, length: 10, question } as SessionView;

describe("learningApplication authentication", () => {
  beforeEach(() => vi.stubGlobal("localStorage", createStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("starts Learning with the bearer token and no caller-supplied learner ID", async () => {
    saveStudentSession({ token: "student-token", student: { id: "student-1", username: "Molly", grade: "K", subjects: ["MATH"] } });
    const fetch = vi.fn().mockResolvedValue(Response.json(session));
    vi.stubGlobal("fetch", fetch);

    await learningApplication.start("practice", undefined, "K", "MATH");

    const [url, options] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/curriculum/learning/sessions");
    expect(options.headers).toEqual(expect.objectContaining({ Authorization: "Bearer student-token" }));
    expect(JSON.parse(String(options.body))).toEqual({ purpose: "practice", grade: "K", subject: "MATH" });
  });

  it("does not allow Demo Mode to start tracked Learning", async () => {
    saveStudentSession({ demo: true, token: "demo-mode", student: { id: "demo-player", username: "Demo", grade: "K", subjects: ["MATH"] } });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(learningApplication.start("practice", undefined, "K", "MATH")).rejects.toThrow("Sign in with a student account");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the authenticated progress endpoint without a learner ID in the URL", async () => {
    saveStudentSession({ token: "student-token", student: { id: "student-1", username: "Molly", grade: "K", subjects: ["MATH"] } });
    const fetch = vi.fn().mockResolvedValue(Response.json({ attempts: [], mastery: [], latestDiagnosticPlacement: null, latestAssessmentSessionId: null }));
    vi.stubGlobal("fetch", fetch);

    await learningApplication.progress();
    expect(fetch.mock.calls[0]?.[0]).toContain("/curriculum/learning/progress");
    expect(fetch.mock.calls[0]?.[0]).not.toContain("student-1");
  });
});
