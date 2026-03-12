# MoltBot Project Memory

## Project Overview
- Fork of OpenClaw multi-channel AI bot platform
- TypeScript monorepo using pnpm workspaces
- Docker-only deployment (non-Docker startup methods removed)

## Key Changes Made (2026-03-12)
- Removed 21 built-in messaging channel extensions (telegram, discord, slack, whatsapp, signal, imessage, irc, line, matrix, msteams, googlechat, feishu, bluebubbles, mattermost, nextcloud-talk, nostr, synology-chat, tlon, twitch, zalo, zalouser)
- Added DingTalk channel plugin (`extensions/dingtalk/`) from https://github.com/soimy/clawdbot-channel-dingtalk
- Removed native apps (`apps/` directory: macOS, iOS, Android)
- Removed non-Docker startup scripts (install.sh, install.ps1, macOS build scripts)
- Cleaned up package.json exports/scripts, src/channels/registry.ts, outbound/action implementations
- Fixed test files to use empty registries

## Remaining Extensions (non-channel)
acpx, copilot-proxy, device-pair, diagnostics-otel, diffs, google-gemini-cli-auth, llm-task, lobster, memory-core, memory-lancedb, minimax-portal-auth, open-prose, phone-control, qwen-portal-auth, shared, talk-voice, test-utils, thread-ownership, voice-call

## Known Issues / Follow-up
- Some test files (heartbeat, message-action-runner, health.snapshot) now use empty registries — tests that depend on specific channel behavior may fail
- `pnpm build` and `pnpm test` not yet verified locally (user's machine has limited resources)
- DingTalk plugin's pnpm-lock.yaml may conflict with root lockfile — run `pnpm install` to resolve

## User Preferences
- Prefers Docker deployment only
- Does not want local builds (limited machine resources)
- Wants changes pushed to GitHub for cross-machine workflow
- Communicates in Chinese
