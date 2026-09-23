import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { certificateSanList } from "./lan.js";

export interface LocalHttpsMaterial {
  pfxPath: string;
  passphrase: string;
  cerPath: string;
  sans: string[];
}

interface CertMeta {
  version: number;
  sans: string[];
}

const META_VERSION = 2;
export const LOCAL_HTTPS_PASSPHRASE = "gym-erp-local";

export function certPaths(dataRoot: string): { dir: string; pfxPath: string; cerPath: string; metaPath: string } {
  const dir = join(dataRoot, "data", "certs");
  return {
    dir,
    pfxPath: join(dir, "server.pfx"),
    cerPath: join(dir, "gym-erp.cer"),
    metaPath: join(dir, "sans.json"),
  };
}

function readMeta(metaPath: string): CertMeta | null {
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, "utf8")) as CertMeta;
  } catch {
    return null;
  }
}

function needsRegen(meta: CertMeta | null, sans: string[], pfxPath: string): boolean {
  if (!existsSync(pfxPath) || !meta || meta.version !== META_VERSION) return true;
  return sans.some((value) => !meta.sans.includes(value));
}

function runPowerShell(dataRoot: string, sans: string[]): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const script = join(here, "..", "..", "..", "scripts", "ensure-gym-erp-certificate.ps1");
  if (!existsSync(script)) {
    throw new Error(`Certificate script is missing: ${script}`);
  }
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      script,
      "-DataRoot",
      dataRoot,
      "-Sans",
      sans.join(","),
      "-Force",
    ],
    { stdio: "inherit", windowsHide: true },
  );
}

function runOpenSsl(paths: ReturnType<typeof certPaths>, sans: string[]): void {
  const openssl = spawnSync("openssl", ["version"], { encoding: "utf8" });
  if (openssl.status !== 0) {
    throw new Error("Could not create a local HTTPS certificate. PowerShell or OpenSSL is required.");
  }
  const keyPath = join(paths.dir, "server.key");
  const crtPath = join(paths.dir, "server.crt");
  const san = sans
    .map((value) => (value.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(value) ? `IP:${value}` : `DNS:${value}`))
    .join(",");
  const req = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-sha256",
      "-days",
      "825",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      crtPath,
      "-subj",
      "/CN=GYM ERP LAN",
      "-addext",
      `subjectAltName=${san}`,
    ],
    { encoding: "utf8" },
  );
  if (req.status !== 0) {
    throw new Error(req.stderr || "OpenSSL could not create the HTTPS certificate.");
  }
  const pfx = spawnSync(
    "openssl",
    ["pkcs12", "-export", "-inkey", keyPath, "-in", crtPath, "-out", paths.pfxPath, "-passout", `pass:${LOCAL_HTTPS_PASSPHRASE}`],
    { encoding: "utf8" },
  );
  if (pfx.status !== 0) {
    throw new Error(pfx.stderr || "OpenSSL could not export the HTTPS certificate.");
  }
  writeFileSync(paths.cerPath, readFileSync(crtPath));
}

export function ensureLocalHttpsCertificate(dataRoot: string): LocalHttpsMaterial {
  const sans = certificateSanList();
  const paths = certPaths(dataRoot);
  mkdirSync(paths.dir, { recursive: true });
  const meta = readMeta(paths.metaPath);
  if (!needsRegen(meta, sans, paths.pfxPath)) {
    return { pfxPath: paths.pfxPath, passphrase: LOCAL_HTTPS_PASSPHRASE, cerPath: paths.cerPath, sans: meta?.sans ?? sans };
  }

  for (const file of [paths.pfxPath, paths.cerPath, paths.metaPath]) {
    if (existsSync(file)) rmSync(file, { force: true });
  }

  if (process.platform === "win32") {
    runPowerShell(dataRoot, sans);
  } else {
    runOpenSsl(paths, sans);
  }

  if (!existsSync(paths.pfxPath)) {
    throw new Error("HTTPS certificate was not created.");
  }
  writeFileSync(paths.metaPath, JSON.stringify({ version: META_VERSION, sans }, null, 2));
  return { pfxPath: paths.pfxPath, passphrase: LOCAL_HTTPS_PASSPHRASE, cerPath: paths.cerPath, sans };
}
