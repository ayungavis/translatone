import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../core/languages";
import { resolvePrimaryAction, type OutputAction } from "../core/output";
import { PROVIDERS, type ProviderConfig, type ProviderId } from "../core/providers";
import { languagePair, type TranslationTarget } from "../core/target";
import { DEFAULT_TONE, resolveTone, type ToneId } from "../core/tones";

interface RawPreferences {
  readonly groqApiKey?: string;
  readonly groqModel?: string;
  readonly geminiApiKey?: string;
  readonly geminiModel?: string;
  readonly useOllama?: boolean;
  readonly ollamaModel?: string;
  readonly ollamaBaseUrl?: string;
  readonly mainLanguage?: string;
  readonly secondLanguage?: string;
  readonly defaultTone?: string;
  readonly primaryAction?: string;
}

export interface Settings {
  readonly providers: readonly ProviderConfig[];
  readonly defaultTone: ToneId;
  readonly primaryAction: OutputAction;
  readonly target: TranslationTarget;
}

const SECOND_LANGUAGE = resolveLanguage("id", DEFAULT_LANGUAGE);

export function loadSettings(): Settings {
  const preferences = getPreferenceValues<RawPreferences>();
  return {
    providers: resolveProviders(preferences),
    defaultTone: resolveTone(preferences.defaultTone, DEFAULT_TONE),
    primaryAction: resolvePrimaryAction(preferences.primaryAction),
    target: languagePair(
      resolveLanguage(preferences.mainLanguage, DEFAULT_LANGUAGE),
      resolveLanguage(preferences.secondLanguage, SECOND_LANGUAGE),
    ),
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
