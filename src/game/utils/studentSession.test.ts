import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadStudentSession, saveStudentSession, studentApi } from "./studentSession";

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

describe("studentApi", () => {
  beforeEach(() => vi.stubGlobal("localStorage", createStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("turns a network failure into a useful offline message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(studentApi("/status")).rejects.toThrow("The learning server is unavailable.");
  });

  it("reports a server error even when the response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } })));

    await expect(studentApi("/status")).rejects.toThrow("The learning service is temporarily unavailable.");
  });

  it("rejects a successful response that does not contain JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } })));

    await expect(studentApi("/status")).rejects.toThrow("The learning server is unavailable.");
  });

  it("uses validation messages from JSON error responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: ["Username is required.", "PIN must have four digits."] }, { status: 400 })));

    await expect(studentApi("/students", "POST", {})).rejects.toThrow("Username is required. PIN must have four digits.");
  });

  it("clears an invalid login session when the API returns unauthorized", async () => {
    saveStudentSession({ token: "expired-token", student: { id: "student-1", username: "Molly", grade: "K", subjects: ["MATH"] } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Unauthorized" }, { status: 401 })));

    await expect(studentApi("/curriculum/learning/progress")).rejects.toThrow("invalid or expired");
    expect(loadStudentSession()).toBeNull();
  });

  it("preserves the useful credential error from a failed login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "The username or PIN is incorrect." }, { status: 401 })));

    await expect(studentApi("/auth/login", "POST", { username: "Molly", pin: "0000" })).rejects.toThrow("The username or PIN is incorrect.");
  });
});
