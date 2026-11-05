import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../core/languages";
import { resolvePrimaryAction, type PrimaryAction } from "../core/output";
import {
  isByokProviderId,
  PROVIDERS,
  type ProviderConfig,
  type ProviderId,
} from "../core/providers";
import { languagePair, type TranslationTarget } from "../core/target";
import { DEFAULT_TONE, resolveTone, type ToneId } from "../core/tones";

interface RawPreferences {
  readonly preferredProvider?: string;
  readonly byokProvider?: string;
  readonly byokApiKey?: string;
  readonly byokModel?: string;
  readonly byokBaseUrl?: string;
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
  readonly primaryAction: PrimaryAction;
  readonly target: TranslationTarget;
}

const SECOND_LANGUAGE = resolveLanguage("id", DEFAULT_LANGUAGE);

export function loadSettings(): Settings {
  const preferences = getPreferenceValues<RawPreferences>();
  return {
    providers: preferFirst(resolveProviders(preferences), preferences.preferredProvider),
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
  const own = resolveOwnProvider(preferences);
  if (own) {
    providers.push(own);
  }
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

function preferFirst(
  providers: readonly ProviderConfig[],
  preferred: string | undefined,
): ProviderConfig[] {
  const isPreferred = ({ id }: ProviderConfig) =>
    preferred === undefined || preferred === "own" ? isByokProviderId(id) : id === preferred;
  return [
    ...providers.filter(isPreferred),
    ...providers.filter((provider) => !isPreferred(provider)),
  ];
}

function resolveOwnProvider(preferences: RawPreferences): ProviderConfig | undefined {
  const { byokProvider } = preferences;
  if (!isByokProviderId(byokProvider)) {
    return undefined;
  }
  const apiKey = clean(preferences.byokApiKey);
  if (byokProvider === "custom") {
    const baseUrl = clean(preferences.byokBaseUrl);
    return baseUrl ? configure("custom", apiKey, preferences.byokModel, baseUrl) : undefined;
  }
  return apiKey ? configure(byokProvider, apiKey, preferences.byokModel) : undefined;
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
