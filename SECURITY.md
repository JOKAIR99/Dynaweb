# Security policy

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security problem.**

Report it privately through GitHub's private vulnerability reporting:

1. Go to https://github.com/JOKAIR99/Dynaweb/security/advisories/new
2. Describe the issue, how to reproduce it, and its impact.

The maintainer will acknowledge your report within 7 days and keep you updated on the fix. Please give us a reasonable time to release a fix before you disclose the issue publicly. Credit is given in the advisory unless you prefer to stay anonymous.

## Supported versions

Dynaweb is pre-1.0. Only the latest commit on `main` receives security fixes.

## Scope

In scope:

- Cross-site scripting or HTML injection through project content that reaches the editor canvas or an exported site
- Unsafe URL schemes (`javascript:`, untrusted `data:`) reaching links or images
- Escapes from the sandboxed editor canvas
- Malicious project files (`.dynaweb.json`) that bypass schema validation
- Supply-chain issues in dependencies or GitHub Actions workflows

Out of scope: vulnerabilities in a website a user builds and hosts themselves, unless they come from code Dynaweb generates.

## AI assistant

- The Anthropic API key is read only on the server (`server/assist.ts`), from the environment or `.env.local`. It is never sent to the browser and never logged; tests use a fake model client.
- `/api/assist` accepts same-origin POST requests only, limits body size and request length, and handles one request at a time.
- Model output is untrusted: every proposed command is shape-checked (`src/model/commandSchema.ts`) and validated against the project schema by `applyCommand` before it is shown, and applied only after the owner accepts it.

## For contributors

- Never commit secrets, API keys or tokens. No feature today needs one.
- CI uses the `pull_request` event with read-only permissions and no secrets. Do not change workflows to `pull_request_target` or add secrets to jobs that run fork code.
