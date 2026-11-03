import { AllProvidersFailedError, ProviderError } from "./errors";
import type { ProviderConfig } from "./providers";
import type { ToneId } from "./tones";

export interface DiagnosticContext {
  readonly command: string;
  readonly tone: ToneId;
  readonly targetLanguage: string;
  readonly textLength: number;
  readonly providers: readonly ProviderConfig[];
}

export function buildDebugReport(
  error: unknown,
  context: DiagnosticContext,
  now = new Date(),
): string {
  const report = {
    timestamp: now.toISOString(),
    command: context.command,
    tone: context.tone,
    targetLanguage: context.targetLanguage,
    textLength: context.textLength,
    providers: context.providers.map(({ id, model, baseUrl, apiKey }) => ({
      id,
      model,
      baseUrl,
      hasApiKey: apiKey !== undefined,
    })),
    error: serializeError(error),
  };
  return JSON.stringify(report, null, 2);
}

function serializeError(error: unknown): unknown {
  if (error instanceof AllProvidersFailedError) {
    return {
      name: error.name,
      message: error.message,
      failures: error.failures.map(serializeError),
    };
  }
  if (error instanceof ProviderError) {
    return {
      name: error.name,
      provider: error.provider,
      reason: error.reason,
      status: error.status,
      requestId: error.requestId,
      message: error.message,
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { value: String(error) };
}
