import { getPreferenceValues } from "@raycast/api";
import { InvalidSettingsError } from "../core/errors";
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
  readonly useGroq?: boolean;
  readonly groqApiKey?: string;
  readonly groqModel?: string;
  readonly useGemini?: boolean;
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
  if (groqApiKey && preferences.useGroq !== false) {
    providers.push(configure("groq", groqApiKey, preferences.groqModel));
  }
  const geminiApiKey = clean(preferences.geminiApiKey);
  if (geminiApiKey && preferences.useGemini !== false) {
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
    if (!baseUrl) {
      throw new InvalidSettingsError(
        "Custom Base URL is required. Enter your provider's API base URL in preferences.",
      );
    }
    const model = clean(preferences.byokModel);
    if (!model) {
      throw new InvalidSettingsError(
        "Your Model is required for Custom. Enter the exact model ID in preferences.",
      );
    }
    return configure("custom", apiKey, model, baseUrl);
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
    baseUrl: validateBaseUrl(clean(baseUrl) ?? info.defaultBaseUrl),
  };
}

function validateBaseUrl(baseUrl: string): string {
  if (!/^https?:\/\//i.test(baseUrl) || !URL.canParse(baseUrl)) {
    throw new InvalidSettingsError(
      "Provider URL must be an absolute HTTP or HTTPS URL. Check the URL in preferences.",
    );
  }
  const url = new URL(baseUrl);
  if (url.username !== "" || url.password !== "") {
    throw new InvalidSettingsError(
      "Provider URL cannot contain credentials. Put the API key in its password field instead.",
    );
  }
  if (baseUrl.includes("?")) {
    throw new InvalidSettingsError(
      "Provider URL cannot contain a query string. Use the API base URL instead.",
    );
  }
  if (baseUrl.includes("#")) {
    throw new InvalidSettingsError(
      "Provider URL cannot contain a fragment. Use the API base URL instead.",
    );
  }
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "[::1]" ||
    /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
  if (url.protocol === "http:" && !loopback) {
    throw new InvalidSettingsError(
      "Remote provider URLs require HTTPS. HTTP is allowed only for loopback addresses.",
    );
  }
  const normalized = url.toString().replace(/\/+$/, "");
  if (url.pathname.replace(/\/+$/, "").endsWith("/chat/completions")) {
    throw new InvalidSettingsError(
      "Use the API base URL, without /chat/completions. TranslaTone adds the request path.",
    );
  }
  return normalized;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}
