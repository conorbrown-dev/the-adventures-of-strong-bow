import { describe, expect, it } from "vitest";
import { coreCourseRoadmap } from "./coreCourseRoadmaps";

describe("core course roadmaps", () => {
  it("gives each K–2 core subject a four-unit, parent-readable path", () => {
    for (const subject of ["MATH", "ELA"]) {
      for (const grade of ["K", "1", "2"] as const) {
        const roadmap = coreCourseRoadmap(subject, grade);
        expect(roadmap?.units).toHaveLength(4);
        expect(roadmap?.units.every((unit) => unit.title.length > 0 && unit.focus.length > 0)).toBe(true);
      }
    }
  });

  it("does not mislabel a non-core subject as a core course roadmap", () => {
    expect(coreCourseRoadmap("SCIENCE", "2")).toBeNull();
  });
});
