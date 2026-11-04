export type InputSource = "selection" | "clipboard" | "none";

export interface InitialInput {
  readonly text: string;
  readonly source: InputSource;
}

export interface InputReaders {
  readonly readSelection: () => Promise<string>;
  readonly readClipboard: () => Promise<string | undefined>;
}

export const MAX_CLIPBOARD_PREFILL_LENGTH = 2_000;

export const TYPING_DELAY_MS = 700;

const SOURCE_LABELS: Readonly<Record<InputSource, string | undefined>> = {
  selection: "From selection",
  clipboard: "From clipboard",
  none: undefined,
};

export async function resolveInitialInput(readers: InputReaders): Promise<InitialInput> {
  const [selection, clipboard] = await Promise.all([
    readers.readSelection().then(clean, () => ""),
    readers.readClipboard().then(clean, () => ""),
  ]);
  if (selection !== "" && selection !== clipboard) {
    return { text: selection, source: "selection" };
  }
  if (clipboard !== "" && clipboard.length <= MAX_CLIPBOARD_PREFILL_LENGTH) {
    return { text: clipboard, source: "clipboard" };
  }
  return { text: "", source: "none" };
}

export function describeInputSource(source: InputSource): string | undefined {
  return SOURCE_LABELS[source];
}

export function sourceOfSubmission(initial: InitialInput, submitted: string): InputSource {
  return clean(submitted) === initial.text ? initial.source : "none";
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}
