import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { describeError } from "./core/errors";
import { applyModelChoices, clearModelChoice, listModels, saveModelChoice } from "./core/models";
import { PROVIDERS, type ProviderConfig, type ProviderId } from "./core/providers";
import { loadSettings } from "./raycast/settings";
import { localStore } from "./raycast/storage";

export default function ChooseModelCommand() {
  return <ChooseModel />;
}

interface ChooseModelProps {
  readonly onChange?: () => void;
}

export function ChooseModel({ onChange }: ChooseModelProps) {
  const { providers } = useMemo(() => loadSettings(), []);
  const [providerId, setProviderId] = useState<string>(providers[0]?.id ?? "");
  const provider = providers.find(({ id }) => id === providerId);
  const { data: active, revalidate } = usePromise(
    (configured: readonly ProviderConfig[]) => applyModelChoices(localStore, configured),
    [providers],
  );
  const models = usePromise(
    async (selected: ProviderConfig | undefined) =>
      selected ? listModels(fetch, selected) : Promise.resolve([]),
    [provider],
  );
  const activeModel = active?.find(({ id }) => id === providerId)?.model;

  const changeModel = async (id: ProviderId, change: () => Promise<void>, message: string) => {
    await change();
    await revalidate();
    onChange?.();
    await showToast({ style: Toast.Style.Success, title: PROVIDERS[id].name, message });
  };

  const commonActions = provider ? (
    <ActionPanel.Section>
      <Action
        title="Use Preference Model"
        icon={Icon.ArrowCounterClockwise}
        onAction={() =>
          void changeModel(
            provider.id,
            () => clearModelChoice(localStore, provider.id),
            `Back to ${provider.model}`,
          )
        }
      />
      <Action
        title="Open Preferences"
        icon={Icon.Gear}
        onAction={() => void openExtensionPreferences()}
      />
    </ActionPanel.Section>
  ) : (
    <Action
      title="Open Preferences"
      icon={Icon.Gear}
      onAction={() => void openExtensionPreferences()}
    />
  );

  return (
    <List
      isLoading={models.isLoading}
      searchBarPlaceholder="Search models"
      searchBarAccessory={
        <List.Dropdown tooltip="Provider" value={providerId} onChange={setProviderId}>
          {providers.map(({ id }) => (
            <List.Dropdown.Item key={id} value={id} title={PROVIDERS[id].name} />
          ))}
        </List.Dropdown>
      }
    >
      {provider === undefined ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No provider configured"
          description="Add an API key in the extension preferences first."
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : models.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load models"
          description={`${describeError(models.error).message}. You can still type a model in the preferences.`}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : (
        (models.data ?? []).map((model) => (
          <List.Item
            key={model}
            title={model}
            icon={model === activeModel ? Icon.CheckCircle : Icon.Circle}
            accessories={model === activeModel ? [{ tag: "Active" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Use Model"
                  icon={Icon.Checkmark}
                  onAction={() =>
                    void changeModel(
                      provider.id,
                      () => saveModelChoice(localStore, provider.id, model),
                      `Now using ${model}`,
                    )
                  }
                />
                {commonActions}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
