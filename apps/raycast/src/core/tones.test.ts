import { describe, expect, test } from "bun:test";
import { buildSystemPrompt, isToneId, TONE_IDS, TONES } from "./tones";

describe("tones", () => {
  test("every tone id has a matching definition", () => {
    for (const id of TONE_IDS) {
      expect(TONES[id].id).toBe(id);
    }
  });

  test("recognises only known tone ids", () => {
    expect(isToneId("linkedin")).toBe(true);
    expect(isToneId("pirate")).toBe(false);
  });

  test("builds a prompt with the target language and tone instruction", () => {
    const prompt = buildSystemPrompt("email", "Indonesian");

    expect(prompt).toContain("into Indonesian");
    expect(prompt).toContain(TONES.email.instruction);
  });
});
