import {
    Inject,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common"

import { JwtService } from "@nestjs/jwt"
import { Prisma } from "@prisma/client"
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service"

import {
    CreateStudentDto
} from "../interfaces/dtos"

@Injectable()
export class StudentsService {
    private readonly jwt = new JwtService({
        secret: process.env.JWT_SECRET ?? "development-secret",
        signOptions: { expiresIn: "12h" },
    });

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

    async createStudent(dto: CreateStudentDto) {
        const pinHash = await argon2.hash(dto.pin.toString());

        return this.prisma.student.create({
            data: {
                username: dto.username,
                pin: pinHash
            }
        })

    }
}
