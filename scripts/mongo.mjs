import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const path = resolve("data/mongo");
await mkdir(path, { recursive: true });
const executable =
  process.env.MONGOD_BIN ||
  (process.platform === "win32"
    ? "C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe"
    : "mongod");
console.log(
  "Starting a dedicated loopback-only MongoDB instance on port 27028",
);
const child = spawn(
  executable,
  ["--dbpath", path, "--bind_ip", "127.0.0.1", "--port", "27028"],
  { stdio: "inherit", windowsHide: true },
);
child.on("error", (e) => {
  console.error(
    "Install MongoDB Community Server or set MONGOD_BIN:",
    e.message,
  );
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
