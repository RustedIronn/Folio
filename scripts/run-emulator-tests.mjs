import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = { ...process.env, CI: "1" };
let java = spawnSync("java", ["-version"], { encoding: "utf8", env });
const javaReady = (result) => !result.error && result.status === 0 && Number((result.stderr + result.stdout).match(/version "(\d+)/)?.[1]) >= 21;
if (!javaReady(java)) {
  const portable = path.join(homedir(), ".local", "share", "quoteflow-tools", "java21");
  const candidates = [env.JAVA_HOME, ...(existsSync(portable) ? readdirSync(portable).map((name) => path.join(portable, name)) : [])].filter(Boolean);
  const home = candidates.find((candidate) => existsSync(path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java")));
  if (home) {
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
    env.JAVA_HOME = home; env[pathKey] = path.join(home, "bin") + path.delimiter + (env[pathKey] ?? "");
  }
  java = spawnSync("java", ["-version"], { encoding: "utf8", env });
}
if (!javaReady(java)) {
  process.stderr.write("Java 21+ is required. Install Temurin 21 and set JAVA_HOME or add its bin directory to PATH.\n");
  process.exit(1);
}
const cli = path.join(root, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
if (!existsSync(cli)) { process.stderr.write("Run npm ci to install the pinned Firebase CLI.\n"); process.exit(1); }
const all = process.argv.includes("--all");
const command = `"${process.execPath}" --test${all ? "" : " tests/firestore-rules.test.mjs"}`;
const result = spawnSync(process.execPath, [cli, "emulators:exec", "--only", "firestore", "--project", "demo-quoteflow", "--non-interactive", command], { cwd: root, stdio: "inherit", env });
process.exit(result.status ?? 1);
