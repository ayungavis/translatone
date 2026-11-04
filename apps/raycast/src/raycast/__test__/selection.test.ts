import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import { completionResponse, scriptedFetch } from "../../core/__test__/test-helpers";
import { translateSelectionInPlace } from "../selection";
import { raycast } from "./test-helpers";

function groqAnswering(content: string) {
  return scriptedFetch(new Map([["api.groq.com", async () => completionResponse(content)]]));
}

describe("translateSelectionInPlace", () => {
  const consoleError = spyOn(console, "error");

  beforeEach(() => {
    raycast.reset();
    raycast.preferences = { groqApiKey: "groq-key" };
    consoleError.mockImplementation(() => undefined);
  });

  test("replaces the selection with the translation and confirms", async () => {
    raycast.selectedText = "Halo dunia";
    const { fetch, calls } = groqAnswering("⟦id→en⟧\nHello world");

    await translateSelectionInPlace(fetch);

    expect(calls).toHaveLength(1);
    expect(raycast.toasts[0]).toMatchObject({
      style: "ANIMATED",
      title: "Translating…",
      message: "Default · Auto · English ↔ Indonesian",
    });
    expect(raycast.events).toEqual([
      "toast:Translating…",
      "closeMainWindow",
      "paste:Hello world",
      "hud:Replaced selection · via Groq",
    ]);
  });

  test("uses the tone chosen in preferences", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = { groqApiKey: "groq-key", defaultTone: "email" };
    const { fetch } = groqAnswering("Hello world");

    await translateSelectionInPlace(fetch);

    expect(raycast.toasts[0]?.message).toBe("Email · Auto · English ↔ Indonesian");
  });

  test.each([
    ["nothing is selected", () => undefined],
    [
      "the selection only echoes the clipboard",
      () => {
        raycast.selectedText = "Copied";
        raycast.clipboard.push("Copied");
      },
    ],
  ])("opens the Translate view when %s", async (_label, arrange) => {
    arrange();
    const { fetch, calls } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(calls).toHaveLength(0);
    expect(raycast.events).toEqual(["launch:translate:userInitiated"]);
  });

  test("reports a failure without touching the selection", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = {};
    const { fetch } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(raycast.events).toEqual(["toast:Translating…", "toast:No provider configured"]);
  });
});
