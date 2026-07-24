import { Module } from "@nestjs/common";
import { PrismaStandardRepository } from "./infrastructure/prisma-standard.repository";

@Module({ providers: [PrismaStandardRepository], exports: [PrismaStandardRepository] })
export class CurriculumModule {}
