# record-demo-agent-skill — let your coding agent record a feature demo

Ask your AI coding agent to **"record a video of what you implemented"** and it will
drive your running app in a real browser and produce a short screen-recording, entirely on your machine. 
No hosted/cloud recording service is involved.

The recorder is a plain command-line tool, so it works with **any agent** (or by hand). 
It ships with a ready-made **Claude Code skill** as a drop-in integration.

Under the hood it uses **Playwright + Chromium** to record and **ffmpeg** to speed
up and convert the result to a polished mp4.

```
you: "record a demo of the new report form"
agent:
  → works out the flow from what it just built
  → boots (or reuses) your app
  → drives the browser: open page, fill the form, submit, show the result
  → saves tmp/demo.mp4  (2× speed, 60fps)
```

## What's in here

```
record_demo/
  record.mjs       Playwright recorder — drives Chromium through a steps file  (agent-agnostic)
  postprocess.sh   ffmpeg: trim + speed-up + convert to mp4 (no-op if ffmpeg missing)
  package.json     pins Playwright
  SKILL.md         the workflow a Claude Code agent follows (the drop-in integration)
install.sh         installs the Claude Code skill into a skills directory
examples/smoke/    a tiny page + steps.json to verify the recorder works
```

`record.mjs` and `postprocess.sh` are just scripts — any agent (or you) can call
them directly. `SKILL.md` is only needed for the Claude Code integration.

## Prerequisites

- **Node.js 18+** (Playwright and the recorder run on Node).
- **ffmpeg** — required to produce the sped-up, web-friendly `.mp4`. Install with
  `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Debian/Ubuntu).

Chromium is downloaded automatically on first use (~100 MB, once). The Claude Code
skill checks for these tools up front and tells you exactly what to install if any
are missing.

## Use it with any agent

Point your agent at the two scripts and let it drive them. The contract:

```bash
# 1. install the recorder (once)
cd record_demo && npm install && npx playwright install chromium

# 2. record: agent writes a steps file, then runs
node record.mjs --url <base-url> --steps <steps.json> --out <out.webm>

# 3. post-process (needs ffmpeg)
bash postprocess.sh <out.webm> <out.mp4> [speed=2] [fps=60]
```

Give your agent the ["steps file" reference](#the-steps-file) below and it can
generate the moments to record from whatever it just implemented.

## Use it with Claude Code (drop-in skill)

### Global (available in every project)

```bash
git clone <this-repo> record-demo-agent-skill
cd record-demo-agent-skill
./install.sh                       # copies to ~/.claude/skills/record_demo
```

### Into a single project

```bash
./install.sh /path/to/your/project/.claude/skills
# or just: cp -R record_demo /path/to/your/project/.claude/skills/
```

Claude Code auto-discovers any skill under `~/.claude/skills/<name>/SKILL.md` or
`<project>/.claude/skills/<name>/SKILL.md`, so no further configuration is needed.
Then, after a feature is implemented, say:

> record a video of what you implemented

## The steps file

`record.mjs` is driven by a JSON file. Your agent writes this for you, but you can
edit it and re-run. Supported actions:

| action            | fields                                        | effect                    |
| ----------------- | --------------------------------------------- | ------------------------- |
| `goto`            | `path` or `url`                               | navigate                  |
| `click`           | `selector` or `text`                          | click an element          |
| `fill`            | `selector`, `value`                           | type into an input        |
| `hover`           | `selector` or `text`                          | hover an element          |
| `press`           | `key`                                         | press a key (e.g. `Enter`)|
| `scroll`          | `to` = `"bottom"` / `"top"` / number / selector | smooth scroll           |
| `waitForSelector` | `selector`, `timeout?`                        | wait for an element       |
| `wait`            | `ms`                                          | pause                     |

Recording starts at `--url`; use `goto` steps to navigate elsewhere. Every step is
padded with short, human-paced pauses so the result doesn't look like a jittery
bot. Add `"ms": <n>` to any step for extra dwell time.

Example:

```json
{
  "viewport": { "width": 1280, "height": 800 },
  "steps": [
    { "action": "click", "text": "New report" },
    { "action": "fill", "selector": "#report_title", "value": "Q3 summary" },
    { "action": "click", "text": "Save" },
    { "action": "waitForSelector", "selector": ".flash--success" },
    { "action": "scroll", "to": "bottom" }
  ]
}
```

## Verify it works (smoke test)

No app required — record the bundled example page:

```bash
cd record_demo
npm install
npx playwright install chromium
node record.mjs --url "file://$PWD/../examples/smoke/index.html" \
                --steps ../examples/smoke/steps.json --out /tmp/demo.webm
bash postprocess.sh /tmp/demo.webm /tmp/demo.mp4 2 60   # requires ffmpeg
```

You should get a short video showing the button being clicked and the page
scrolling.

## Limitations

- **Functional recording**, not the full "Screen Studio" look — no motion zooms,
  gradient background, or cursor smoothing (yet).
- On minimal Linux images, `npx playwright install chromium` may need system libs;
  use `npx playwright install --with-deps chromium` (requires root).
- The recorder captures the browser viewport only, not OS-level windows.

## License

MIT
