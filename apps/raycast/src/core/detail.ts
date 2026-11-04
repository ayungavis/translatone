import { describeTarget, type TranslationTarget } from "./target";
import type { ToneId } from "./tones";

export interface DetailContent {
  readonly translation: string;
  readonly original: string;
  readonly sourceLabel: string | undefined;
  readonly failed: boolean;
}

export interface EmptyViewContent {
  readonly needsSetup: boolean;
  readonly title: string;
  readonly description: string;
}

const START_HINT =
  "Select text in any app before opening TranslaTone, or type here. Pick a tone with ↑↓ and press ↵ to paste.";

const SETUP_VIEW: EmptyViewContent = {
  needsSetup: true,
  title: "Add a free provider to start",
  description:
    "TranslaTone needs a Groq or Gemini API key (both free), or Ollama running on this Mac. Press ↵ to open preferences.",
};

export function formatDetailMarkdown({
  translation,
  original,
  sourceLabel,
  failed,
}: DetailContent): string {
  const heading = sourceLabel ? `**Original** · ${sourceLabel}` : "**Original**";
  const quoted = original
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return [translation || placeholder(failed), "---", heading, quoted].join("\n\n");
}

export function emptyViewContent(
  providerCount: number,
  usageSummary: string | undefined,
): EmptyViewContent {
  if (providerCount === 0) {
    return SETUP_VIEW;
  }
  return {
    needsSetup: false,
    title: "Translate anything with the right tone",
    description: usageSummary ? `${START_HINT}\n\n${usageSummary}` : START_HINT,
  };
}

export function translationKey(text: string, target: TranslationTarget, tone: ToneId): string {
  return JSON.stringify([text.trim(), describeTarget(target), tone]);
}

function placeholder(failed: boolean): string {
  return failed
    ? "**Couldn't translate this text.** Press ⌘R to retry, or ⌘K for more actions."
    : "_Translating…_";
}
