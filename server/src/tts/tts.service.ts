import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

@Injectable()
export class TtsService {
  private readonly cache = new Map<string, Buffer>();

  async synthesize(text: string): Promise<Buffer> {
    const cached = this.cache.get(text);
    if (cached) return cached;

    const model = process.env.PIPER_MODEL_PATH ?? "/app/en_US-hfc_female-medium.onnx";
    const command = process.env.PIPER_COMMAND ?? "piper";
    const directory = await mkdtemp(join(tmpdir(), "molly-tts-"));
    const output = join(directory, "speech.wav");
    try {
      await new Promise<void>((resolve, reject) => {
        const process = spawn(command, ["--model", model, "--output_file", output], { stdio: ["pipe", "ignore", "pipe"] });
        let errorOutput = "";
        process.stderr.on("data", (chunk: Buffer) => { errorOutput += chunk.toString(); });
        process.once("error", reject);
        process.once("close", (code) => code === 0 ? resolve() : reject(new Error(errorOutput || `Piper exited with code ${code}`)));
        process.stdin.end(text);
      });
      const audio = await readFile(output);
      const oldest = this.cache.keys().next().value;
      if (this.cache.size >= 100 && oldest) this.cache.delete(oldest);
      this.cache.set(text, audio);
      return audio;
    } catch {
      throw new ServiceUnavailableException("Natural speech is not available.");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
