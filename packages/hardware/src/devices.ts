export type HardwareStatus = "ready" | "busy" | "disconnected" | "error" | "unsupported";

export interface DeviceInfo {
  adapterId: string;
  displayName: string;
  vendor: string;
  model: string;
  firmware?: string;
}

export interface CameraCapture {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

export interface CameraDevice {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<HardwareStatus>;
  captureStill(): Promise<CameraCapture>;
}

export interface QrScanResult {
  text: string;
  format: "qr" | "barcode";
}

export interface CodeScannerDevice {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<HardwareStatus>;
  scanOnce(): Promise<QrScanResult>;
}

export interface ReceiptPrinterDevice {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<HardwareStatus>;
  printPlainText(text: string): Promise<void>;
}
