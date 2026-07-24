import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { StandardRepository } from "../domain/standard.repository";
import type { Standard } from "../domain/standard";

@Injectable()
export class PrismaStandardRepository implements StandardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(standard: Standard): Promise<void> {
    const data = toPersistence(standard);
    await this.prisma.curriculumStandard.upsert({ where: { officialId: standard.officialId }, create: data, update: data });
  }

  async findByOfficialId(officialId: string): Promise<Standard | null> {
    const row = await this.prisma.curriculumStandard.findUnique({ where: { officialId } });
    return row ? fromPersistence(row) : null;
  }

  async count(): Promise<number> { return this.prisma.curriculumStandard.count(); }

  async countByGradeAndSubject(): Promise<Record<string, number>> {
    const groups = await this.prisma.curriculumStandard.groupBy({ by: ["subject", "grade"], _count: { _all: true } });
    return Object.fromEntries(groups.map((group) => [`${group.subject}:${group.grade}`, group._count._all]));
  }

  async listQuizTargets(): Promise<Standard[]> {
    const rows = await this.prisma.curriculumStandard.findMany({ where: { active: true, isLeaf: true, instructionalStatus: "assessable" } });
    return rows.map(fromPersistence);
  }
}

function toPersistence(standard: Standard): Prisma.CurriculumStandardUncheckedCreateInput {
  const { schemaVersion, ...data } = standard;
  void schemaVersion;
  return {
    ...data,
    prerequisiteIds: standard.prerequisiteIds,
    tags: standard.tags,
    source: standard.source as unknown as Prisma.InputJsonValue,
    license: standard.license as unknown as Prisma.InputJsonValue
  };
}

function fromPersistence(row: Prisma.CurriculumStandardGetPayload<Record<string, never>>): Standard {
  return {
    schemaVersion: 1,
    officialId: row.officialId,
    canonicalId: row.canonicalId,
    subject: row.subject as Standard["subject"],
    grade: row.grade as Standard["grade"],
    gradeName: row.gradeName,
    domainCode: row.domainCode,
    domain: row.domain,
    strand: row.strand,
    clusterCode: row.clusterCode,
    parentId: row.parentId,
    sourceItem: row.sourceItem,
    statement: row.statement,
    childFriendlyDescription: row.childFriendlyDescription,
    isLeaf: row.isLeaf,
    instructionalStatus: row.instructionalStatus as Standard["instructionalStatus"],
    prerequisiteIds: row.prerequisiteIds as string[],
    tags: row.tags as string[],
    source: row.source as unknown as Standard["source"],
    license: row.license as unknown as Standard["license"],
    active: row.active
  };
}
