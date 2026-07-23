import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { StudentsModule } from "./students/students.module";
import { TtsModule } from "./tts/tts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StudentsModule,
    TtsModule,
  ],
})
export class AppModule {}
