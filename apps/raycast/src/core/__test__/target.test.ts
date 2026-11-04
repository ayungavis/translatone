import { describe, expect, test } from "bun:test";
import { LANGUAGES, resolveLanguage, type Language } from "../languages";
import {
  AUTO_TARGET,
  describeTarget,
  directionTagInstruction,
  formatDirection,
  languagePair,
  parseDirectionTag,
  resolveTarget,
  targetInstruction,
  targetOptions,
  type TranslationTarget,
} from "../target";

function language(code: string): Language {
  const found = resolveLanguage(code, { code: "missing", name: "Missing" });
  expect(found.code).toBe(code);
  return found;
}

const english = language("en");
const indonesian = language("id");
const japanese = language("ja");
const pair = languagePair(english, indonesian);

describe("languagePair", () => {
  test("pairs two different languages", () => {
    expect(pair).toEqual({ kind: "pair", main: english, second: indonesian });
  });

  test("falls back to a fixed target when both languages are the same", () => {
    expect(languagePair(english, english)).toEqual({ kind: "fixed", language: english });
  });
});

describe("describeTarget", () => {
  test.each([
    ["a pair", pair, "Auto · English ↔ Indonesian"],
    ["a fixed target", { kind: "fixed", language: japanese } as const, "→ Japanese"],
  ])("describes %s", (_label, target, expected) => {
    expect(describeTarget(target)).toBe(expected);
  });
});

describe("targetOptions", () => {
  test("offers the automatic pair first, then every language", () => {
    const options = targetOptions(pair);

    expect(options[0]).toEqual({ value: AUTO_TARGET, title: "Auto · English ↔ Indonesian" });
    expect(options[2]).toEqual({ value: "id", title: "→ Indonesian" });
    expect(options).toHaveLength(LANGUAGES.length + 1);
  });
});

describe("resolveTarget", () => {
  test.each([
    ["auto", pair],
    ["ja", { kind: "fixed", language: japanese }],
    ["xx", pair],
    [undefined, pair],
  ] satisfies [string | undefined, TranslationTarget][])("resolves %p", (value, expected) => {
    expect(resolveTarget(value, pair)).toEqual(expected);
  });
});

describe("targetInstruction", () => {
  test("sends the main language to the second and everything else to the main", () => {
    expect(targetInstruction(pair)).toBe(
      "Detect the language of the user's text. If it is English, translate it into Indonesian. Otherwise, translate it into English.",
    );
  });

  test("translates into a fixed language", () => {
    expect(targetInstruction({ kind: "fixed", language: japanese })).toBe(
      "Translate the user's text into Japanese.",
    );
  });
});

describe("directionTagInstruction", () => {
  test("asks for a source and target code tag using the supported codes", () => {
    const instruction = directionTagInstruction();

    expect(instruction).toContain("⟦source→target⟧");
    expect(instruction).toContain("⟦id→en⟧");
    for (const { code } of LANGUAGES) {
      expect(instruction).toContain(code);
    }
  });
});

describe("formatDirection", () => {
  test("shows the reported source and target", () => {
    expect(formatDirection({ source: "Indonesian", target: "English" }, pair)).toBe(
      "Indonesian → English",
    );
  });

  test("falls back to the requested target when the direction is unknown", () => {
    expect(formatDirection(undefined, pair)).toBe("Auto · English ↔ Indonesian");
  });
});

describe("parseDirectionTag", () => {
  test.each([
    ["⟦id→en⟧\nHello there", "Hello there"],
    ["  ⟦ id -> en ⟧  Hello there", "Hello there"],
    ["⟦id>en⟧\n\nHello there", "Hello there"],
  ])("reads the direction from %p", (reply, text) => {
    expect(parseDirectionTag(reply)).toEqual({
      text,
      direction: { source: "Indonesian", target: "English" },
    });
  });

  test("shows unknown language codes in upper case", () => {
    expect(parseDirectionTag("⟦sw→en⟧ Hello").direction).toEqual({
      source: "SW",
      target: "English",
    });
  });

  test("leaves a reply without a tag unchanged", () => {
    expect(parseDirectionTag("Hello there")).toEqual({
      text: "Hello there",
      direction: undefined,
    });
  });
});
