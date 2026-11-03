import type { Fetch } from "./chat-client";
import type { ProviderConfig, ProviderId } from "./providers";
import type { KeyValueStore } from "./usage";

export class MemoryStore implements KeyValueStore {
  readonly entries = new Map<string, string>();

  getItem(key: string): Promise<string | undefined> {
    return Promise.resolve(this.entries.get(key));
  }

  setItem(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
    return Promise.resolve();
  }
}

export function providerConfig(id: ProviderId, overrides: Partial<ProviderConfig> = {}) {
  return {
    id,
    baseUrl: `https://${id}.test/v1`,
    model: `${id}-model`,
    apiKey: `${id}-key`,
    ...overrides,
  } satisfies ProviderConfig;
}

export function completionResponse(content: string, init: ResponseInit = {}): Response {
  return Response.json({ choices: [{ message: { role: "assistant", content } }] }, init);
}

export function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("Expected the promise to reject");
    },
    (reason: unknown) => reason,
  );
}

export interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit;
}

export function scriptedFetch(responses: ReadonlyMap<string, () => Promise<Response>>) {
  const calls: RecordedCall[] = [];
  const fetch: Fetch = async (url, init) => {
    calls.push({ url, init });
    const respond = [...responses].find(([host]) => url.includes(host))?.[1];
    if (respond === undefined) {
      throw new TypeError(`Unexpected request to ${url}`);
    }
    return respond();
  };
  return { fetch, calls };
}
