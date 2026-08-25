import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { StudentTokenService } from "../infrastructure/student-token.service";
import { StudentAuthGuard } from "./student-auth.guard";

function context(authorization?: string): { execution: ExecutionContext; request: { headers: { authorization?: string }; student?: unknown } } {
  const request = { headers: { ...(authorization ? { authorization } : {}) } };
  return { request, execution: { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext };
}

describe("StudentAuthGuard", () => {
  it("requires a bearer token", () => {
    const guard = new StudentAuthGuard({ verify: jest.fn() } as unknown as StudentTokenService);
    expect(() => guard.canActivate(context().execution)).toThrow(UnauthorizedException);
  });

  it("attaches the verified student identity to the request", () => {
    const tokens = { verify: jest.fn().mockReturnValue({ studentId: "student-1", username: "molly" }) } as unknown as StudentTokenService;
    const guard = new StudentAuthGuard(tokens);
    const current = context("Bearer valid-token");

    expect(guard.canActivate(current.execution)).toBe(true);
    expect(tokens.verify).toHaveBeenCalledWith("valid-token");
    expect(current.request.student).toEqual({ studentId: "student-1", username: "molly" });
  });

  it("rejects invalid or expired tokens", () => {
    const tokens = { verify: jest.fn(() => { throw new Error("expired"); }) } as unknown as StudentTokenService;
    const guard = new StudentAuthGuard(tokens);
    expect(() => guard.canActivate(context("Bearer expired-token").execution)).toThrow("invalid or expired");
  });
});
