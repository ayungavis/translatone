import { describe, expect, test } from "bun:test";
import { emptyViewContent, formatDetailMarkdown, translationKey } from "../detail";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../languages";
import { languagePair } from "../target";

describe("formatDetailMarkdown", () => {
  test("shows the translation first and the original quoted below with its source", () => {
    expect(
      formatDetailMarkdown({
        translation: "Hello\nthere",
        original: "Halo\nsemua",
        sourceLabel: "From selection",
        failed: false,
      }),
    ).toBe("Hello\nthere\n\n---\n\n**Original** · From selection\n\n> Halo\n> semua");
  });

  test("omits the source when it is unknown", () => {
    expect(
      formatDetailMarkdown({
        translation: "Hello",
        original: "Halo",
        sourceLabel: undefined,
        failed: false,
      }),
    ).toBe("Hello\n\n---\n\n**Original**\n\n> Halo");
  });

  test("shows a placeholder while nothing has arrived yet", () => {
    expect(
      formatDetailMarkdown({
        translation: "",
        original: "Halo",
        sourceLabel: undefined,
        failed: false,
      }),
    ).toBe("_Translating…_\n\n---\n\n**Original**\n\n> Halo");
  });

  test("explains how to recover when the translation failed", () => {
    expect(
      formatDetailMarkdown({
        translation: "",
        original: "Halo",
        sourceLabel: undefined,
        failed: true,
      }),
    ).toBe(
      "**Couldn't translate this text.** Press ⌘R to retry, or ⌘K for more actions.\n\n---\n\n**Original**\n\n> Halo",
    );
  });
});

describe("emptyViewContent", () => {
  test("asks for a provider when none is configured", () => {
    expect(emptyViewContent(0, "ignored")).toEqual({
      needsSetup: true,
      title: "Add a provider to start",
      description:
        "TranslaTone needs your own OpenAI, Anthropic, OpenRouter, or custom key, a free Groq or Gemini key, or Ollama running on this Mac. Press ↵ to open preferences.",
    });
  });

  test("explains how to start and shows provider usage", () => {
    expect(emptyViewContent(2, "Groq: 3 / 1,000 today\nGemini: 0 / 250 today")).toEqual({
      needsSetup: false,
      title: "Translate anything with the right tone",
      description:
        "Select text in any app before opening TranslaTone, or type here. Pick a tone with ↑↓ and press ↵ to paste.\n\nGroq: 3 / 1,000 today\nGemini: 0 / 250 today",
    });
  });

  test("leaves out usage until it has loaded", () => {
    expect(emptyViewContent(1, undefined).description).toBe(
      "Select text in any app before opening TranslaTone, or type here. Pick a tone with ↑↓ and press ↵ to paste.",
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
