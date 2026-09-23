import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir, networkInterfaces } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDataLayout, SqlJsDatabase } from "@gym-erp/database";
import { startDesktopServer } from "./server.js";
import { startLocalHubServer } from "@gym-erp/sync-service";
import { ensureLocalHttpsCertificate } from "./https-cert.js";

const here = dirname(fileURLToPath(import.meta.url));

interface ParsedArgs {
  dataRoot: string;
  port: number;
  hubPort: number;
  httpsPfxPath: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const defaultRoot = join(homedir(), "GymERP");
  const result: ParsedArgs = { dataRoot: defaultRoot, port: 5178, hubPort: 47821, httpsPfxPath: "" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--data" && argv[i + 1]) {
      result.dataRoot = argv[i + 1] as string;
      i += 1;
    } else if (arg === "--port" && argv[i + 1]) {
      result.port = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--hub-port" && argv[i + 1]) {
      result.hubPort = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--https-pfx" && argv[i + 1]) {
      result.httpsPfxPath = argv[i + 1] as string;
      i += 1;
    }
  }
  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const layout = ensureDataLayout(args.dataRoot);
  mkdirSync(layout.databaseFile && dirname(layout.databaseFile), { recursive: true });
  const https = ensureLocalHttpsCertificate(args.dataRoot);

  const db = await SqlJsDatabase.open({ filePath: layout.databaseFile });

  // Desktop UI is available on localhost and the gym's private Wi-Fi network.
  const app = await startDesktopServer(db, {
    dataRoot: layout.root,
    databaseFile: layout.databaseFile,
    port: args.port,
    host: "0.0.0.0",
    hubPort: args.hubPort,
    httpsPfxPath: args.httpsPfxPath || https.pfxPath,
    httpsPfxPassphrase: "gym-erp-local",
    uiDir: join(here, "..", "ui"),
  });

  // Local hub for Android/Wi-Fi sync on 0.0.0.0:47821
  const hub = await startLocalHubServer(db, args.hubPort);

  console.log("GYM ERP is running.");
  const scheme = "https";
  console.log(`  App:      ${scheme}://localhost:${app.port}`);
  const lanAddress = Object.values(networkInterfaces()).flat().find((item) => item && item.family === "IPv4" && !item.internal)?.address;
  if (lanAddress) console.log(`  Mobile:   ${scheme}://${lanAddress}:${app.port}`);
  console.log(`  Sync hub: port ${hub.port} (local network)`);
  console.log(`  Data:     ${layout.root}`);

  const pidFile = join(layout.root, "data", "hub.pid");
  try {
    if (!existsSync(dirname(pidFile))) mkdirSync(dirname(pidFile), { recursive: true });
    writeFileSync(pidFile, String(process.pid));
  } catch {
    // pid file is best-effort only
  }

  const shutdown = (): void => {
    console.log("\nShutting down…");
    void hub.close().catch(() => undefined);
    void app.close().catch(() => undefined);
    db.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("Failed to start GYM ERP:", error);
  process.exit(1);
});
