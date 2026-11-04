import { mock } from "bun:test";
import type { Toast } from "@raycast/api";

const NO_SELECTION = new Error("Unable to get selected text from frontmost application");

class RaycastFake {
  preferences: Record<string, unknown> = {};
  selectedText: string | Error = NO_SELECTION;
  readonly storage = new Map<string, string>();
  readonly toasts: Toast.Options[] = [];
  readonly clipboard: string[] = [];
  readonly openExtensionPreferences = mock(() => Promise.resolve());

  reset(): void {
    this.preferences = {};
    this.selectedText = NO_SELECTION;
    this.storage.clear();
    this.toasts.length = 0;
    this.clipboard.length = 0;
    this.openExtensionPreferences.mockClear();
  }
}

export const raycast = new RaycastFake();

void mock.module("@raycast/api", () => ({
  getPreferenceValues: () => raycast.preferences,
  openExtensionPreferences: () => raycast.openExtensionPreferences(),
  getSelectedText: () =>
    raycast.selectedText instanceof Error
      ? Promise.reject(raycast.selectedText)
      : Promise.resolve(raycast.selectedText),
  LocalStorage: {
    getItem: (key: string) => Promise.resolve(raycast.storage.get(key)),
    setItem: (key: string, value: string) => {
      raycast.storage.set(key, value);
      return Promise.resolve();
    },
  },
  Clipboard: {
    copy: (content: string) => {
      raycast.clipboard.push(content);
      return Promise.resolve();
    },
    readText: () => Promise.resolve(raycast.clipboard.at(-1)),
  },
  Toast: { Style: { Animated: "ANIMATED", Success: "SUCCESS", Failure: "FAILURE" } },
  showToast: (options: Toast.Options) => {
    raycast.toasts.push(options);
    return Promise.resolve();
  },
}));
