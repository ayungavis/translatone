import { describe, expect, test } from "bun:test";
import { requestCompletion, type Fetch } from "../chat-client";
import { ProviderError } from "../errors";
import { completionResponse, providerConfig, rejectionOf, scriptedFetch } from "./test-helpers";

const groq = providerConfig("groq");

const hangingFetch: Fetch = (_url, init) =>
  new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

function respondWith(response: () => Promise<Response>) {
  return scriptedFetch(new Map([["groq.test", response]]));
}

async function captureError(promise: Promise<unknown>): Promise<ProviderError> {
  const error = await rejectionOf(promise);
  if (!(error instanceof ProviderError)) {
    throw new Error(`Expected ProviderError, received ${String(error)}`);
  }
  return error;
}

describe("requestCompletion", () => {
  test("sends an OpenAI-compatible request and returns the trimmed content", async () => {
    const { fetch, calls } = respondWith(async () =>
      completionResponse("  Halo  ", { headers: { "x-request-id": "req_1" } }),
    );

    const completion = await requestCompletion(fetch, {
      provider: groq,
      systemPrompt: "system",
      text: "Hello",
    });

    expect(completion).toEqual({ text: "Halo", requestId: "req_1" });
    expect(calls[0]?.url).toBe("https://groq.test/v1/chat/completions");
    expect(calls[0]?.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer groq-key",
    });
    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).toMatchObject({
      model: "groq-model",
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "Hello" },
      ],
    });
  });

  test("omits the authorization header when there is no API key", async () => {
    const { fetch, calls } = respondWith(async () => completionResponse("Halo"));

    await requestCompletion(fetch, {
      provider: providerConfig("groq", { apiKey: undefined }),
      systemPrompt: "system",
      text: "Hello",
    });

    expect(calls[0]?.init.headers).toEqual({ "Content-Type": "application/json" });
  });

  test.each([
    [401, "unauthorized", false],
    [403, "unauthorized", false],
    [429, "rate_limited", true],
    [503, "server", true],
    [400, "request_rejected", false],
  ] as const)("maps HTTP %i to %s", async (status, reason, recoverable) => {
    const { fetch } = respondWith(async () => new Response("provider says no", { status }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe(reason);
    expect(error.status).toBe(status);
    expect(error.recoverable).toBe(recoverable);
    expect(error.message).toBe("provider says no");
  });

  test("reports a network failure as recoverable", async () => {
    const { fetch } = respondWith(() => Promise.reject(new TypeError("fetch failed")));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("network");
    expect(error.recoverable).toBe(true);
  });

  test("reports a slow provider as a recoverable timeout", async () => {
    const error = await captureError(
      requestCompletion(
        hangingFetch,
        { provider: groq, systemPrompt: "system", text: "Hello" },
        { timeoutMs: 5 },
      ),
    );

    expect(error.reason).toBe("timeout");
    expect(error.recoverable).toBe(true);
    expect(error.message).toBe("No response after 5 ms.");
  });

  test("falls back to the HTTP status when the error body cannot be read", async () => {
    const brokenBody = new ReadableStream({
      start: (controller) => controller.error(new Error("stream broke")),
    });
    const { fetch } = respondWith(async () => new Response(brokenBody, { status: 502 }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("server");
    expect(error.message).toBe("HTTP 502");
  });

  test("rejects a response that is not JSON", async () => {
    const { fetch } = respondWith(async () => new Response("<html>oops</html>"));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("bad_response");
    expect(error.status).toBe(200);
  });

  test("rethrows when the caller aborts", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    const { fetch } = respondWith(() => {
      controller.abort();
      return Promise.reject(abortError);
    });

    const result = requestCompletion(fetch, {
      provider: groq,
      systemPrompt: "system",
      text: "Hello",
      signal: controller.signal,
    });

    expect(await rejectionOf(result)).toBe(abortError);
  });

  test("rejects a response without content", async () => {
    const { fetch } = respondWith(async () => Response.json({ choices: [] }));

    const error = await captureError(
      requestCompletion(fetch, { provider: groq, systemPrompt: "system", text: "Hello" }),
    );

    expect(error.reason).toBe("bad_response");
  });
});
