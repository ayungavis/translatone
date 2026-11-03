import { mock } from "bun:test";
import type { Toast } from "@raycast/api";

class RaycastFake {
  preferences: Record<string, unknown> = {};
  readonly storage = new Map<string, string>();
  readonly toasts: Toast.Options[] = [];
  readonly clipboard: string[] = [];
  readonly openExtensionPreferences = mock(() => Promise.resolve());

  reset(): void {
    this.preferences = {};
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
  },
  Toast: { Style: { Animated: "ANIMATED", Success: "SUCCESS", Failure: "FAILURE" } },
  showToast: (options: Toast.Options) => {
    raycast.toasts.push(options);
    return Promise.resolve();
  },
}));
