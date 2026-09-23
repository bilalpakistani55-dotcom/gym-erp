import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

export function isLanIPv4(item: NetworkInterfaceInfo | undefined | null): item is NetworkInterfaceInfo {
  if (!item || item.internal) return false;
  return item.family === "IPv4" || (item.family as unknown) === 4;
}

export function listLanIPv4Addresses(): string[] {
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const items of Object.values(networkInterfaces())) {
    for (const item of items ?? []) {
      if (!isLanIPv4(item) || item.address.startsWith("169.254.")) continue;
      if (seen.has(item.address)) continue;
      seen.add(item.address);
      addresses.push(item.address);
    }
  }
  return addresses;
}

export function certificateSanList(): string[] {
  return ["localhost", "127.0.0.1", ...listLanIPv4Addresses()];
}
