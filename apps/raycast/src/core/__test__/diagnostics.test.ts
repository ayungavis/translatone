import { describe, expect, setSystemTime, test } from "bun:test";
import { buildDebugReport, type DiagnosticContext } from "../diagnostics";
import { AllProvidersFailedError, ProviderError } from "../errors";
import { providerConfig } from "./test-helpers";

const NOW = new Date("2026-11-03T10:00:00Z");

const context: DiagnosticContext = {
  command: "translate",
  tone: "email",
  targetLanguage: "id",
  textLength: 42,
  providers: [providerConfig("groq"), providerConfig("ollama", { apiKey: undefined })],
};

function report(error: unknown): unknown {
  return JSON.parse(buildDebugReport(error, context, NOW));
}

describe("buildDebugReport", () => {
  test("describes the request context without exposing API keys", () => {
    const raw = buildDebugReport(new Error("boom"), context, NOW);

    expect(raw).not.toContain("groq-key");
    expect(JSON.parse(raw)).toMatchObject({
      timestamp: "2026-11-03T10:00:00.000Z",
      command: "translate",
      tone: "email",
      targetLanguage: "id",
      textLength: 42,
      providers: [
        { id: "groq", model: "groq-model", baseUrl: "https://groq.test/v1", hasApiKey: true },
        {
          id: "ollama",
          model: "ollama-model",
          baseUrl: "https://ollama.test/v1",
          hasApiKey: false,
        },
      ],
    });
  });

  test("includes provider failure details and their causes", () => {
    const failure = new ProviderError("groq", "server", "Bad gateway", {
      status: 502,
      requestId: "req_1",
      cause: new TypeError("socket hang up"),
    });

    expect(report(new AllProvidersFailedError([failure]))).toMatchObject({
      error: {
        name: "AllProvidersFailedError",
        message: "Groq: provider is down",
        failures: [
          {
            name: "ProviderError",
            provider: "groq",
            reason: "server",
            status: 502,
            requestId: "req_1",
            message: "Bad gateway",
            cause: "socket hang up",
          },
        ],
      },
    });
  });

  test("omits a cause that is not an Error", () => {
    const failure = new ProviderError("groq", "timeout", "slow", { cause: "aborted" });

    expect(report(failure)).toMatchObject({ error: { reason: "timeout" } });
    expect(report(failure)).not.toHaveProperty("error.cause");
  });

  test("serializes generic errors and thrown values", () => {
    expect(report(new SyntaxError("bad json"))).toMatchObject({
      error: { name: "SyntaxError", message: "bad json" },
    });
    expect(report(404)).toMatchObject({ error: { value: "404" } });
  });

  test("uses the current time by default", () => {
    setSystemTime(NOW);
    try {
      expect(JSON.parse(buildDebugReport("x", context))).toMatchObject({
        timestamp: "2026-11-03T10:00:00.000Z",
      });
    } finally {
      setSystemTime();
    }
  });
});
