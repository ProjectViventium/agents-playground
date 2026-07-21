const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const scriptPath = path.resolve(__dirname, "../start_playground.sh");
const script = fs.readFileSync(scriptPath, "utf8");

test("reports LiveKit credentials as configured without printing key bytes", () => {
  assert.doesNotMatch(script, /\$\{LIVEKIT_API_KEY:[0-9]+(?::[0-9]+)?}/);
  assert.match(script, /API Key:[^\n]*Configured/);
});

test("uses the repository packageManager through Corepack instead of global pnpm", () => {
  const qaDir = fs.mkdtempSync(path.join(os.tmpdir(), "playground-pm-qa-"));
  const binDir = path.join(qaDir, "bin");
  const corepackLog = path.join(qaDir, "corepack.log");
  const globalPnpmLog = path.join(qaDir, "global-pnpm.log");
  fs.mkdirSync(binDir);

  const fakeCorepack = path.join(binDir, "corepack");
  fs.writeFileSync(
    fakeCorepack,
    '#!/bin/sh\nprintf "%s\\n" "$*" >> "$QA_COREPACK_LOG"\nexit 0\n',
  );
  fs.chmodSync(fakeCorepack, 0o755);

  const fakeGlobalPnpm = path.join(binDir, "pnpm");
  fs.writeFileSync(
    fakeGlobalPnpm,
    '#!/bin/sh\nprintf "global pnpm was invoked\\n" >> "$QA_GLOBAL_PNPM_LOG"\nexit 71\n',
  );
  fs.chmodSync(fakeGlobalPnpm, 0o755);

  try {
    const result = childProcess.spawnSync("bash", [scriptPath], {
      cwd: path.dirname(scriptPath),
      encoding: "utf8",
      env: {
        HOME: process.env.HOME || os.homedir(),
        LIVEKIT_API_KEY: "synthetic-key",
        LIVEKIT_API_SECRET: "synthetic-secret",
        NEXT_PUBLIC_LIVEKIT_URL: "ws://127.0.0.1:7880",
        PATH: `${binDir}:${process.env.PATH}`,
        QA_COREPACK_LOG: corepackLog,
        QA_GLOBAL_PNPM_LOG: globalPnpmLog,
        TERM: "xterm",
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(globalPnpmLog), false);
    assert.match(
      fs.readFileSync(corepackLog, "utf8"),
      /^pnpm@9\.15\.9 --version\npnpm@9\.15\.9 run dev\n$/,
    );
  } finally {
    fs.rmSync(qaDir, { recursive: true, force: true });
  }
});
