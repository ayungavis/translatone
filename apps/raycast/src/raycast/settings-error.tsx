import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";
import type { InvalidSettingsError } from "../core/errors";

export function SettingsErrorView({ error }: { readonly error: InvalidSettingsError }) {
  return (
    <Detail
      markdown={`# Check provider settings\n\n${error.message}`}
      actions={
        <ActionPanel>
          <Action title="Open Preferences" onAction={() => void openExtensionPreferences()} />
        </ActionPanel>
      }
    />
  );
}
