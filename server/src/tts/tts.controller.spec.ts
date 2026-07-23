import { BadRequestException } from "@nestjs/common";
import { TtsController } from "./tts.controller";

describe("TtsController", () => {
  it("sends trimmed Piper audio with cache headers", async () => {
    const synthesize = jest.fn().mockResolvedValue(Buffer.from("wav"));
    const response = { setHeader: jest.fn(), send: jest.fn() } as any;
    await new TtsController({ synthesize } as any).synthesize({ text: " hello " }, response);
    expect(synthesize).toHaveBeenCalledWith("hello");
    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "audio/wav");
    expect(response.send).toHaveBeenCalledWith(Buffer.from("wav"));
  });

  it("rejects blank and oversized synthesis requests before Piper runs", async () => {
    const synthesize = jest.fn();
    const controller = new TtsController({ synthesize } as any);
    await expect(controller.synthesize({ text: " " }, {} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.synthesize({ text: "a".repeat(1001) }, {} as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(synthesize).not.toHaveBeenCalled();
  });
});
