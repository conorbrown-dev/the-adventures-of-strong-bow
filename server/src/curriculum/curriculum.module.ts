import { Module } from "@nestjs/common";
import { PrismaStandardRepository } from "./infrastructure/prisma-standard.repository";
import { PrismaProgressRepository } from "./infrastructure/prisma-progress.repository";
import { LearningFacadeService } from "./application/learning-facade.service";
import { LearningController } from "./interfaces/learning.controller";

@Module({ controllers: [LearningController], providers: [PrismaStandardRepository, PrismaProgressRepository, LearningFacadeService], exports: [PrismaStandardRepository, PrismaProgressRepository] })
export class CurriculumModule {}
