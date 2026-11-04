import {
  Action,
  ActionPanel,
  Form,
  Icon,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { describeInputSource, sourceOfSubmission, type InitialInput } from "./core/input";
import type { ProviderConfig } from "./core/providers";
import { AUTO_TARGET, resolveTarget, targetOptions } from "./core/target";
import { resolveTone, TONE_IDS, TONES } from "./core/tones";
import { loadProviderUsage, summarizeProviderUsage } from "./core/usage";
import { readInitialInput } from "./raycast/input";
import { loadSettings, type Settings } from "./raycast/settings";
import { localStore } from "./raycast/storage";
import { TranslationDetail } from "./raycast/translation-detail";

interface TranslateFormValues {
  text: string;
  tone: string;
  target: string;
}

export default function TranslateCommand() {
  const settings = useMemo(() => loadSettings(), []);
  const { push } = useNavigation();
  const { data: providerUsage, isLoading } = usePromise(
    (providers: readonly ProviderConfig[]) => loadProviderUsage(localStore, providers, new Date()),
    [settings.providers],
  );

  const { handleSubmit, itemProps, setValue } = useForm<TranslateFormValues>({
    initialValues: {
      text: "",
      tone: settings.defaultTone,
      target: AUTO_TARGET,
    },
    validation: { text: FormValidation.Required },
    onSubmit: (values: TranslateFormValues): void =>
      push(createTranslationView(values, settings, initialInput)),
  });
  const { data: initialInput } = usePromise(readInitialInput, [], {
    onData: (input: InitialInput): void => setValue("text", input.text),
  });
  const sourceLabel = describeInputSource(initialInput?.source ?? "none");

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" icon={Icon.Globe} onSubmit={handleSubmit} />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Text"
        placeholder="Type or paste text to translate"
        {...(sourceLabel ? { info: sourceLabel } : {})}
        {...itemProps.text}
      />
      <Form.Dropdown title="Tone" {...itemProps.tone}>
        {TONE_IDS.map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={TONES[id].title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Translate To" {...itemProps.target}>
        {targetOptions(settings.target).map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Providers"
        text={providerUsage ? summarizeProviderUsage(providerUsage) : "Loading…"}
      />
    </Form>
  );
}

function createTranslationView(
  values: TranslateFormValues,
  settings: Settings,
  initialInput: InitialInput | undefined,
) {
  return (
    <TranslationDetail
      command="translate"
      text={values.text}
      source={initialInput ? sourceOfSubmission(initialInput, values.text) : "none"}
      tone={resolveTone(values.tone, settings.defaultTone)}
      target={resolveTarget(values.target, settings.target)}
      providers={settings.providers}
    />
  );
}
