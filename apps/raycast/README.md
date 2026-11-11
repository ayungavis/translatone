# TranslaTone

Translate selected, typed, or clipboard text with a tone in Raycast. Configure at least one provider in the extension preferences before translating.

## Commands

- **Translate** opens the translation view. Selected text is translated on opening. Typed text is translated automatically after 700 ms without typing. If there is no selection, clipboard text is shown locally as a preview; choose **Translate Clipboard** to send it for translation. Clearing typed text returns to the clipboard preview, which requires that action again.
- **Translate Selection** replaces selected text using your default tone. With no selection, it opens Translate. Allow Raycast access to selected text in macOS when prompted.
- **Choose Model** lists models for a configured provider. A selected model overrides its preference; choose **Use Preference Model** to clear the override.

In Translate, select Default for a faithful, natural translation, LinkedIn for a professional message, Email for a polite structured message, or Chat for a casual message. The view remembers your last tone; Translate Selection uses **Default Tone** in preferences.

Set a **Main Language** and **Second Language** in preferences. Text detected as the main language goes to the second; other text goes to the main language. Use the **Translate To** dropdown to force a target, or press ⌘S to swap direction.

By default, Enter pastes the result into the previous app and ⌘Enter copies it. Change **Enter Key** in preferences to reverse those actions. Use ⌘R to retry or try the next provider, and ⌘M to choose a model. Review AI output before using it.

## Providers

Get an API key from [Groq](https://console.groq.com/keys), [Gemini](https://aistudio.google.com/app/apikey), [OpenAI](https://platform.openai.com/api-keys), [Anthropic](https://console.anthropic.com/settings/keys), or [OpenRouter](https://openrouter.ai/settings/keys). For a local server, install and run [Ollama](https://ollama.com) or an OpenAI-compatible application with a downloaded model.

In extension preferences, choose **Your Own Provider** for OpenAI, Anthropic, OpenRouter, or a Custom OpenAI-compatible endpoint, and enter its API key. A Custom endpoint may omit the key, but requires both **Custom Base URL** and the exact **Your Model** ID. Enter the base URL, such as `http://localhost:1234/v1`, rather than a complete chat completions URL. Remote endpoints require HTTPS; HTTP is allowed for loopback addresses. URLs with credentials, a query, or a fragment are rejected. A previously picked Custom model does not replace the required model preference during setup.

You can also enable Groq or Gemini and enter their API keys, or enable Ollama with a locally running server and model. Set **Preferred Provider** to try an enabled, configured provider first. The remaining enabled and configured providers are tried in order when a recoverable failure occurs; invalid credentials and rejected requests are reported. To stop using a provider, disable it or select None for Your Own Provider. Remove its key separately in preferences if desired.

**Choose Model** can override the model preference for a configured provider. If the model list cannot be loaded, enter a model ID in preferences instead. **Use Preference Model** removes the saved override.

## Privacy and usage

TranslaTone has no application backend or telemetry. It sends translation requests directly to the configured provider. Automatic fallback may send the same text to another enabled service. Check each provider's data policies before sending text. Typing, changing tone, and retries can create requests and paid charges depending on your provider and plan.

For local-only translations, leave only a loopback Custom endpoint or local Ollama enabled and disable other providers. Making a local provider preferred does not disable cloud fallback. Clipboard previews are rendered as literal text so embedded Markdown images do not load before submission.

Local usage counts are approximate daily counts in UTC, not authoritative usage or spending caps. Raycast LocalStorage holds usage counters identified by a hashed key prefix and model overrides; Raycast's cached state remembers the last tone. Translations are cached in memory for the session. Clipboard content may also be retained by macOS or Raycast clipboard history outside the extension. Password preferences are managed by Raycast.

If a request fails, use the toast's **Retry** or **Open Preferences** action. **Copy Debug Info** includes provider, status, and request details; known API keys and credential URLs are redacted. Review the report before sharing it in an issue.

To remove a saved model override, choose **Use Preference Model**. To remove a provider's credentials, clear its API key in preferences; disabling a provider keeps its key. There is currently no in-extension action to clear all usage counters or cached state.
