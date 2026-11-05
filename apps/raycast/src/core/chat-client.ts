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
  readonly onDelta?: ((text: string) => void) | undefined;
}

export const REQUEST_TIMEOUT_MS = 30_000;

const MAX_ERROR_DETAIL_LENGTH = 300;

interface Transport {
  readonly provider: ProviderConfig;
  readonly signal: AbortSignal | undefined;
  readonly timeout: AbortSignal;
  readonly timeoutMs: number;
}

export async function requestCompletion(
  fetchFn: Fetch,
  request: CompletionRequest,
  options: CompletionOptions = {},
): Promise<Completion> {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const transport: Transport = {
    provider: request.provider,
    signal: request.signal,
    timeout: AbortSignal.timeout(timeoutMs),
    timeoutMs,
  };
  const { onDelta } = options;
  const response = await guardTransport(transport, () =>
    send(fetchFn, request, transport, onDelta !== undefined),
  );
  const requestId =
    response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? undefined;

  if (!response.ok) {
    throw await toHttpError(request.provider, response, requestId);
  }

  const text = await guardTransport(transport, () => readText(response, onDelta));
  if (text === undefined) {
    throw new ProviderError(
      request.provider.id,
      "bad_response",
      "Response did not contain a translation.",
      { status: response.status, requestId },
    );
  }
  return { text, requestId };
}

function send(
  fetchFn: Fetch,
  { provider, systemPrompt, text }: CompletionRequest,
  { signal, timeout }: Transport,
  stream: boolean,
): Promise<Response> {
  return fetchFn(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(provider.apiKey),
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      ...(stream ? { stream: true } : {}),
    }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
}

async function guardTransport<T>(transport: Transport, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toTransportError(transport, error);
  }
}

function toTransportError({ provider, signal, timeout, timeoutMs }: Transport, error: unknown) {
  if (error instanceof ProviderError || signal?.aborted) {
    return error;
  }
  if (timeout.aborted) {
    return new ProviderError(provider.id, "timeout", `No response after ${timeoutMs} ms.`, {
      cause: error,
    });
  }
  return new ProviderError(provider.id, "network", `Could not reach ${provider.baseUrl}.`, {
    cause: error,
  });
}

async function readText(
  response: Response,
  onDelta: ((text: string) => void) | undefined,
): Promise<string | undefined> {
  if (onDelta === undefined || !isEventStream(response)) {
    const text = extractContent(await response.json().catch(() => undefined));
    if (text !== undefined) {
      onDelta?.(text);
    }
    return text;
  }
  let text = "";
  await forEachEventData(response, (data) => {
    const delta = extractDelta(parseJson(data));
    if (delta !== undefined) {
      text += delta;
      onDelta(text);
    }
  });
  const trimmed = text.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isEventStream(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").includes("text/event-stream");
}

async function forEachEventData(response: Response, onData: (data: string) => void) {
  let buffer = "";
  const emitLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return;
    }
    const data = trimmed.slice("data:".length).trim();
    if (data !== "" && data !== "[DONE]") {
      onData(data);
    }
  };
  for await (const chunk of response.body?.pipeThrough(new TextDecoderStream()) ?? []) {
    const lines = (buffer + chunk).split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(emitLine);
  }
  emitLine(buffer);
}

export function buildHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

export async function toHttpError(
  provider: ProviderConfig,
  response: Response,
  requestId: string | undefined,
): Promise<ProviderError> {
  const body = await response.text().catch(() => "");
  const detail = (providerErrorMessage(body) ?? body.trim()).slice(0, MAX_ERROR_DETAIL_LENGTH);
  return new ProviderError(
    provider.id,
    reasonForStatus(response.status),
    detail || `HTTP ${response.status}`,
    { status: response.status, requestId },
  );
}

function providerErrorMessage(body: string): string | undefined {
  const parsed = parseJson(body);
  const payload: unknown = Array.isArray(parsed) ? parsed[0] : parsed;
  const error = isRecord(payload) ? payload["error"] : undefined;
  const message = isRecord(error) ? error["message"] : undefined;
  return typeof message === "string" && message.trim() !== "" ? message.trim() : undefined;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function reasonForStatus(status: number): ProviderErrorReason {
  if (status === 401 || status === 403) {
    return "unauthorized";
  }
  if (status === 404) {
    return "model_unavailable";
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

function extractDelta(event: unknown): string | undefined {
  if (!isRecord(event) || !Array.isArray(event["choices"])) {
    return undefined;
  }
  const choices: readonly unknown[] = event["choices"];
  const delta = isRecord(choices[0]) ? choices[0]["delta"] : undefined;
  const content = isRecord(delta) ? delta["content"] : undefined;
  return typeof content === "string" && content !== "" ? content : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
