import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import { StudentTokenService, type AuthenticatedStudent } from "../infrastructure/student-token.service";

type AuthenticatedRequest = Request & { student?: AuthenticatedStudent };

@Injectable()
export class StudentAuthGuard implements CanActivate {
  constructor(private readonly tokens: StudentTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token, extra] = authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token || extra) throw new UnauthorizedException("Sign in to continue and save student progress.");
    try {
      request.student = this.tokens.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException("Your session is invalid or expired. Sign in again.");
    }
  }
}

export const CurrentStudent = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedStudent => {
  const student = context.switchToHttp().getRequest<AuthenticatedRequest>().student;
  if (!student) throw new UnauthorizedException("Sign in to continue and save student progress.");
  return student;
});
