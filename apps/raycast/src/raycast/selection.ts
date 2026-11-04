import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import type { Fetch } from "../core/chat-client";
import { confirmationMessage } from "../core/output";
import { describeTarget } from "../core/target";
import { TONES } from "../core/tones";
import { translate } from "../core/translate";
import { showTranslationError } from "./feedback";
import { readInitialInput } from "./input";
import { deliverTranslation } from "./output";
import { loadSettings } from "./settings";
import { localStore } from "./storage";

export async function translateSelectionInPlace(fetchFn: Fetch = fetch): Promise<void> {
  const input = await readInitialInput();
  if (input.source !== "selection") {
    await launchCommand({ name: "translate", type: LaunchType.UserInitiated });
    return;
  }

  const { defaultTone: tone, target, providers } = loadSettings();
  await showToast({
    style: Toast.Style.Animated,
    title: "Translating…",
    message: `${TONES[tone].title} · ${describeTarget(target)}`,
  });

  try {
    const result = await translate(
      { text: input.text, tone, target },
      { providers, store: localStore, fetch: fetchFn },
    );
    await deliverTranslation(
      "replace",
      result.text,
      confirmationMessage("replace", { providerId: result.provider.id, skipped: result.skipped }),
    );
  } catch (error) {
    await showTranslationError(error, {
      command: "translate-selection",
      tone,
      targetLanguage: describeTarget(target),
      textLength: input.text.length,
      providers,
    });
  }
}
