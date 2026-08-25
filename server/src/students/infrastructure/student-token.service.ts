import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export type AuthenticatedStudent = { studentId: string; username: string };

function tokenSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET is required in production.");
  return "development-secret";
}

@Injectable()
export class StudentTokenService {
  private readonly jwt = new JwtService({ secret: tokenSecret(), signOptions: { expiresIn: "12h" } });

  issue(studentId: string, username: string): string {
    return this.jwt.sign({ sub: studentId, username });
  }

  verify(token: string): AuthenticatedStudent {
    const payload = this.jwt.verify<{ sub?: unknown; username?: unknown }>(token);
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.username !== "string" || !payload.username) throw new Error("Student token is missing required identity claims.");
    return { studentId: payload.sub, username: payload.username };
  }
}
