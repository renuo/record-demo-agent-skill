---
name: record_demo
description: Record a short screen-recording video of a feature you just implemented, by driving the running app in a real browser. Fully self-hosted (Playwright + Chromium + ffmpeg), no external service. Use this skill when asked to "record a video / demo of what you implemented".
---

# Record demo

Produce a polished screen recording of a feature by driving the application in a real browser and capturing it to a video file. 
Everything runs locally where you are running with no external service.

The tooling lives next to this file:

- `record.mjs` — drives Chromium through a list of steps and records the session
- `postprocess.sh` — speeds up + converts the recording to a web-friendly mp4
- `package.json` — pins Playwright

Resolve the skill directory once and reuse it (it is wherever this `SKILL.md` lives, e.g. `.claude/skills/record_demo`). 
Below it is referred to as `$SKILL`.

## 1. Decide what to demo

Work out the flow to record from what was just implemented: the git diff, the ticket/context, and the conversation. 
Keep it short and purposeful (a handful of moments: open the page, show the new UI, perform the key interaction, show the result). 
If the user described specific steps, follow those.

## 2. Check required tools

This skill needs three tools available on the machine. 
Check all of them up front and **stop and tell the user exactly what is missing** (with the install hint) rather than producing a broken or empty recording:

```bash
command -v node   || echo "MISSING: node (install Node.js 18+)"
command -v npm    || echo "MISSING: npm (ships with Node.js)"
command -v ffmpeg || echo "MISSING: ffmpeg (brew install ffmpeg / apt-get install ffmpeg)"
```

- **Node.js 18+ and npm** — run `record.mjs` and install Playwright. Not optional.
- **ffmpeg** — required to produce the mp4. Not optional; if it is missing, ask the
  user to install it before continuing.

If any are missing, list every missing tool with how to install it and wait for the user. 
Do not proceed. Do not install stuff yourself unless asked explicitly by the user.

## 3. Ensure the recorder is installed

Run these in `$SKILL` (they are idempotent; skip installs that already succeeded):

```bash
cd "$SKILL"
npm install                       # installs Playwright from package.json
npx playwright install chromium   # downloads the Chromium build (once)
```

If `npx playwright install chromium` fails for missing system libraries, retry
with `npx playwright install --with-deps chromium` (may need sudo). If it still
cannot install Chromium, tell the user what failed instead of continuing.

## 4. Make sure the app is running

Recording needs a reachable URL.

1. Check the project for specific instructions on how to run the application or access it.
2. The project might also give more details on how to initially authenticate.
3. First probe for an already-running server (e.g. `curl -sSf http://localhost:3000 >/dev/null`).
   If one responds, use that URL and do **not** start another.
2. Otherwise boot the app the way this project does, in the background:
    - Rails: prepare the DB, then start the server, e.g.
      `bin/rails db:prepare` then `bin/rails server -p 3000` (or `bin/dev`).
      If seed data helps the demo, run `bin/rails db:seed`.
    - Node/other: use the project's documented dev command (`npm run dev`, etc.).
      Poll the URL until it responds before recording, and **remember the PID so you
      can stop the server afterwards** (step 7). Redirect its logs to a temp file.

Pick the base URL you will record against (default `http://localhost:3000` but follow project-specific instructions!)

## 5. Write the steps file

Create a `steps.json` (put it in `tmp/record-demo/YYYY-MM-DD-name-of-feature` of the working directory) describing the
moments to record. Supported actions:

| action            | fields                                    | effect                                        |
|-------------------|-------------------------------------------|-----------------------------------------------|
| `goto`            | `path` or `url`                           | navigate                                      |
| `click`           | `selector` or `text`                      | click an element                              |
| `fill`            | `selector`, `value`                       | type into an input                            |
| `hover`           | `selector` or `text`                      | hover an element                              |
| `press`           | `key`                                     | press a key (e.g. `Enter`)                    |
| `scroll`          | `to` = `"bottom"`/`"top"`/number/selector | smooth scroll                                 |
| `waitForSelector` | `selector`, `timeout?`                    | wait for an element                           |
| `wait`            | `ms`                                      | pause (also usable as extra `ms` on any step) |

Prefer `text`/role-friendly selectors that match what you implemented. Every step
is automatically padded with short human-paced pauses, so you do not need to add
`wait` between every action — only where content needs time to load.

Example `tmp/steps.json`:

```json
{
  "viewport": {
    "width": 1280,
    "height": 800
  },
  "steps": [
    {
      "action": "goto",
      "path": "/"
    },
    {
      "action": "click",
      "text": "New report"
    },
    {
      "action": "fill",
      "selector": "#report_title",
      "value": "Q3 summary"
    },
    {
      "action": "click",
      "text": "Save"
    },
    {
      "action": "waitForSelector",
      "selector": ".flash--success"
    },
    {
      "action": "scroll",
      "to": "bottom"
    }
  ]
}
```

## 6. Record

```bash
node "$SKILL/record.mjs" --url http://localhost:3000 --steps tmp/steps.json --out tmp/demo.webm
```

The step being executed is logged to stderr, which helps you spot a wrong
selector. If a step fails, fix `tmp/steps.json` and re-run.

## 7. Post-process and clean up

```bash
bash "$SKILL/postprocess.sh" tmp/demo.webm tmp/demo.mp4 2 60
```

This prints the final mp4 path (ffmpeg is required). 
Then **stop any server you started in step 4** (kill the PID). Don't kill the server if it was not started by you.

## 8. Report

Tell the user the path to the final video and give a one-line description of what
it shows. Offer to adjust it (different steps, slower pace, a specific zoom on a
region): re-running is quick.

## Notes

- Do **not** rely on any hosted/cloud recording service; this skill is entirely local.
- Keep the demo short (aim for well under a minute of raw footage; the 2× speed-up
  makes the final clip tighter).
- If you genuinely cannot reach a running app (can't boot it, no URL), say so
  instead of producing an empty video.
- Instruct the user on how to improve the project-specific CLAUDE.md file to make the recording quicker in the future.
