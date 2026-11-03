import { spawnSync } from "node:child_process";
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  const runner = new URL("./run-emulator-tests.mjs", import.meta.url);
  const { fileURLToPath } = await import("node:url");
  const result = spawnSync(process.execPath, [fileURLToPath(runner)], { stdio: "inherit" });
  process.exit(result.status ?? 1);
}
const result = spawnSync(process.execPath, ["--test", "tests/firestore-rules.test.mjs"], { stdio: "inherit" });
process.exit(result.status ?? 1);
