import type { StandardRepository } from "../domain/standard.repository";
import { isQuizTarget } from "../domain/standard";
import { loadAndValidateVendoredStandards, type CurriculumPaths } from "../infrastructure/vendored-standards.validator";

export interface StandardsImportResult {
  imported: number;
  quizTargets: number;
  countsByGradeAndSubject: Record<string, number>;
  copyrightNotice: string;
}

/** Imports the immutable vendored source using repository upserts for safe reruns. */
export async function importVendoredStandards(repository: StandardRepository, paths?: CurriculumPaths): Promise<StandardsImportResult> {
  const dataset = await loadAndValidateVendoredStandards(paths);
  for (const standard of dataset.records) await repository.upsert(standard);

  return {
    imported: dataset.records.length,
    quizTargets: dataset.records.filter(isQuizTarget).length,
    countsByGradeAndSubject: countByGradeAndSubject(dataset.records),
    copyrightNotice: dataset.copyrightNotice
  };
}

function countByGradeAndSubject(records: Array<{ subject: string; grade: string }>): Record<string, number> {
  return records.reduce<Record<string, number>>((counts, record) => {
    const key = `${record.subject}:${record.grade}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
