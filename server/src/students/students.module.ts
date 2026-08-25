import { Module } from "@nestjs/common";
import { StudentsController } from "./interfaces/students.controller";
import { StudentsService } from "./application/students.service";
import { StudentTokenService } from "./infrastructure/student-token.service";
import { StudentAuthGuard } from "./interfaces/student-auth.guard";

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentTokenService, StudentAuthGuard],
  exports: [StudentsService, StudentTokenService, StudentAuthGuard],
})
export class StudentsModule {}
