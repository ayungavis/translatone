import { describe, expect, test } from "bun:test";
import { buildSystemPrompt, isToneId, resolveTone, TONE_IDS, TONES } from "../tones";

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

  test("resolves a known tone id and falls back for anything else", () => {
    expect(resolveTone("chat", "email")).toBe("chat");
    expect(resolveTone("pirate", "email")).toBe("email");
    expect(resolveTone(undefined, "email")).toBe("email");
  });

  test("builds a prompt with the target language and tone instruction", () => {
    const prompt = buildSystemPrompt("email", "Indonesian");

    expect(prompt).toContain("into Indonesian");
    expect(prompt).toContain(TONES.email.instruction);
  });
});

describe("meaning preservation", () => {
  test.each(TONE_IDS)("the %s prompt forbids adding, dropping, or inventing facts", (tone) => {
    const prompt = buildSystemPrompt(tone, "English");

    expect(prompt).toContain("Keep the meaning exactly");
    expect(prompt).toContain("never add, remove, or invent facts, details, or commitments");
    expect(prompt).toContain("The tone changes the wording, never the meaning");
  });

  test.each(TONE_IDS)("the %s prompt copies exact tokens unchanged", (tone) => {
    const prompt = buildSystemPrompt(tone, "English");

    for (const token of [
      "names",
      "numbers",
      "dates",
      "prices",
      "URLs",
      "email addresses",
      "@mentions",
      "#hashtags",
      "code",
    ]) {
      expect(prompt).toContain(token);
    }
    expect(prompt).toContain("exactly as written");
  });

  test.each(TONE_IDS)("the %s prompt keeps emojis, line breaks, lists, and links", (tone) => {
    expect(buildSystemPrompt(tone, "English")).toContain(
      "Keep existing emojis, line breaks, lists, and Markdown links",
    );
  });
});
