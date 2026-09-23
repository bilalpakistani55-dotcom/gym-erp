import type { AttendanceMethod } from "@gym-erp/shared-types";
import { JsonLineFingerprintAdapter, UnpluggedFingerprintAdapter, type FingerprintDeviceAdapter } from "./fingerprint.js";
import { LocalFaceRecognitionProvider, PythonLocalFaceEngine, type FaceRecognitionProvider } from "./face.js";
import type { CameraDevice, CodeScannerDevice, ReceiptPrinterDevice } from "./devices.js";

export interface HardwareRegistry {
  face: FaceRecognitionProvider;
  fingerprint: FingerprintDeviceAdapter;
  camera: CameraDevice | null;
  scanner: CodeScannerDevice | null;
  printer: ReceiptPrinterDevice | null;
  activeAttendanceBiometric: Extract<AttendanceMethod, "face" | "fingerprint">;
}

export function createDefaultHardwareRegistry(): HardwareRegistry {
  const engine = new PythonLocalFaceEngine();
  let fingerprint: FingerprintDeviceAdapter = new UnpluggedFingerprintAdapter();
  if (process.env.GYM_ERP_FINGERPRINT_COMMAND) {
    try {
      fingerprint = new JsonLineFingerprintAdapter();
    } catch {
      fingerprint = new UnpluggedFingerprintAdapter();
    }
  }
  return {
    face: new LocalFaceRecognitionProvider(engine),
    fingerprint,
    camera: null,
    scanner: null,
    printer: null,
    activeAttendanceBiometric: "face",
  };
}

export function isFingerprintAttendanceEnabled(registry: HardwareRegistry): boolean {
  return registry.activeAttendanceBiometric === "fingerprint";
}
