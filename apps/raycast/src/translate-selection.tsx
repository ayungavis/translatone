import { Detail, getSelectedText, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { loadSettings } from "./raycast/settings";
import { TranslationDetail } from "./raycast/translation-detail";

const NO_SELECTION_MESSAGE = "Select text in any app, then run Translate Selection again.";

export default function TranslateSelectionCommand() {
  const settings = useMemo(() => loadSettings(), []);
  const { data: selectedText, isLoading } = usePromise(getSelectedText, [], {
    onError: async () => {
      await showToast({ style: Toast.Style.Failure, title: "No text selected" });
    },
  });

  if (selectedText === undefined) {
    return <Detail isLoading={isLoading} markdown={isLoading ? "" : NO_SELECTION_MESSAGE} />;
  }

  return (
    <TranslationDetail
      command="translate-selection"
      text={selectedText}
      tone={settings.defaultTone}
      target={settings.target}
      providers={settings.providers}
    />
  );
}
