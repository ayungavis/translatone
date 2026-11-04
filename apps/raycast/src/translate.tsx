import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { formatDetailMarkdown, translationKey } from "./core/detail";
import {
  describeInputSource,
  sourceOfSubmission,
  TYPING_DELAY_MS,
  type InitialInput,
} from "./core/input";
import { confirmationMessage, outputActions, type OutputAction } from "./core/output";
import { PROVIDERS, providersAfter, type ProviderConfig } from "./core/providers";
import {
  formatDirection,
  resolveTarget,
  swapTarget,
  targetOptions,
  targetValue,
  type TranslationTarget,
} from "./core/target";
import { isToneId, TONE_IDS, TONES, type ToneId } from "./core/tones";
import { translate, visibleTranslation, type TranslationResult } from "./core/translate";
import { formatUsage } from "./core/usage";
import { showTranslationError } from "./raycast/feedback";
import { readInitialInput } from "./raycast/input";
import { deliverTranslation } from "./raycast/output";
import { loadSettings } from "./raycast/settings";
import { localStore } from "./raycast/storage";

const OUTPUT_TITLES: Readonly<Record<OutputAction, string>> = {
  paste: "Paste to Active App",
  copy: "Copy Translation",
};

const OUTPUT_ICONS: Readonly<Record<OutputAction, Icon>> = {
  paste: Icon.Clipboard,
  copy: Icon.CopyClipboard,
};

export default function TranslateCommand() {
  const settings = useMemo(() => loadSettings(), []);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [initialInput, setInitialInput] = useState<InitialInput>({ text: "", source: "none" });
  const [selectedTarget, setSelectedTarget] = useState(targetValue(settings.target));
  const [tone, setTone] = useCachedState<ToneId>("tone", settings.defaultTone);

  const { isLoading: isReadingInput } = usePromise(readInitialInput, [], {
    onData: (input) => {
      setInitialInput(input);
      setText(input.text);
      setQuery(input.text);
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text), TYPING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const target = useMemo(
    () => resolveTarget(selectedTarget, settings.target),
    [selectedTarget, settings.target],
  );
  const translation = useTranslation(query, target, tone, settings.providers);
  const hasQuery = query.trim() !== "";
  const sourceLabel = describeInputSource(sourceOfSubmission(initialInput, query));

  const { result } = translation;
  const pane = (
    <List.Item.Detail
      markdown={formatDetailMarkdown(translation.visibleText, query.trim(), sourceLabel)}
      metadata={result ? <TranslationMetadata result={result} target={target} /> : undefined}
    />
  );

  const actions = (
    <ActionPanel>
      {result ? (
        <ActionPanel.Section>
          {outputActions(settings.primaryAction).map((action) => (
            <OutputActionItem key={action} action={action} result={result} />
          ))}
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action
          title="Swap Direction"
          icon={Icon.Switch}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => setSelectedTarget(targetValue(swapTarget(result?.direction, target)))}
        />
        {result && settings.providers.length > 1 ? (
          <Action
            title="Retry with Next Provider"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={translation.retryWithNextProvider}
          />
        ) : null}
        {hasQuery ? (
          <Action.CopyToClipboard
            title="Copy Original"
            content={query.trim()}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        ) : null}
        <Action
          title="Open Preferences"
          icon={Icon.Gear}
          onAction={() => void openExtensionPreferences()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isReadingInput || translation.isLoading}
      isShowingDetail={hasQuery}
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Type or paste text to translate…"
      selectedItemId={tone}
      onSelectionChange={(id) => {
        if (id !== null && isToneId(id)) {
          setTone(id);
        }
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Translate To" value={selectedTarget} onChange={setSelectedTarget}>
          {targetOptions(settings.target).map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      {hasQuery ? (
        <List.Section title="Tone">
          {TONE_IDS.map((id) => (
            <List.Item
              key={id}
              id={id}
              title={TONES[id].title}
              subtitle={TONES[id].summary}
              detail={pane}
              actions={actions}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title="Translate anything with the right tone"
          description="Select text in any app before opening TranslaTone, or type here. Pick a tone with ↑↓ and press ↵ to paste."
          actions={actions}
        />
      )}
    </List>
  );
}

interface OutputActionItemProps {
  readonly action: OutputAction;
  readonly result: TranslationResult;
}

function OutputActionItem({ action, result }: OutputActionItemProps) {
  return (
    <Action
      title={OUTPUT_TITLES[action]}
      icon={OUTPUT_ICONS[action]}
      onAction={() =>
        void deliverTranslation(
          action,
          result.text,
          confirmationMessage(action, { providerId: result.provider.id, skipped: result.skipped }),
        )
      }
    />
  );
}

interface TranslationMetadataProps {
  readonly result: TranslationResult;
  readonly target: TranslationTarget;
}

function TranslationMetadata({ result, target }: TranslationMetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Direction"
        text={formatDirection(result.direction, target)}
      />
      <List.Item.Detail.Metadata.Label
        title="Provider"
        text={`${PROVIDERS[result.provider.id].name} · ${result.provider.model}`}
      />
      <List.Item.Detail.Metadata.Label title="Usage" text={formatUsage(result.usage)} />
      <List.Item.Detail.Metadata.Label title="Duration" text={`${result.durationMs} ms`} />
      {result.skipped.length > 0 ? (
        <List.Item.Detail.Metadata.TagList title="Skipped">
          {result.skipped.map((failure) => (
            <List.Item.Detail.Metadata.TagList.Item key={failure.provider} text={failure.summary} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

interface Streamed {
  readonly key: string;
  readonly text: string;
}

interface Attempt {
  readonly key: string;
  readonly providers: readonly ProviderConfig[];
}

function useTranslation(
  query: string,
  target: TranslationTarget,
  tone: ToneId,
  providers: readonly ProviderConfig[],
) {
  const [cache, setCache] = useState<ReadonlyMap<string, TranslationResult>>(new Map());
  const [streamed, setStreamed] = useState<Streamed>({ key: "", text: "" });
  const [lastResult, setLastResult] = useState<TranslationResult | undefined>(undefined);
  const [failedKey, setFailedKey] = useState<string | undefined>(undefined);
  const [retry, setRetry] = useState<Attempt | undefined>(undefined);

  const key = translationKey(query, target, tone);
  const retrying = retry?.key === key ? retry : undefined;
  const cached = retrying ? undefined : cache.get(key);
  const isLoading = query.trim() !== "" && cached === undefined && failedKey !== key;
  const result = cached ?? (isLoading ? lastResult : undefined);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }
    const controller = new AbortController();
    translate(
      {
        text: query,
        tone,
        target,
        signal: controller.signal,
        onPartial: (partial) => setStreamed({ key, text: partial.text }),
      },
      { providers: retrying?.providers ?? providers, store: localStore, fetch },
    ).then(
      (translated) => {
        setCache((previous) => new Map(previous).set(key, translated));
        setLastResult(translated);
        setRetry(undefined);
        return translated;
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setFailedKey(key);
          void showTranslationError(error, {
            command: "translate",
            tone,
            targetLanguage: formatDirection(undefined, target),
            textLength: query.length,
            providers,
          });
        }
        return undefined;
      },
    );
    return () => controller.abort();
  }, [isLoading, key, query, tone, target, providers, retrying]);

  return {
    result,
    isLoading,
    visibleText: visibleTranslation(
      result?.text,
      streamed.key === key ? streamed.text : "",
      isLoading,
    ),
    retryWithNextProvider: () => {
      if (result) {
        setFailedKey(undefined);
        setRetry({ key, providers: providersAfter(providers, result.provider.id) });
      }
    },
  };
}
