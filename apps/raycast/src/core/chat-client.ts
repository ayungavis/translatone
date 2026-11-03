import { ProviderError, type ProviderErrorReason } from "./errors";
import type { ProviderConfig } from "./providers";

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export interface CompletionRequest {
  readonly provider: ProviderConfig;
  readonly systemPrompt: string;
  readonly text: string;
  readonly signal?: AbortSignal | undefined;
}

export interface Completion {
  readonly text: string;
  readonly requestId: string | undefined;
}

export interface CompletionOptions {
  readonly timeoutMs?: number;
}

export const REQUEST_TIMEOUT_MS = 30_000;

const MAX_ERROR_DETAIL_LENGTH = 300;

export async function requestCompletion(
  fetchFn: Fetch,
  request: CompletionRequest,
  options: CompletionOptions = {},
): Promise<Completion> {
  const { provider } = request;
  const response = await send(fetchFn, request, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const requestId = response.headers.get("x-request-id") ?? undefined;

  if (!response.ok) {
    throw await toHttpError(provider, response, requestId);
  }

  const body: unknown = await response.json().catch(() => undefined);
  const text = extractContent(body);
  if (text === undefined) {
    throw new ProviderError(
      provider.id,
      "bad_response",
      "Response did not contain a translation.",
      {
        status: response.status,
        requestId,
      },
    );
  }
  return { text, requestId };
}

async function send(
  fetchFn: Fetch,
  request: CompletionRequest,
  timeoutMs: number,
): Promise<Response> {
  const { provider, systemPrompt, text, signal } = request;
  const timeout = AbortSignal.timeout(timeoutMs);

  try {
    return await fetchFn(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(provider.apiKey),
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    if (timeout.aborted) {
      throw new ProviderError(provider.id, "timeout", `No response after ${timeoutMs} ms.`, {
        cause: error,
      });
    }
    throw new ProviderError(provider.id, "network", `Could not reach ${provider.baseUrl}.`, {
      cause: error,
    });
  }
}

function buildHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function toHttpError(
  provider: ProviderConfig,
  response: Response,
  requestId: string | undefined,
): Promise<ProviderError> {
  const detail = (await response.text().catch(() => "")).slice(0, MAX_ERROR_DETAIL_LENGTH);
  return new ProviderError(
    provider.id,
    reasonForStatus(response.status),
    detail || `HTTP ${response.status}`,
    { status: response.status, requestId },
  );
}

function reasonForStatus(status: number): ProviderErrorReason {
  if (status === 401 || status === 403) {
    return "unauthorized";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status >= 500) {
    return "server";
  }
  return "request_rejected";
}

function extractContent(body: unknown): string | undefined {
  if (!isRecord(body) || !Array.isArray(body["choices"])) {
    return undefined;
  }
  const choices: readonly unknown[] = body["choices"];
  const message = isRecord(choices[0]) ? choices[0]["message"] : undefined;
  const content = isRecord(message) ? message["content"] : undefined;
  const text = typeof content === "string" ? content.trim() : "";
  return text === "" ? undefined : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
