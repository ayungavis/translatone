# Contributing to TranslaTone

Thanks for helping improve TranslaTone.

## Setup

1. Install [Bun](https://bun.sh) 1.3+, Node.js 24+, and [Raycast](https://raycast.com).
2. Fork and clone the repository.
3. Run `bun install`, then `bun run dev` to load the extension in Raycast.

## Guidelines

- Keep translation logic in `apps/raycast/src/core` free of `@raycast/api` imports so it stays unit-testable.
- Add or update tests in `*.test.ts` next to the code you change.
- Prefer clear names and small functions over comments.
- Do not log or include API keys in errors, debug reports, or tests.
- Use `bun` for dependencies. Do not commit `package-lock.json`; the release workflow generates it for the Raycast Store.

## Before opening a pull request

```bash
bun run check
```

Then, inside `apps/raycast`, run the same checks the Raycast Store uses:

```bash
bun run build
bun run lint
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org), for example `feat: add Japanese honorific tone` or `fix: handle empty selection`.

## Reporting bugs

Open an issue with steps to reproduce and the **Copy Debug Info** output from the error toast.
