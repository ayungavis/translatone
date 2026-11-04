import { beforeEach, describe, expect, test } from "bun:test";
import { readInitialInput } from "../input";
import { raycast } from "./test-helpers";

describe("readInitialInput", () => {
  beforeEach(() => raycast.reset());

  test("reads the text selected in the frontmost app", async () => {
    raycast.selectedText = "Halo dunia";

    expect(await readInitialInput()).toEqual({ text: "Halo dunia", source: "selection" });
  });

  test("falls back to the latest clipboard entry", async () => {
    raycast.clipboard.push("Older", "Latest copy");

    expect(await readInitialInput()).toEqual({ text: "Latest copy", source: "clipboard" });
  });

  test("starts empty when there is nothing to read", async () => {
    expect(await readInitialInput()).toEqual({ text: "", source: "none" });
  });
});
