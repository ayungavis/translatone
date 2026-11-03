import { Clipboard, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { buildDebugReport, type DiagnosticContext } from "../core/diagnostics";
import { describeError, NoProviderConfiguredError } from "../core/errors";

export async function showTranslationError(
  error: unknown,
  context: DiagnosticContext,
): Promise<void> {
  console.error(error);
  const { title, message } = describeError(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction:
      error instanceof NoProviderConfiguredError
        ? openPreferencesAction()
        : copyDebugInfoAction(buildDebugReport(error, context)),
  });
}

function openPreferencesAction(): Toast.ActionOptions {
  return {
    title: "Open Preferences",
    onAction: () => {
      void openExtensionPreferences();
    },
  };
}

function copyDebugInfoAction(report: string): Toast.ActionOptions {
  return {
    title: "Copy Debug Info",
    onAction: () => {
      void Clipboard.copy(report).then(() =>
        showToast({ style: Toast.Style.Success, title: "Debug info copied" }),
      );
    },
  };
}
