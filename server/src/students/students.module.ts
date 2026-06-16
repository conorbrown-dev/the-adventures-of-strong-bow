import { Module } from "@nestjs/common";
import { StudentsController } from "./interfaces/students.controller";
import { StudentsService } from "./application/students.service";
import { DmAuthGuard } from "./interfaces/dm-auth.guard";

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, DmAuthGuard],
  exports: [StudentsService],
})
export class StudentsModule {}