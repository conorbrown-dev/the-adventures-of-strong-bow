import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Inject,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
    UseInterceptors
} from "@nestjs/common"

import { StudentsService } from "../application/students.service";

import {
    CreateStudentDto
} from "./dtos"
import { DmAuthGuard } from "./dm-auth.guard";

@Controller()
export class StudentsController {
    constructor(
        @Inject(StudentsService) private readonly students: StudentsService,
    ) {}

    @Post("students")
    createStudent(@Body() dto: CreateStudentDto) {
        return this.students.createStudent(dto)
    }
}
