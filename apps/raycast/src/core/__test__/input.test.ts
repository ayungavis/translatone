import { describe, expect, test } from "bun:test";
import {
  describeInputSource,
  MAX_CLIPBOARD_PREFILL_LENGTH,
  resolveInitialInput,
  sourceOfSubmission,
  type InputReaders,
} from "../input";

function readers(selection: string | Error, clipboard: string | undefined): InputReaders {
  return {
    readSelection: () =>
      selection instanceof Error ? Promise.reject(selection) : Promise.resolve(selection),
    readClipboard: () => Promise.resolve(clipboard),
  };
}

const noSelection = new Error("Unable to get selected text from frontmost application");

describe("resolveInitialInput", () => {
  test.each([
    ["the selection", readers("  Halo dunia  ", "something else"), "Halo dunia", "selection"],
    [
      "the clipboard when nothing is selected",
      readers(noSelection, "Copied text"),
      "Copied text",
      "clipboard",
    ],
    [
      "the clipboard when the selection is blank",
      readers("   ", "Copied text"),
      "Copied text",
      "clipboard",
    ],
    [
      "the clipboard when the selection only echoes it",
      readers("Copied text", "Copied text"),
      "Copied text",
      "clipboard",
    ],
    ["nothing when both are empty", readers(noSelection, undefined), "", "none"],
    ["nothing when the clipboard is blank", readers(noSelection, "  \n "), "", "none"],
  ] as const)("uses %s", async (_label, sources, text, source) => {
    expect(await resolveInitialInput(sources)).toEqual({ text, source });
  });

  test("keeps a long selection", async () => {
    const long = "a".repeat(MAX_CLIPBOARD_PREFILL_LENGTH + 1);

    expect(await resolveInitialInput(readers(long, undefined))).toEqual({
      text: long,
      source: "selection",
    });
  });

  test("ignores a clipboard too long to be a message", async () => {
    const long = "a".repeat(MAX_CLIPBOARD_PREFILL_LENGTH + 1);

    expect(await resolveInitialInput(readers(noSelection, long))).toEqual({
      text: "",
      source: "none",
    });
  });

  test("treats an unreadable clipboard as empty", async () => {
    const sources: InputReaders = {
      readSelection: () => Promise.reject(noSelection),
      readClipboard: () => Promise.reject(new Error("pasteboard unavailable")),
    };

    expect(await resolveInitialInput(sources)).toEqual({ text: "", source: "none" });
  });
});

describe("describeInputSource", () => {
  test.each([
    ["selection", "From selection"],
    ["clipboard", "From clipboard"],
    ["none", undefined],
  ] as const)("labels %s", (source, label) => {
    expect(describeInputSource(source)).toBe(label);
  });
});

describe("sourceOfSubmission", () => {
  const initial = { text: "Halo dunia", source: "selection" } as const;

  test.each([
    ["the pre-filled text unchanged", "Halo dunia", "selection"],
    ["the pre-filled text with extra spaces", "  Halo dunia \n", "selection"],
    ["edited text", "Halo dunia!", "none"],
  ] as const)("credits the source for %s", (_label, submitted, source) => {
    expect(sourceOfSubmission(initial, submitted)).toBe(source);
  });
});
