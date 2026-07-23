import { Module } from "@nestjs/common";
import { StudentsController } from "./interfaces/students.controller";
import { StudentsService } from "./application/students.service";

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
