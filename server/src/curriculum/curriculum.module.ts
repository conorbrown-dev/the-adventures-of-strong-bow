import { Module } from "@nestjs/common";
import { PrismaStandardRepository } from "./infrastructure/prisma-standard.repository";
import { PrismaProgressRepository } from "./infrastructure/prisma-progress.repository";
import { CURRICULUM_PROCTOR_CODE, KINDERGARTEN_ELA_AUDIO_READY, KINDERGARTEN_ELA_ENABLED, LearningFacadeService } from "./application/learning-facade.service";
import { LearningController } from "./interfaces/learning.controller";
import { StudentsModule } from "../students/students.module";
import { isKindergartenAudioReady } from "./infrastructure/kindergarten-ela-catalog";

@Module({
  imports: [StudentsModule],
  controllers: [LearningController],
  providers: [
    PrismaStandardRepository,
    PrismaProgressRepository,
    { provide: CURRICULUM_PROCTOR_CODE, useFactory: () => process.env.CURRICULUM_PROCTOR_CODE },
    { provide: KINDERGARTEN_ELA_ENABLED, useFactory: () => process.env.KINDERGARTEN_ELA_VERTICAL_SLICE_ENABLED === "true" },
    {
      provide: KINDERGARTEN_ELA_AUDIO_READY,
      useFactory: () => isKindergartenAudioReady(process.env.KINDERGARTEN_ELA_ALLOW_PROVISIONAL_AUDIO === "true"),
    },
    LearningFacadeService,
  ],
  exports: [PrismaStandardRepository, PrismaProgressRepository],
})
export class CurriculumModule {}
