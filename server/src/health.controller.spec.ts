import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma/prisma.service";

describe("HealthController", () => {
  const query = jest.fn();
  const controller = new HealthController({ $queryRaw: query } as unknown as PrismaService);

  it("reports ready when the database responds", async () => {
    query.mockResolvedValueOnce([{ "?column?": 1 }]);
    await expect(controller.readiness()).resolves.toEqual({ status: "ok" });
  });

  it("reports unavailable without exposing database errors", async () => {
    query.mockRejectedValueOnce(new Error("private connection details"));
    await expect(controller.readiness()).rejects.toThrow(
      new ServiceUnavailableException("The learning database is unavailable.")
    );
  });
});
