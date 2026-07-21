const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "../src/lib/themeColors.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});
const themeModule = { exports: {} };
const executeModule = new Function(
  "exports",
  "require",
  "module",
  "__filename",
  "__dirname",
  transpiled.outputText,
);
executeModule(
  themeModule.exports,
  createRequire(sourcePath),
  themeModule,
  sourcePath,
  path.dirname(sourcePath),
);

const { resolveThemeColorPalette, themeColorsByName } = themeModule.exports;

test("keeps gray compatible with the Tailwind gray palette", () => {
  assert.equal(
    resolveThemeColorPalette("gray")["500"],
    themeColorsByName.gray["500"],
  );
});

test("falls back to cyan for an unknown external theme value", () => {
  assert.equal(
    resolveThemeColorPalette("not-a-theme")["500"],
    themeColorsByName.cyan["500"],
  );
});

test("preserves a supported external theme value", () => {
  assert.equal(
    resolveThemeColorPalette("violet")["500"],
    themeColorsByName.violet["500"],
  );
});
