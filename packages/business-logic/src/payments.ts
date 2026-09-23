import type { SqlDatabase } from "@gym-erp/database";
import { formatMinor, renderReceiptHtml, type ReceiptData } from "./receipts.js";

export interface PaymentListRow {
  id: string;
  member_id: string | null;
  member_name: string | null;
  member_code: string | null;
  membership_id: string | null;
  plan_name: string | null;
  amount_minor: number;
  currency_code: string;
  method_code: string;
  receipt_number: string;
  notes: string | null;
  paid_at: string;
  received_by: string | null;
}

export function listPayments(
  db: SqlDatabase,
  gymId: string,
  filter: { from?: string; to?: string; memberId?: string; methodCode?: string; limit?: number } = {},
): PaymentListRow[] {
  const limit = filter.limit ?? 200;
  const conditions = ["p.gym_id = ?", "p.deleted_at IS NULL"];
  const params: unknown[] = [gymId];
  if (filter.from) {
    conditions.push("date(p.paid_at) >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("date(p.paid_at) <= ?");
    params.push(filter.to);
  }
  if (filter.memberId) {
    conditions.push("p.member_id = ?");
    params.push(filter.memberId);
  }
  if (filter.methodCode) {
    conditions.push("p.method_code = ?");
    params.push(filter.methodCode);
  }
  return db.all<PaymentListRow>(
    `SELECT p.id, p.member_id, m.full_name as member_name, m.member_code, p.membership_id,
            pl.name as plan_name, p.amount_minor, p.currency_code, p.method_code,
            p.receipt_number, p.notes, p.paid_at, u.full_name as received_by
     FROM payments p
     LEFT JOIN members m ON m.id = p.member_id
     LEFT JOIN memberships ms ON ms.id = p.membership_id
     LEFT JOIN membership_plans pl ON pl.id = ms.plan_id
     LEFT JOIN users u ON u.id = p.received_by_user_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.paid_at DESC LIMIT ?`,
    [...params, limit],
  );
}

export function getReceiptHtml(db: SqlDatabase, gymId: string, paymentId: string): { html: string } | null {
  const row = db.get<{
    amount_minor: number;
    currency_code: string;
    method_code: string;
    receipt_number: string;
    notes: string | null;
    paid_at: string;
    member_id: string | null;
    membership_id: string | null;
    received_by: string | null;
  }>(
    `SELECT amount_minor, currency_code, method_code, receipt_number, notes, paid_at,
            member_id, membership_id, received_by
     FROM payments WHERE id = ? AND gym_id = ? AND deleted_at IS NULL`,
    [paymentId, gymId],
  );
  if (!row) return null;

  const gym = db.get<{ name: string; address: string | null; phone: string | null }>(
    `SELECT name, address, phone FROM gyms WHERE id = ?`,
    [gymId],
  );
  const member = row.member_id
    ? db.get<{ full_name: string; member_code: string }>(
        `SELECT full_name, member_code FROM members WHERE id = ?`,
        [row.member_id],
      )
    : undefined;
  const membership = row.membership_id
    ? db.get<{ start_date: string; end_date: string; plan_name: string }>(
        `SELECT ms.start_date, ms.end_date, p.name as plan_name
         FROM memberships ms JOIN membership_plans p ON p.id = ms.plan_id WHERE ms.id = ?`,
        [row.membership_id],
      )
    : undefined;

  const data: ReceiptData = {
    gymName: gym?.name ?? "Gym",
    gymAddress: gym?.address ?? null,
    gymPhone: gym?.phone ?? null,
    currencyCode: row.currency_code,
    receiptNumber: row.receipt_number,
    memberName: member?.full_name ?? "Walk-in",
    memberCode: member?.member_code ?? "-",
    planName: membership?.plan_name ?? null,
    membershipStartDate: membership?.start_date ?? null,
    membershipEndDate: membership?.end_date ?? null,
    amountMinor: row.amount_minor,
    methodCode: row.method_code,
    paidAt: row.paid_at,
    receivedByName: row.received_by ?? "Front desk",
    notes: row.notes,
  };
  return { html: renderReceiptHtml(data) };
}

export { formatMinor };
