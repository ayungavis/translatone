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
import { LANGUAGES, resolveLanguage } from "./core/languages";
import type { ProviderConfig } from "./core/providers";
import { resolveTone, TONE_IDS, TONES } from "./core/tones";
import { loadProviderUsage, summarizeProviderUsage } from "./core/usage";
import { loadSettings, type Settings } from "./raycast/settings";
import { localStore } from "./raycast/storage";
import { TranslationDetail } from "./raycast/translation-detail";

interface TranslateFormValues {
  text: string;
  tone: string;
  language: string;
}

export default function TranslateCommand() {
  const settings = useMemo(() => loadSettings(), []);
  const { push } = useNavigation();
  const { data: providerUsage, isLoading } = usePromise(
    (providers: readonly ProviderConfig[]) => loadProviderUsage(localStore, providers, new Date()),
    [settings.providers],
  );

  const { handleSubmit, itemProps } = useForm<TranslateFormValues>({
    initialValues: {
      text: "",
      tone: settings.defaultTone,
      language: settings.defaultLanguage.code,
    },
    validation: { text: FormValidation.Required },
    onSubmit: (values) => push(createTranslationView(values, settings)),
  });

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
        {...itemProps.text}
      />
      <Form.Dropdown title="Tone" {...itemProps.tone}>
        {TONE_IDS.map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={TONES[id].title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Language" {...itemProps.language}>
        {LANGUAGES.map((language) => (
          <Form.Dropdown.Item key={language.code} value={language.code} title={language.name} />
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

function createTranslationView(values: TranslateFormValues, settings: Settings) {
  return (
    <TranslationDetail
      command="translate"
      text={values.text}
      tone={resolveTone(values.tone, settings.defaultTone)}
      language={resolveLanguage(values.language, settings.defaultLanguage)}
      providers={settings.providers}
    />
  );
}
