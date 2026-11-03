import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import type { Toast } from "@raycast/api";
import type { DiagnosticContext } from "../../core/diagnostics";
import { NoProviderConfiguredError, ProviderError } from "../../core/errors";
import { providerConfig } from "../../core/__test__/test-helpers";
import { showTranslationError } from "../feedback";
import { raycast } from "./test-helpers";

const context: DiagnosticContext = {
  command: "translate",
  tone: "default",
  targetLanguage: "en",
  textLength: 5,
  providers: [providerConfig("groq")],
};

function triggerPrimaryAction(toast: Toast.Options | undefined): void {
  const action = toast?.primaryAction;
  if (action?.onAction === undefined) {
    throw new Error("Expected the toast to have a primary action");
  }
  action.onAction(Object.create(null));
}

describe("showTranslationError", () => {
  const consoleError = spyOn(console, "error");

  beforeEach(() => {
    raycast.reset();
    consoleError.mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockReset();
  });

  test("offers to open preferences when no provider is configured", async () => {
    await showTranslationError(new NoProviderConfiguredError(), context);

    expect(raycast.toasts[0]).toMatchObject({
      style: "FAILURE",
      title: "No provider configured",
      primaryAction: { title: "Open Preferences" },
    });

    triggerPrimaryAction(raycast.toasts[0]);

    expect(raycast.openExtensionPreferences).toHaveBeenCalledTimes(1);
  });

  test("offers a copyable debug report for provider failures", async () => {
    const error = new ProviderError("groq", "unauthorized", "bad key", { status: 401 });

    await showTranslationError(error, context);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(raycast.toasts[0]).toMatchObject({
      style: "FAILURE",
      title: "Translation failed",
      message: "Groq: invalid API key",
      primaryAction: { title: "Copy Debug Info" },
    });

    triggerPrimaryAction(raycast.toasts[0]);
    await Bun.sleep(0);

    expect(raycast.clipboard).toHaveLength(1);
    expect(raycast.clipboard[0]).toContain('"reason": "unauthorized"');
    expect(raycast.clipboard[0]).not.toContain("groq-key");
    expect(raycast.toasts[1]).toMatchObject({ style: "SUCCESS", title: "Debug info copied" });
  });
});
