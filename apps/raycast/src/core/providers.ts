export const PROVIDER_IDS = ["groq", "gemini", "ollama"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type UsagePeriod = "day" | "month";

export interface UsageLimit {
  readonly period: UsagePeriod;
  readonly maxRequests: number;
}

export interface ProviderInfo {
  readonly id: ProviderId;
  readonly name: string;
  readonly defaultBaseUrl: string;
  readonly defaultModel: string;
  readonly limit: UsageLimit | undefined;
}

export const PROVIDERS: Readonly<Record<ProviderId, ProviderInfo>> = {
  groq: {
    id: "groq",
    name: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    limit: { period: "day", maxRequests: 14_400 },
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    limit: { period: "day", maxRequests: 250 },
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    limit: undefined,
  },
};

export interface ProviderConfig {
  readonly id: ProviderId;
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string | undefined;
}
