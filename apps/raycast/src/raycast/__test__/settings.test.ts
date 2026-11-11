import { beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../../core/languages";
import { PROVIDERS } from "../../core/providers";
import manifest from "../../../package.json";
import { loadSettings } from "../settings";
import { raycast } from "./test-helpers";

function providerOrder(): string[] {
  return loadSettings().providers.map(({ id }) => id);
}

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

  test.each([
    ["groq", { useGroq: false }, ["gemini", "ollama"]],
    ["gemini", { useGemini: false }, ["groq", "ollama"]],
  ])(
    "excludes disabled %s even when it is preferred and has a key",
    (preferredProvider, toggles, expected) => {
      raycast.preferences = {
        groqApiKey: "groq-key",
        geminiApiKey: "gemini-key",
        useOllama: true,
        preferredProvider,
        ...toggles,
      };

      expect(providerOrder()).toEqual(expected);
    },
  );

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

  test("restores saved keys and models when providers are enabled again", () => {
    const saved = {
      groqApiKey: "groq-key",
      groqModel: "saved-groq-model",
      geminiApiKey: "gemini-key",
      geminiModel: "saved-gemini-model",
    };
    raycast.preferences = { ...saved, useGroq: false, useGemini: false };

    expect(loadSettings().providers).toEqual([]);

    raycast.preferences = { ...raycast.preferences, useGroq: true, useGemini: true };

    expect(loadSettings().providers).toMatchObject([
      { id: "groq", apiKey: "groq-key", model: "saved-groq-model" },
      { id: "gemini", apiKey: "gemini-key", model: "saved-gemini-model" },
    ]);
  });

  test("requires API keys even when Groq and Gemini are enabled", () => {
    raycast.preferences = { useGroq: true, useGemini: true };

    expect(loadSettings().providers).toEqual([]);
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

  test.each(["openai", "anthropic", "openrouter"] as const)(
    "tries your own %s key first with its default model",
    (id) => {
      raycast.preferences = { byokProvider: id, byokApiKey: " own-key ", groqApiKey: "groq-key" };

      expect(loadSettings().providers).toEqual([
        {
          id,
          apiKey: "own-key",
          model: PROVIDERS[id].defaultModel,
          baseUrl: PROVIDERS[id].defaultBaseUrl,
        },
        {
          id: "groq",
          apiKey: "groq-key",
          model: PROVIDERS.groq.defaultModel,
          baseUrl: PROVIDERS.groq.defaultBaseUrl,
        },
      ]);
    },
  );

  test("uses the model you choose for your own provider", () => {
    raycast.preferences = { byokProvider: "openai", byokApiKey: "own-key", byokModel: " gpt-5 " };

    expect(loadSettings().providers[0]?.model).toBe("gpt-5");
  });

  test("ignores your own provider without an API key", () => {
    raycast.preferences = { byokProvider: "anthropic", byokApiKey: "  " };

    expect(loadSettings().providers).toEqual([]);
  });

  test.each([undefined, "none", "unknown"])("ignores the provider choice %p", (byokProvider) => {
    raycast.preferences = { byokProvider, byokApiKey: "own-key" };

    expect(loadSettings().providers).toEqual([]);
  });

  test("uses a custom OpenAI-compatible endpoint, with or without a key", () => {
    raycast.preferences = {
      byokProvider: "custom",
      byokBaseUrl: " http://localhost:1234/v1/ ",
      byokModel: "qwen3",
    };

    expect(loadSettings().providers).toEqual([
      { id: "custom", apiKey: undefined, model: "qwen3", baseUrl: "http://localhost:1234/v1" },
    ]);
  });

  test("ignores a custom endpoint without a base URL", () => {
    raycast.preferences = { byokProvider: "custom", byokApiKey: "own-key", byokModel: "qwen3" };

    expect(loadSettings().providers).toEqual([]);
  });

  describe("preferred provider", () => {
    const configured = {
      byokProvider: "openai",
      byokApiKey: "own-key",
      groqApiKey: "groq-key",
      geminiApiKey: "gemini-key",
      useOllama: true,
    };

    test.each([
      [undefined, ["openai", "groq", "gemini", "ollama"]],
      ["own", ["openai", "groq", "gemini", "ollama"]],
      ["groq", ["groq", "openai", "gemini", "ollama"]],
      ["gemini", ["gemini", "openai", "groq", "ollama"]],
      ["ollama", ["ollama", "openai", "groq", "gemini"]],
    ])("tries %p first and falls back to the rest in order", (preferredProvider, expected) => {
      raycast.preferences = { ...configured, preferredProvider };

      expect(providerOrder()).toEqual(expected);
    });

    test("keeps the usual order when the preferred provider is not configured", () => {
      raycast.preferences = {
        groqApiKey: "groq-key",
        useOllama: true,
        preferredProvider: "gemini",
      };

      expect(providerOrder()).toEqual(["groq", "ollama"]);
    });
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

  test("offers your own provider and every free provider as the preferred provider", () => {
    const preference = manifest.preferences.find(({ name }) => name === "preferredProvider");

    expect(preference?.default).toBe("own");
    expect(preference?.data?.map(({ value }) => value)).toEqual([
      "own",
      "groq",
      "gemini",
      "ollama",
    ]);
  });

  test.each(["useGroq", "useGemini"])("offers an enabled-by-default %s checkbox", (name) => {
    expect(manifest.preferences.find((preference) => preference.name === name)).toMatchObject({
      type: "checkbox",
      required: false,
      default: true,
    });
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
