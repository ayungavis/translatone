# TranslaTone Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Translate as you type in one view: pick a tone with ↑↓, see the original below the result, and press ↵ to paste or ⌘↵ to copy
- Translate text with Default, LinkedIn, Email, and Chat tones
- Keep the original meaning in every tone, with names, numbers, links, and mentions left unchanged
- Translate between a main and second language automatically, and show the detected direction
- Show the translation as it streams in
- Pre-fill Translate with the selected text and show where it came from; when nothing is selected, preview the clipboard translation until you start typing
- Translate Selection replaces the selected text in place, and opens Translate when nothing is selected
- Bring your own key: pick OpenAI, Anthropic, OpenRouter, or any OpenAI-compatible endpoint, set your API key and model, and it is tried first
- Choose Model lists the models your key can use and switches with ↵; open it from Raycast or with ⌘M in Translate
- Choose a preferred provider; when it is rate-limited, out of quota, down, or times out, TranslaTone falls back to your other providers automatically
- Local usage tracking per provider, API key, and model
- Errors explain the fix: a setup screen with free key links when no provider is configured, and failure toasts with Retry or Open Preferences plus Copy Debug Info
