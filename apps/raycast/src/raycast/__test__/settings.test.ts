import { beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../../core/languages";
import { PROVIDERS } from "../../core/providers";
import manifest from "../../../package.json";
import { loadSettings } from "../settings";
import { raycast } from "./test-helpers";

describe("loadSettings", () => {
  beforeEach(() => raycast.reset());

  test("has no providers and default choices when nothing is configured", () => {
    expect(loadSettings()).toEqual({
      providers: [],
      defaultTone: "default",
      primaryAction: "paste",
      target: {
        kind: "pair",
        main: DEFAULT_LANGUAGE,
        second: { code: "id", name: "Indonesian" },
      },
    });
  });

  test("orders providers Groq, Gemini, then Ollama with default models", () => {
    raycast.preferences = { geminiApiKey: "gemini-key", groqApiKey: "groq-key", useOllama: true };

    expect(loadSettings().providers).toEqual([
      {
        id: "groq",
        apiKey: "groq-key",
        model: PROVIDERS.groq.defaultModel,
        baseUrl: PROVIDERS.groq.defaultBaseUrl,
      },
      {
        id: "gemini",
        apiKey: "gemini-key",
        model: PROVIDERS.gemini.defaultModel,
        baseUrl: PROVIDERS.gemini.defaultBaseUrl,
      },
      {
        id: "ollama",
        apiKey: undefined,
        model: PROVIDERS.ollama.defaultModel,
        baseUrl: PROVIDERS.ollama.defaultBaseUrl,
      },
    ]);
  });

  test("trims custom values and drops trailing slashes from the base URL", () => {
    raycast.preferences = {
      groqApiKey: "  groq-key  ",
      groqModel: " llama-3.3-70b-versatile ",
      useOllama: true,
      ollamaModel: "qwen3",
      ollamaBaseUrl: "http://192.168.1.10:11434/v1//",
    };

    expect(loadSettings().providers).toEqual([
      {
        id: "groq",
        apiKey: "groq-key",
        model: "llama-3.3-70b-versatile",
        baseUrl: PROVIDERS.groq.defaultBaseUrl,
      },
      {
        id: "ollama",
        apiKey: undefined,
        model: "qwen3",
        baseUrl: "http://192.168.1.10:11434/v1",
      },
    ]);
  });

  test("ignores blank API keys and blank models", () => {
    raycast.preferences = { groqApiKey: "   ", geminiApiKey: "gemini-key", geminiModel: " " };

    expect(loadSettings().providers).toEqual([
      {
        id: "gemini",
        apiKey: "gemini-key",
        model: PROVIDERS.gemini.defaultModel,
        baseUrl: PROVIDERS.gemini.defaultBaseUrl,
      },
    ]);
  });

  test("uses the chosen tone and language pair", () => {
    raycast.preferences = { defaultTone: "linkedin", mainLanguage: "ja", secondLanguage: "en" };

    expect(loadSettings()).toMatchObject({
      defaultTone: "linkedin",
      target: {
        kind: "pair",
        main: { code: "ja", name: "Japanese" },
        second: DEFAULT_LANGUAGE,
      },
    });
  });

  test("translates into one fixed language when both languages are the same", () => {
    raycast.preferences = { mainLanguage: "ja", secondLanguage: "ja" };

    expect(loadSettings().target).toEqual({
      kind: "fixed",
      language: { code: "ja", name: "Japanese" },
    });
  });

  test("copies instead of pasting when chosen", () => {
    raycast.preferences = { primaryAction: "copy" };

    expect(loadSettings().primaryAction).toBe("copy");
  });

  test("offers every supported language in both language preferences", () => {
    for (const name of ["mainLanguage", "secondLanguage"]) {
      const preference = manifest.preferences.find((entry) => entry.name === name);

      expect(preference?.data?.map((option) => option.value)).toEqual(
        LANGUAGES.map(({ code }) => code),
      );
    }
  });
});
