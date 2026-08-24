import type { MasteryRecord } from "../domain/progress";
import type { QuestionTemplate } from "../domain/question-template";

const NEXT_STANDARD_WINDOW = 4;

const mathDomains = ["CC", "N", "OA", "A", "NBT", "MD", "GM", "G", "D"];
const elaDomains = ["RF", "2", "1", "3", "L", "4", "RI", "RL", "5", "W", "SL", "6", "7", "8"];

function domainRank(template: QuestionTemplate): number {
  const domain = template.primaryStandardId.split(".")[1] ?? "";
  const domains = template.subject === "math" ? mathDomains : template.subject === "ela" ? elaDomains : [];
  const rank = domains.indexOf(domain);
  return rank === -1 ? domains.length : rank;
}

function courseOrder(template: QuestionTemplate): string {
  return `${String(domainRank(template)).padStart(2, "0")}:${template.primaryStandardId}:${template.id}`;
}

/**
 * Keeps a learner in a small, ordered group of unmastered skills. Due reviews
 * take precedence; otherwise the next standards remain predictable while their
 * individual question instances can still vary by seed.
 */
export function selectNextLearningTemplates(templates: QuestionTemplate[], mastery: MasteryRecord[], standardWindow = NEXT_STANDARD_WINDOW): QuestionTemplate[] {
  const mastered = new Set(mastery.filter((record) => record.state === "mastered").map((record) => record.standardId));
  const reviewDue = new Set(mastery.filter((record) => record.state === "reviewDue").map((record) => record.standardId));
  const unmastered = templates.filter((template) => !mastered.has(template.primaryStandardId));
  const candidates = reviewDue.size > 0 ? unmastered.filter((template) => reviewDue.has(template.primaryStandardId)) : unmastered;
  const upcomingStandards = [...new Set(candidates.sort((left, right) => courseOrder(left).localeCompare(courseOrder(right))).map((template) => template.primaryStandardId))].slice(0, standardWindow);
  const upcomingIds = new Set(upcomingStandards);
  return candidates.filter((template) => upcomingIds.has(template.primaryStandardId));
}
