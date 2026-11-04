import { describe, expect, test } from "bun:test";
import { formatDetailMarkdown, translationKey } from "../detail";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../languages";
import { languagePair } from "../target";

describe("formatDetailMarkdown", () => {
  test("shows the translation first and the original quoted below with its source", () => {
    expect(formatDetailMarkdown("Hello\nthere", "Halo\nsemua", "From selection")).toBe(
      "Hello\nthere\n\n---\n\n**Original** · From selection\n\n> Halo\n> semua",
    );
  });

  test("omits the source when it is unknown", () => {
    expect(formatDetailMarkdown("Hello", "Halo", undefined)).toBe(
      "Hello\n\n---\n\n**Original**\n\n> Halo",
    );
  });

  test("shows a placeholder while nothing has arrived yet", () => {
    expect(formatDetailMarkdown("", "Halo", undefined)).toBe(
      "_Translating…_\n\n---\n\n**Original**\n\n> Halo",
    );
  });
});

describe("translationKey", () => {
  const pair = languagePair(DEFAULT_LANGUAGE, resolveLanguage("id", DEFAULT_LANGUAGE));

  test("is the same for the same text, target, and tone", () => {
    expect(translationKey(" Halo ", pair, "email")).toBe(translationKey("Halo", pair, "email"));
  });

  test.each([
    ["text", translationKey("Halo!", pair, "email")],
    ["tone", translationKey("Halo", pair, "chat")],
    ["target", translationKey("Halo", { kind: "fixed", language: DEFAULT_LANGUAGE }, "email")],
  ])("changes with the %s", (_label, other) => {
    expect(other).not.toBe(translationKey("Halo", pair, "email"));
  });
});
