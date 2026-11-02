#!/usr/bin/env node
// Starts the panel (port 3000) and Intervio (port 3001) together.
// Usage: pnpm dev:all   (INTERVIO_DIR=/path/to/intervio to override the default ../../intervio)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const panelDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const intervioDir = path.resolve(process.env.INTERVIO_DIR ?? path.join(panelDir, "..", "..", "intervio"));
const panelPort = process.env.PANEL_PORT ?? "3000";
const intervioPort = process.env.INTERVIO_PORT ?? "3001";

const colors = { panel: "\x1b[36m", intervio: "\x1b[35m", reset: "\x1b[0m" };
const children = [];

function run(name, cwd, args, env = {}) {
  const child = spawn("pnpm", args, {
    cwd,
    env: { ...process.env, ...env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const prefix = `${colors[name]}[${name}]${colors.reset} `;
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) process.stdout.write(prefix + line + "\n");
    });
  }
  child.on("exit", (code) => {
    process.stdout.write(`${prefix}zakończony (kod ${code ?? "?"})\n`);
    // Intervio failing (e.g. already running elsewhere) must not take the panel down.
    if (name === "panel") shutdown(code ?? 0);
  });
  children.push(child);
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const intervioUrl = `http://localhost:${intervioPort}`;

async function alreadyRunning(url) {
  try {
    await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(800) });
    return true;
  } catch {
    return false;
  }
}

if (await alreadyRunning(intervioUrl)) {
  console.log(`[intervio] już działa na ${intervioUrl} - nie uruchamiam drugi raz.`);
} else if (!existsSync(path.join(intervioDir, "package.json"))) {
  console.warn(
    `Nie znalazłem Intervio w ${intervioDir}. Ustaw INTERVIO_DIR=/ścieżka/do/intervio. Startuję sam panel.`,
  );
} else {
  if (!existsSync(path.join(intervioDir, "node_modules"))) {
    console.log(`[intervio] brak node_modules - uruchom najpierw: cd ${intervioDir} && pnpm install`);
  }
  run("intervio", intervioDir, ["exec", "next", "dev", "-H", "127.0.0.1", "-p", intervioPort]);
}
run("panel", panelDir, ["exec", "next", "dev", "-H", "127.0.0.1", "-p", panelPort], { INTERVIO_URL: intervioUrl });

console.log(`Panel:    http://localhost:${panelPort}`);
console.log(`Intervio: ${intervioUrl}`);
console.log("Ctrl+C zatrzymuje oba.");
