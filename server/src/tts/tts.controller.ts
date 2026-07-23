import { BadRequestException, Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { TtsService } from "./tts.service";

@Controller("tts")
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  @Post()
  async synthesize(@Body() body: { text?: unknown }, @Res() response: Response): Promise<void> {
    if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 1_000) {
      throw new BadRequestException("text must be between 1 and 1000 characters");
    }
    const audio = await this.tts.synthesize(body.text.trim());
    response.setHeader("Content-Type", "audio/wav");
    response.setHeader("Cache-Control", "private, max-age=86400");
    response.send(audio);
  }
}
