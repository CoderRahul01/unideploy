import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "unideploy-home-"));
process.env.HOME = tmpHome;

const { readApiKey, writeApiKey } = await import("../src/lib/auth.js");

test("writeApiKey persists JSON credentials", () => {
  writeApiKey("ud_test_json");
  const raw = fs.readFileSync(
    path.join(tmpHome, ".unideploy", "credentials"),
    "utf8"
  );
  assert.equal(JSON.parse(raw).api_key, "ud_test_json");
  assert.equal(readApiKey(), "ud_test_json");
});

test("readApiKey supports legacy flat file format", () => {
  const credentialsPath = path.join(tmpHome, ".unideploy", "credentials");
  fs.writeFileSync(credentialsPath, "API_KEY=ud_legacy\n");
  assert.equal(readApiKey(), "ud_legacy");
});
