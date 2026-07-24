import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { StudentsModule } from "./students/students.module";
import { TtsModule } from "./tts/tts.module";
import { CurriculumModule } from "./curriculum/curriculum.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StudentsModule,
    TtsModule,
    CurriculumModule,
  ],
})
export class AppModule {}
