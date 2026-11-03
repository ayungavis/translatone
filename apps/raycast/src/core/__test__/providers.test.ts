import { describe, expect, test } from "bun:test";
import manifest from "../../../package.json";
import { PROVIDERS } from "../providers";

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
