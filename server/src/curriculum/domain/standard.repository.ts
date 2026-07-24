import type { Standard } from "./standard";

export interface StandardRepository {
  upsert(standard: Standard): Promise<void>;
  findByOfficialId(officialId: string): Promise<Standard | null>;
  count(): Promise<number>;
  countByGradeAndSubject(): Promise<Record<string, number>>;
  listQuizTargets(): Promise<Standard[]>;
}
