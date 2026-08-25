import type { Clock, DiagnosticPlacement } from "../domain/progress";

export interface DiagnosticProbe { standardId: string; grade: string; correct: boolean; independent: boolean; }
export interface DiagnosticProfile { grouping: string; placedGrade: string; learningTargetIds: string[]; }
const grades = ["K", "1", "2", "3", "4", "5"];
export function evaluateDiagnostic(grouping: string, probes: DiagnosticProbe[]): DiagnosticProfile {
  const byGrade = new Map<string, DiagnosticProbe[]>(); probes.filter((probe) => probe.independent).forEach((probe) => byGrade.set(probe.grade, [...(byGrade.get(probe.grade) ?? []), probe]));
  const assessedGrades = grades.filter((grade) => byGrade.has(grade));
  let placedGrade = assessedGrades[0] ?? "K"; const gaps: string[] = [];
  for (const grade of assessedGrades) { const attempts = byGrade.get(grade) ?? []; if (attempts.length < 4) break; const firstFour = attempts.slice(0, 4); const correct = firstFour.filter((probe) => probe.correct).length; if (correct >= 3) { placedGrade = grade; continue; } if (correct <= 1) { gaps.push(...firstFour.filter((probe) => !probe.correct).map((probe) => probe.standardId)); break; } const tieBreak = attempts.slice(4, 6); if (tieBreak.length === 2 && tieBreak.every((probe) => probe.correct)) { placedGrade = grade; continue; } gaps.push(...[...firstFour, ...tieBreak].filter((probe) => !probe.correct).map((probe) => probe.standardId)); break; }
  return { grouping, placedGrade, learningTargetIds: [...new Set(gaps)] };
}
export function diagnosticPlacement(learnerId: string, profile: DiagnosticProfile, clock: Clock): DiagnosticPlacement { return { learnerId, grouping: profile.grouping, grade: profile.placedGrade, learningTargetIds: profile.learningTargetIds, completedAt: clock.now() }; }
