import type { PrismaService } from "../../prisma/prisma.service";
import { PrismaProgressRepository } from "./prisma-progress.repository";

describe("PrismaProgressRepository", () => {
  it("keeps mutable learning-target data out of the compound unique selector", async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = { curriculumLearningTarget: { upsert } } as unknown as PrismaService;
    const repository = new PrismaProgressRepository(prisma);
    const target = { learnerId: "learner-1", standardId: "1.L.6", active: true };

    await repository.saveLearningTarget(target);

    expect(upsert).toHaveBeenCalledWith({
      where: { learnerId_standardId: { learnerId: "learner-1", standardId: "1.L.6" } },
      create: target,
      update: { active: true }
    });
  });
});
