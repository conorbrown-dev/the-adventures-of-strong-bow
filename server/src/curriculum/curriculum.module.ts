import { Module } from "@nestjs/common";
import { PrismaStandardRepository } from "./infrastructure/prisma-standard.repository";
import { PrismaProgressRepository } from "./infrastructure/prisma-progress.repository";
import { CURRICULUM_PROCTOR_CODE, LearningFacadeService } from "./application/learning-facade.service";
import { LearningController } from "./interfaces/learning.controller";

@Module({ controllers: [LearningController], providers: [PrismaStandardRepository, PrismaProgressRepository, { provide: CURRICULUM_PROCTOR_CODE, useFactory: () => process.env.CURRICULUM_PROCTOR_CODE }, LearningFacadeService], exports: [PrismaStandardRepository, PrismaProgressRepository] })
export class CurriculumModule {}
