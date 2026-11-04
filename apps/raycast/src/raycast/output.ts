import { Clipboard, closeMainWindow, PopToRootType, showHUD } from "@raycast/api";
import type { OutputAction } from "../core/output";

export async function deliverTranslation(
  action: OutputAction,
  text: string,
  confirmation: string,
): Promise<void> {
  if (action === "paste") {
    await closeMainWindow();
    await Clipboard.paste(text);
  } else {
    await Clipboard.copy(text);
  }
  await showHUD(confirmation, { popToRootType: PopToRootType.Immediate });
}
