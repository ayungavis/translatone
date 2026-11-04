import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { PROVIDERS, type ProviderConfig } from "../core/providers";
import { describeTarget, formatDirection, type TranslationTarget } from "../core/target";
import { TONES, type ToneId } from "../core/tones";
import { translate, visibleTranslation, type TranslationResult } from "../core/translate";
import { formatUsage } from "../core/usage";
import { showTranslationError } from "./feedback";
import { localStore } from "./storage";

interface TranslationDetailProps {
  readonly command: string;
  readonly text: string;
  readonly tone: ToneId;
  readonly target: TranslationTarget;
  readonly providers: readonly ProviderConfig[];
}

export function TranslationDetail({
  command,
  text,
  tone,
  target,
  providers,
}: TranslationDetailProps) {
  const abortable = useRef<AbortController>(null);
  const [streamed, setStreamed] = useState("");
  const { data, isLoading, revalidate } = usePromise(
    (input: string, toneId: ToneId, requested: TranslationTarget) => {
      setStreamed("");
      return translate(
        {
          text: input,
          tone: toneId,
          target: requested,
          signal: abortable.current?.signal,
          onPartial: (partial) => setStreamed(partial.text),
        },
        { providers, store: localStore, fetch },
      );
    },
    [text, tone, target],
    {
      abortable,
      onError: (error) =>
        showTranslationError(error, {
          command,
          tone,
          targetLanguage: describeTarget(target),
          textLength: text.length,
          providers,
        }),
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data ? `Translated via ${PROVIDERS[data.provider.id].name}` : "Translating…"}
      markdown={visibleTranslation(data?.text, streamed, isLoading)}
      metadata={data ? <TranslationMetadata result={data} tone={tone} target={target} /> : null}
      actions={
        <ActionPanel>
          {data ? (
            <>
              <Action.Paste content={data.text} />
              <Action.CopyToClipboard content={data.text} />
            </>
          ) : null}
          <Action
            title="Translate Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => void revalidate()}
          />
        </ActionPanel>
      }
    />
  );
}

interface TranslationMetadataProps {
  readonly result: TranslationResult;
  readonly tone: ToneId;
  readonly target: TranslationTarget;
}

function TranslationMetadata({ result, tone, target }: TranslationMetadataProps) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Tone" text={TONES[tone].title} />
      <Detail.Metadata.Label title="Direction" text={formatDirection(result.direction, target)} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Provider" text={PROVIDERS[result.provider.id].name} />
      <Detail.Metadata.Label title="Model" text={result.provider.model} />
      <Detail.Metadata.Label title="Usage" text={formatUsage(result.usage)} />
      <Detail.Metadata.Label title="Duration" text={`${result.durationMs} ms`} />
      {result.skipped.length > 0 ? (
        <Detail.Metadata.TagList title="Skipped">
          {result.skipped.map((failure) => (
            <Detail.Metadata.TagList.Item key={failure.provider} text={failure.summary} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
    </Detail.Metadata>
  );
}
