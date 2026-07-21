const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "../src/lib/tokenResponse.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});
const tokenModule = { exports: {} };
const executeModule = new Function(
  "exports",
  "require",
  "module",
  "__filename",
  "__dirname",
  transpiled.outputText,
);
executeModule(
  tokenModule.exports,
  createRequire(sourcePath),
  tokenModule,
  sourcePath,
  path.dirname(sourcePath),
);

const {
  LIVEKIT_SETUP_REQUIRED_STATUS,
  createLiveKitSetupRequiredPayload,
  parseTokenApiResponse,
} = tokenModule.exports;

test("defines a structured service-unavailable response for missing LiveKit credentials", () => {
  assert.equal(LIVEKIT_SETUP_REQUIRED_STATUS, 503);
  assert.deepEqual(createLiveKitSetupRequiredPayload(), {
    error: {
      code: "LIVEKIT_SETUP_REQUIRED",
      message:
        "Voice setup is incomplete. Open Viventium settings and configure LiveKit, then try again.",
    },
  });
});

test("surfaces the structured setup guidance from a failed token response", async () => {
  const response = new Response(
    JSON.stringify(createLiveKitSetupRequiredPayload()),
    {
      status: LIVEKIT_SETUP_REQUIRED_STATUS,
      headers: { "Content-Type": "application/json" },
    },
  );

  await assert.rejects(
    parseTokenApiResponse(response),
    new Error(
      "Voice setup is incomplete. Open Viventium settings and configure LiveKit, then try again.",
    ),
  );
});

test("handles an empty failed token response without a JSON parse exception", async () => {
  const response = new Response(null, { status: 500 });

  await assert.rejects(
    parseTokenApiResponse(response),
    new Error(
      "Unable to connect to voice right now. Check setup and try again.",
    ),
  );
});

test("returns a valid token result from a successful response", async () => {
  const response = new Response(
    JSON.stringify({
      identity: "synthetic-user",
      accessToken: "synthetic-token",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );

  assert.deepEqual(await parseTokenApiResponse(response), {
    identity: "synthetic-user",
    accessToken: "synthetic-token",
  });
});
