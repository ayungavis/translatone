import { Clipboard, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { buildDebugReport, type DiagnosticContext } from "../core/diagnostics";
import { describeError, type ErrorFix } from "../core/errors";

export async function showTranslationError(
  error: unknown,
  context: DiagnosticContext,
  onRetry?: () => void,
): Promise<void> {
  console.error(error);
  const { title, message, fix } = describeError(error);
  const copyDebugInfo = copyDebugInfoAction(buildDebugReport(error, context));
  const primary = fixAction(fix, onRetry);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: primary ?? copyDebugInfo,
    ...(primary ? { secondaryAction: copyDebugInfo } : {}),
  });
}

function fixAction(
  fix: ErrorFix,
  onRetry: (() => void) | undefined,
): Toast.ActionOptions | undefined {
  if (fix === "open_preferences") {
    return {
      title: "Open Preferences",
      onAction: () => {
        void openExtensionPreferences();
      },
    };
  }
  if (fix === "retry" && onRetry) {
    return { title: "Retry", onAction: () => onRetry() };
  }
  return undefined;
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
