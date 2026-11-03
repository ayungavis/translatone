import { describe, expect, setSystemTime, test } from "bun:test";
import {
  AllProvidersFailedError,
  EmptyTextError,
  NoProviderConfiguredError,
  ProviderError,
} from "../errors";
import { DEFAULT_LANGUAGE } from "../languages";
import {
  completionResponse,
  MemoryStore,
  providerConfig,
  rejectionOf,
  scriptedFetch,
} from "./test-helpers";
import { translate, type TranslationDependencies } from "../translate";
import { usageKey } from "../usage";

const NOW = new Date("2026-11-03T10:00:00Z");
const groq = providerConfig("groq");
const gemini = providerConfig("gemini");

const request = { text: "Halo", tone: "default", targetLanguage: DEFAULT_LANGUAGE } as const;

function dependencies(
  responses: ReadonlyMap<string, () => Promise<Response>>,
  overrides: Partial<TranslationDependencies> = {},
) {
  const { fetch, calls } = scriptedFetch(responses);
  const store = new MemoryStore();
  return {
    calls,
    store,
    deps: { providers: [groq, gemini], store, fetch, now: () => NOW, ...overrides },
  };
}

describe("translate", () => {
  test("uses the first provider and records its usage", async () => {
    const { deps, calls } = dependencies(
      new Map([["groq.test", async () => completionResponse("Hello")]]),
    );

    const result = await translate(request, deps);

    expect(result.text).toBe("Hello");
    expect(result.provider).toBe(groq);
    expect(result.usage.used).toBe(1);
    expect(result.skipped).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  test("falls back to the next provider when the first is rate limited", async () => {
    const { deps } = dependencies(
      new Map([
        ["groq.test", async () => new Response("slow down", { status: 429 })],
        ["gemini.test", async () => completionResponse("Hello")],
      ]),
    );

    const result = await translate(request, deps);

    expect(result.provider).toBe(gemini);
    expect(result.skipped.map((failure) => failure.reason)).toEqual(["rate_limited"]);
  });

  test("skips a provider whose local quota is used up without calling it", async () => {
    const { deps, store, calls } = dependencies(
      new Map([["gemini.test", async () => completionResponse("Hello")]]),
    );
    await store.setItem(usageKey(groq, NOW), "14400");

    const result = await translate(request, deps);

    expect(result.provider).toBe(gemini);
    expect(result.skipped.map((failure) => failure.reason)).toEqual(["limit_reached"]);
    expect(calls.map((call) => call.url)).toEqual(["https://gemini.test/v1/chat/completions"]);
  });

  test("falls back when the first provider no longer offers the model", async () => {
    const { deps } = dependencies(
      new Map([
        [
          "groq.test",
          async () => Response.json({ error: { message: "no model" } }, { status: 404 }),
        ],
        ["gemini.test", async () => completionResponse("Hello")],
      ]),
    );

    const result = await translate(request, deps);

    expect(result.provider).toBe(gemini);
    expect(result.skipped.map((failure) => failure.summary)).toEqual(["Groq: model unavailable"]);
  });

  test("stops on a non-recoverable error instead of hiding it", async () => {
    const { deps, calls } = dependencies(
      new Map([
        ["groq.test", async () => new Response("bad key", { status: 401 })],
        ["gemini.test", async () => completionResponse("Hello")],
      ]),
    );

    const error = await rejectionOf(translate(request, deps));

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ reason: "unauthorized" });
    expect(calls).toHaveLength(1);
  });

  test("reports every failure when all providers are exhausted", async () => {
    const { deps } = dependencies(
      new Map([
        ["groq.test", async () => new Response("", { status: 429 })],
        ["gemini.test", async () => new Response("", { status: 503 })],
      ]),
    );

    const error = await rejectionOf(translate(request, deps));

    expect(error).toBeInstanceOf(AllProvidersFailedError);
    expect(error).toMatchObject({
      message: "Groq: rate limit reached · Gemini: provider is down",
    });
  });

  test("counts usage against the current day when no clock is given", async () => {
    const { deps, store } = dependencies(
      new Map([["groq.test", async () => completionResponse("Hello")]]),
    );
    setSystemTime(NOW);
    try {
      await translate(request, { providers: deps.providers, store: deps.store, fetch: deps.fetch });
    } finally {
      setSystemTime();
    }

    expect(store.entries.get(usageKey(groq, NOW))).toBe("1");
  });

  test("requires at least one provider", async () => {
    const { deps } = dependencies(new Map(), { providers: [] });

    expect(await rejectionOf(translate(request, deps))).toBeInstanceOf(NoProviderConfiguredError);
  });

  test("rejects blank text before calling any provider", async () => {
    const { deps, calls } = dependencies(new Map());

    expect(await rejectionOf(translate({ ...request, text: "   " }, deps))).toBeInstanceOf(
      EmptyTextError,
    );
    expect(calls).toHaveLength(0);
  });
});
