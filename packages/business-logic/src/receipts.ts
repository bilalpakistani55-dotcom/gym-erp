import type { SqlDatabase } from "@gym-erp/database";
import { newId } from "./setup.js";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Allocate the next sequential document number for a gym (RCPT-000001 style).
 * Must be called inside the same transaction that inserts the payment so the
 * counter and the row commit together and cannot collide.
 */
export function nextDocumentNumber(db: SqlDatabase, gymId: string, prefix: string): string {
  const key = `counter_${prefix.toLowerCase()}_${gymId}`;
  const row = db.get<{ value: string }>(
    `SELECT value FROM app_metadata WHERE key = ?`,
    [key],
  );
  const stored = row ? (Number.parseInt(row.value, 10) || 0) : 0;
  const suffixStart = prefix.length + 2;
  const paymentMax = db.get<{ max_number: number | null }>(
    `SELECT MAX(CAST(SUBSTR(receipt_number, ?) AS INTEGER)) AS max_number
     FROM payments WHERE gym_id = ? AND receipt_number LIKE ?`,
    [suffixStart, gymId, `${prefix}-%`],
  )?.max_number ?? 0;
  const receiptMax = db.get<{ max_number: number | null }>(
    `SELECT MAX(CAST(SUBSTR(receipt_number, ?) AS INTEGER)) AS max_number
     FROM receipts WHERE gym_id = ? AND receipt_number LIKE ?`,
    [suffixStart, gymId, `${prefix}-%`],
  )?.max_number ?? 0;
  let next = Math.max(stored, paymentMax, receiptMax) + 1;
  let receiptNumber = `${prefix}-${String(next).padStart(6, "0")}-${newId().slice(0, 8)}`;
  while (
    db.get(`SELECT 1 FROM payments WHERE gym_id = ? AND receipt_number = ? LIMIT 1`, [gymId, receiptNumber]) ||
    db.get(`SELECT 1 FROM receipts WHERE gym_id = ? AND receipt_number = ? LIMIT 1`, [gymId, receiptNumber])
  ) {
    next += 1;
    receiptNumber = `${prefix}-${String(next).padStart(6, "0")}-${newId().slice(0, 8)}`;
  }
  const value = String(next);
  if (row) {
    db.run(`UPDATE app_metadata SET value = ?, updated_at = ? WHERE key = ?`, [value, nowIso(), key]);
  } else {
    db.run(`INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)`, [key, value, nowIso()]);
  }
  return receiptNumber;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export interface ReceiptData {
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  currencyCode: string;
  receiptNumber: string;
  memberName: string;
  memberCode: string;
  planName: string | null;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  amountMinor: number;
  methodCode: string;
  paidAt: string;
  receivedByName: string;
  notes: string | null;
}

export function formatMinor(amountMinor: number, currencyCode: string): string {
  const major = amountMinor / 100;
  const formatted = major.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencyCode} ${formatted}`;
}

export function renderReceiptHtml(data: ReceiptData): string {
  const rows: Array<[string, string]> = [
    ["Receipt #", data.receiptNumber],
    ["Date", new Date(data.paidAt).toLocaleString()],
    ["Member", `${data.memberName} (${data.memberCode})`],
  ];
  if (data.planName) {
    rows.push(["Plan", data.planName]);
  }
  if (data.membershipStartDate && data.membershipEndDate) {
    rows.push(["Membership period", `${data.membershipStartDate} to ${data.membershipEndDate}`]);
  }
  rows.push(["Payment method", data.methodCode.replaceAll("_", " ")]);
  if (data.notes) {
    rows.push(["Notes", data.notes]);
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${esc(data.receiptNumber)}</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; color: #101828; margin: 0; background: #f4f4f5; }
  .sheet { max-width: 420px; margin: 24px auto; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 8px 24px rgba(16,24,40,.08); }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #667085; font-size: 12px; margin: 0 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 7px 0; border-bottom: 1px solid #f0f0f1; vertical-align: top; }
  td.k { color: #667085; width: 38%; }
  td.v { text-align: right; font-weight: 500; }
  .total { margin-top: 18px; background: #ecfdf3; border: 1px solid #abefc6; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: baseline; }
  .total .amount { font-size: 22px; font-weight: 700; color: #067647; }
  .footer { margin-top: 20px; text-align: center; color: #98a2b3; font-size: 11px; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="sheet">
  <h1>${esc(data.gymName)}</h1>
  <p class="sub">${esc(data.gymAddress ?? "")}${data.gymAddress && data.gymPhone ? " · " : ""}${esc(data.gymPhone ?? "")}</p>
  <table>
    ${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join("\n    ")}
  </table>
  <div class="total"><span>Total paid</span><span class="amount">${esc(formatMinor(data.amountMinor, data.currencyCode))}</span></div>
  <p class="footer">Received by ${esc(data.receivedByName)}. Thank you for your business!<br/>Powered by GYM ERP</p>
</div>
</body>
</html>`;
}

export function insertReceiptRow(
  db: SqlDatabase,
  input: {
    gymId: string;
    paymentId: string;
    receiptNumber: string;
    printableHtmlPath: string | null;
  },
): string {
  const id = newId();
  db.run(
    `INSERT INTO receipts (id, gym_id, payment_id, receipt_number, printable_html_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.gymId, input.paymentId, input.receiptNumber, input.printableHtmlPath, nowIso()],
  );
  return id;
}
