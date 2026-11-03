import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_LANGUAGE, findLanguage, type Language } from "../core/languages";
import { PROVIDERS, type ProviderConfig, type ProviderId } from "../core/providers";
import { DEFAULT_TONE, isToneId, type ToneId } from "../core/tones";

interface RawPreferences {
  readonly groqApiKey?: string;
  readonly groqModel?: string;
  readonly geminiApiKey?: string;
  readonly geminiModel?: string;
  readonly useOllama?: boolean;
  readonly ollamaModel?: string;
  readonly ollamaBaseUrl?: string;
  readonly defaultTargetLanguage?: string;
  readonly defaultTone?: string;
}

export interface Settings {
  readonly providers: readonly ProviderConfig[];
  readonly defaultTone: ToneId;
  readonly defaultLanguage: Language;
}

export function loadSettings(): Settings {
  const preferences = getPreferenceValues<RawPreferences>();
  const tone = preferences.defaultTone ?? "";
  return {
    providers: resolveProviders(preferences),
    defaultTone: isToneId(tone) ? tone : DEFAULT_TONE,
    defaultLanguage: findLanguage(preferences.defaultTargetLanguage ?? "") ?? DEFAULT_LANGUAGE,
  };
}

function resolveProviders(preferences: RawPreferences): ProviderConfig[] {
  const providers: ProviderConfig[] = [];
  const groqApiKey = clean(preferences.groqApiKey);
  if (groqApiKey) {
    providers.push(configure("groq", groqApiKey, preferences.groqModel));
  }
  const geminiApiKey = clean(preferences.geminiApiKey);
  if (geminiApiKey) {
    providers.push(configure("gemini", geminiApiKey, preferences.geminiModel));
  }
  if (preferences.useOllama) {
    providers.push(
      configure("ollama", undefined, preferences.ollamaModel, preferences.ollamaBaseUrl),
    );
  }
  return providers;
}

function configure(
  id: ProviderId,
  apiKey: string | undefined,
  model: string | undefined,
  baseUrl?: string,
): ProviderConfig {
  const info = PROVIDERS[id];
  return {
    id,
    apiKey,
    model: clean(model) ?? info.defaultModel,
    baseUrl: (clean(baseUrl) ?? info.defaultBaseUrl).replace(/\/+$/, ""),
  };
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}
