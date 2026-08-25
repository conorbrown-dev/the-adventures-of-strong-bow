import type { Clock, DiagnosticPlacement } from "../domain/progress";
import type { QuestionTemplate } from "../domain/question-template";

export interface DiagnosticProbe { standardId: string; grade: string; correct: boolean; independent: boolean; }
export interface DiagnosticProfile { grouping: string; placedGrade: string; learningTargetIds: string[]; }
const grades = ["K", "1", "2", "3", "4", "5"];

const diagnosticDomain = (template: QuestionTemplate): string => template.primaryStandardId.split(".")[1] ?? template.primaryStandardId;

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length < 2) return items;
  const normalizedOffset = offset % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
}

/** Selects a deterministic stage that samples different domains before repeating one. */
export function selectDiagnosticStageTemplates(templates: QuestionTemplate[], seed: number, limit = 6): QuestionTemplate[] {
  const uniqueTemplates = [...new Map(templates.map((template) => [template.id, template])).values()];
  const templatesByDomain = new Map<string, QuestionTemplate[]>();
  for (const template of uniqueTemplates) {
    const domain = diagnosticDomain(template);
    templatesByDomain.set(domain, [...(templatesByDomain.get(domain) ?? []), template]);
  }

  const domains = rotate([...templatesByDomain.keys()].sort(), seed % Math.max(templatesByDomain.size, 1));
  const queues = domains.map((domain, domainIndex) => {
    const domainTemplates = templatesByDomain.get(domain) ?? [];
    return rotate(domainTemplates, (seed + domainIndex) % Math.max(domainTemplates.length, 1));
  });
  const selected: QuestionTemplate[] = [];
  for (let round = 0; selected.length < limit; round += 1) {
    let addedInRound = false;
    for (const queue of queues) {
      const template = queue[round];
      if (!template) continue;
      selected.push(template);
      addedInRound = true;
      if (selected.length === limit) break;
    }
    if (!addedInRound) break;
  }
  return selected;
}

export function evaluateDiagnostic(grouping: string, probes: DiagnosticProbe[]): DiagnosticProfile {
  const independentProbes = probes.filter((probe) => probe.independent);
  const byGrade = new Map<string, DiagnosticProbe[]>(); independentProbes.forEach((probe) => byGrade.set(probe.grade, [...(byGrade.get(probe.grade) ?? []), probe]));
  const assessedGrades = grades.filter((grade) => byGrade.has(grade));
  let placedGrade = assessedGrades[0] ?? "K";
  for (const grade of assessedGrades) {
    const attempts = byGrade.get(grade) ?? [];
    if (attempts.length < 4) break;
    const firstFour = attempts.slice(0, 4);
    const correct = firstFour.filter((probe) => probe.correct).length;
    if (correct >= 3) {
      placedGrade = grade;
      continue;
    }
    if (correct <= 1) break;
    const tieBreak = attempts.slice(4, 6);
    if (tieBreak.length === 2 && tieBreak.every((probe) => probe.correct)) {
      placedGrade = grade;
      continue;
    }
    break;
  }
  const learningTargetIds = [...new Set(independentProbes.filter((probe) => !probe.correct).map((probe) => probe.standardId))];
  return { grouping, placedGrade, learningTargetIds };
}
export function diagnosticPlacement(learnerId: string, profile: DiagnosticProfile, clock: Clock): DiagnosticPlacement { return { learnerId, grouping: profile.grouping, grade: profile.placedGrade, learningTargetIds: profile.learningTargetIds, completedAt: clock.now() }; }
