import { describeTarget, type TranslationTarget } from "./target";
import type { ToneId } from "./tones";

export function formatDetailMarkdown(
  translation: string,
  original: string,
  sourceLabel: string | undefined,
): string {
  const heading = sourceLabel ? `**Original** · ${sourceLabel}` : "**Original**";
  const quoted = original
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return [translation || "_Translating…_", "---", heading, quoted].join("\n\n");
}

export function translationKey(text: string, target: TranslationTarget, tone: ToneId): string {
  return JSON.stringify([text.trim(), describeTarget(target), tone]);
}
