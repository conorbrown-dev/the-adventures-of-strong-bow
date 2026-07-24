import { Module } from "@nestjs/common";
import { PrismaStandardRepository } from "./infrastructure/prisma-standard.repository";
import { PrismaProgressRepository } from "./infrastructure/prisma-progress.repository";

@Module({ providers: [PrismaStandardRepository, PrismaProgressRepository], exports: [PrismaStandardRepository, PrismaProgressRepository] })
export class CurriculumModule {}
