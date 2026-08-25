import { StudentTokenService } from "./student-token.service";

describe("StudentTokenService", () => {
  it("issues a signed, expiring token with the student identity", () => {
    const service = new StudentTokenService();
    const token = service.issue("student-1", "molly");
    expect(service.verify(token)).toEqual({ studentId: "student-1", username: "molly" });
  });

  it("rejects a token that was not issued by the application", () => {
    const service = new StudentTokenService();
    expect(() => service.verify("not-a-token")).toThrow();
  });

  it("refuses to use the development secret in production", () => {
    const previousEnvironment = process.env.NODE_ENV;
    const previousSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      expect(() => new StudentTokenService()).toThrow("JWT_SECRET is required in production");
    } finally {
      process.env.NODE_ENV = previousEnvironment;
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
    }
  });
});
