import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateContentPack, type ResponsesLikeClient } from "./openai";

describe("OpenAI content generation", () => {
  it("rejects malformed structured output", async () => {
    const client: ResponsesLikeClient = {
      responses: {
        async create() {
          return { output_text: JSON.stringify({ rows: {} }) };
        }
      }
    };

    await assert.rejects(
      () =>
        generateContentPack(
          { theme: { name: "Bad" } },
          {
            cwd: process.cwd(),
            projectRef: "toogirtxlnsbtvmqcqgw",
            openAiApiKey: "test-key",
            model: "gpt-5.5",
            runDir: ".tools/test"
          },
          client
        ),
      /theme/
    );
  });
});
