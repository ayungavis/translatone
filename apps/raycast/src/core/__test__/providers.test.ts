import { describe, expect, test } from "bun:test";
import manifest from "../../../package.json";
import { PROVIDERS, providersAfter } from "../providers";
import { providerConfig } from "./test-helpers";

function preferenceDefault(name: string): unknown {
  return manifest.preferences.find((preference) => preference.name === name)?.default;
}

describe("provider defaults", () => {
  test("use Groq's supported replacement for the retired Llama 3.1 8B model", () => {
    expect(PROVIDERS.groq.defaultModel).toBe("openai/gpt-oss-20b");
  });

  test.each([
    ["groqModel", PROVIDERS.groq.defaultModel],
    ["geminiModel", PROVIDERS.gemini.defaultModel],
    ["ollamaModel", PROVIDERS.ollama.defaultModel],
    ["ollamaBaseUrl", PROVIDERS.ollama.defaultBaseUrl],
  ])("the %s preference default matches the provider default", (name, expected) => {
    expect(preferenceDefault(name)).toBe(expected);
  });
});

describe("providersAfter", () => {
  const groq = providerConfig("groq");
  const gemini = providerConfig("gemini");
  const ollama = providerConfig("ollama");

  test("retries with the providers after the one that answered", () => {
    expect(providersAfter([groq, gemini, ollama], "groq")).toEqual([gemini, ollama]);
  });

  test("wraps around to the earlier providers", () => {
    expect(providersAfter([groq, gemini, ollama], "gemini")).toEqual([ollama, groq]);
  });

  test("keeps the list when the answering provider is no longer configured", () => {
    expect(providersAfter([gemini, ollama], "groq")).toEqual([gemini, ollama]);
  });

  test("keeps the only provider there is", () => {
    expect(providersAfter([groq], "groq")).toEqual([groq]);
  });
});
