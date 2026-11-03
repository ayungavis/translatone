import {
  Action,
  ActionPanel,
  Form,
  Icon,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useMemo } from "react";
import { findLanguage, LANGUAGES } from "./core/languages";
import { PROVIDERS } from "./core/providers";
import { isToneId, TONE_IDS, TONES } from "./core/tones";
import { formatUsage } from "./core/usage";
import { loadSettings, type Settings } from "./raycast/settings";
import { TranslationDetail } from "./raycast/translation-detail";
import { useProviderUsage, type ProviderUsage } from "./raycast/use-provider-usage";

interface TranslateFormValues {
  text: string;
  tone: string;
  language: string;
}

export default function TranslateCommand() {
  const settings = useMemo(() => loadSettings(), []);
  const { push } = useNavigation();
  const { data: providerUsage, isLoading } = useProviderUsage(settings.providers);

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
      <Form.Description title="Providers" text={describeProviders(providerUsage)} />
    </Form>
  );
}

function createTranslationView(values: TranslateFormValues, settings: Settings) {
  return (
    <TranslationDetail
      command="translate"
      text={values.text}
      tone={isToneId(values.tone) ? values.tone : settings.defaultTone}
      language={findLanguage(values.language) ?? settings.defaultLanguage}
      providers={settings.providers}
    />
  );
}

function describeProviders(providerUsage: readonly ProviderUsage[] | undefined): string {
  if (providerUsage === undefined) {
    return "Loading…";
  }
  if (providerUsage.length === 0) {
    return "No provider configured. Add an API key in the extension preferences.";
  }
  return providerUsage
    .map(({ provider, usage }) => `${PROVIDERS[provider.id].name}: ${formatUsage(usage)}`)
    .join("\n");
}
