# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A distributable **Agent skill** (`record_demo`) plus its underlying command-line recorder. 
It lets a coding agent record a short screen-recording of a feature
by driving the running app in a real browser.
The skill runs entirely locally, no hosted service. 
Under the hood: Playwright + Chromium to record, ffmpeg to speed up and convert to mp4.

The repo itself is the *source/distribution* of the skill; the skill is meant to be copied
into a `.claude/skills/` directory (via `install.sh`) and then invoked by an agent inside
*another* project.

## Layout

- `record_demo/`: the skill directory that gets copied to `.claude/skills/record_demo`.
  - `record.mjs`: Playwright recorder; drives Chromium through a JSON steps file. The core tool.
  - `postprocess.sh`: ffmpeg: trim + speed-up + convert webm → mp4.
  - `SKILL.md`: the workflow the Claude Code agent follows. This is the integration contract; keep it in sync with `record.mjs`'s supported actions.
  - `package.json`: pins Playwright.
- `install.sh`: copies `record_demo/` into a skills dir, stripping `node_modules/` and any recordings.
- `examples/smoke/`: a static page + `steps.json` to verify the recorder with no app.

## Common commands

```bash
# Install the recorder locally (from record_demo/)
cd record_demo && npm install && npx playwright install chromium

# Smoke test — records the bundled static page, no app needed
node record_demo/record.mjs \
  --url "file://$PWD/examples/smoke/index.html" \
  --steps examples/smoke/steps.json --out /tmp/demo.webm
bash record_demo/postprocess.sh /tmp/demo.webm /tmp/demo.mp4 2 60

# Install the skill for use by other projects
./install.sh                                   # -> ~/.claude/skills/record_demo (global)
./install.sh /path/to/project/.claude/skills   # -> a single project
```

There is no test suite, linter, or build step. The smoke test above is the way to verify a change to `record.mjs` or `postprocess.sh`.

## Recorder contract

```bash
node record.mjs --url <base-url> --steps <steps.json> --out <out.webm>
bash postprocess.sh <out.webm> <out.mp4> [speed=2] [fps=60]
```

`record.mjs` flags: `--url` (recording starts here; steps navigate with `goto`), `--steps`, `--out`, `--pad-before` (default 400ms), `--pad-after` (default 900ms). E
very step is padded with these human-paced pauses; a step's own `"ms"` overrides `pad-after`. It exits non-zero if a step fails but still flushes the partial video.

Supported step actions live in `runStep`/`locate`/`scroll` in `record.mjs`: `goto`, `click`, `fill`, `hover`, `press`, `scroll`, `waitForSelector`, `wait`. `click`/`hover` locate by `selector` or (fallback) `text` via `getByText`.

## Conventions

- Everything must run **locally**, don't introduce a hosted/cloud recording dependency. This is the core promise of the tool.
- `node_modules/`, `*.webm`, `*.mp4` are gitignored and stripped on install; never commit them.
- Adding or changing a step action means editing `record.mjs` **and** the action tables in `SKILL.md` and `README.md` together.
- **Required tools**: Node.js 18+/npm, Chromium (via Playwright), and ffmpeg. All mandatory. `postprocess.sh` exits non-zero if ffmpeg is missing, and `SKILL.md` step 2 checks for every tool up front and tells the user exactly what to install. When adding a dependency, add it to that preflight check too.
