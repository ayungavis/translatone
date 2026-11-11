import { beforeEach, describe, expect, spyOn, test } from "bun:test";
import type { Fetch } from "../../core/chat-client";
import { completionResponse, rejectionOf, scriptedFetch } from "../../core/__test__/test-helpers";
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

  test("offers preferences for invalid settings without sending or pasting text", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = { byokProvider: "custom", byokModel: "model" };
    const { fetch, calls } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(calls).toHaveLength(0);
    expect(raycast.events).not.toContain("paste:unused");
    expect(raycast.toasts[0]).toMatchObject({
      title: "Check provider settings",
      primaryAction: { title: "Open Preferences" },
    });
  });

  test("surfaces unexpected settings failures instead of hiding them", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = {
      get groqApiKey() {
        throw new Error("Preferences unavailable");
      },
    };
    const { fetch } = groqAnswering("unused");

    expect(await rejectionOf(translateSelectionInPlace(fetch))).toMatchObject({
      message: "Preferences unavailable",
    });
  });

  test("uses the model picked with Choose Model", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.storage.set("model:groq", "llama-3.3-70b-versatile");
    const { fetch, calls } = groqAnswering("Hello world");

    await translateSelectionInPlace(fetch);

    const body = calls[0]?.init.body;
    expect(typeof body === "string" ? JSON.parse(body) : body).toMatchObject({
      model: "llama-3.3-70b-versatile",
    });
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

  test("offers a retry that translates the selection again", async () => {
    raycast.selectedText = "Halo dunia";
    let attempts = 0;
    const flaky: Fetch = async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("busy", { status: 503 })
        : completionResponse("Hello world");
    };

    await translateSelectionInPlace(flaky);
    const retry = raycast.toasts[1]?.primaryAction;
    expect(retry?.title).toBe("Retry");
    retry?.onAction?.(Object.create(null));
    await Bun.sleep(0);

    expect(raycast.events).toContain("paste:Hello world");
  });

  test("reports a failure without touching the selection", async () => {
    raycast.selectedText = "Halo dunia";
    raycast.preferences = {};
    const { fetch } = groqAnswering("unused");

    await translateSelectionInPlace(fetch);

    expect(raycast.events).toEqual(["toast:Translating…", "toast:No provider configured"]);
  });
});
