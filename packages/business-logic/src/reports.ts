import type { SqlDatabase } from "@gym-erp/database";

export interface DashboardSummary {
  todayRevenueMinor: number;
  todayExpensesMinor: number;
  todayCheckIns: number;
  activeMembers: number;
  expiringSoonCount: number;
  pendingMembers: number;
  monthRevenueMinor: number;
  monthExpensesMinor: number;
  last7Days: Array<{ day: string; revenueMinor: number; checkIns: number }>;
  expiringSoon: Array<{
    memberId: string;
    memberName: string;
    memberCode: string;
    planName: string;
    endDate: string;
    daysLeft: number;
  }>;
  expiredMembers: Array<{
    memberId: string;
    memberName: string;
    memberCode: string;
    planName: string;
    endDate: string;
  }>;
}

export function getDashboardSummary(db: SqlDatabase, gymId: string): DashboardSummary {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const revenue = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM payments WHERE gym_id = ? AND deleted_at IS NULL AND date(paid_at) = ?`,
    [gymId, today],
  );
  const expenses = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM expenses WHERE gym_id = ? AND deleted_at IS NULL AND date(incurred_at) = ?`,
    [gymId, today],
  );
  const checkIns = db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM attendance WHERE gym_id = ? AND deleted_at IS NULL AND direction = 'check_in' AND date(occurred_at) = ?`,
    [gymId, today],
  );
  const active = db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM members WHERE gym_id = ? AND deleted_at IS NULL AND status = 'active'`,
    [gymId],
  );
  const pending = db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM members WHERE gym_id = ? AND deleted_at IS NULL AND status = 'pending'`,
    [gymId],
  );
  const monthRevenue = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM payments WHERE gym_id = ? AND deleted_at IS NULL AND date(paid_at) >= ?`,
    [gymId, monthStart],
  );
  const monthExpenses = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM expenses WHERE gym_id = ? AND deleted_at IS NULL AND date(incurred_at) >= ?`,
    [gymId, monthStart],
  );

  const last7Days: Array<{ day: string; revenueMinor: number; checkIns: number }> = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const day = date.toISOString().slice(0, 10);
    const dayRevenue = db.get<{ c: number | null }>(
      `SELECT SUM(amount_minor) as c FROM payments WHERE gym_id = ? AND deleted_at IS NULL AND date(paid_at) = ?`,
      [gymId, day],
    );
    const dayCheckIns = db.get<{ c: number }>(
      `SELECT COUNT(*) as c FROM attendance WHERE gym_id = ? AND deleted_at IS NULL AND direction = 'check_in' AND date(occurred_at) = ?`,
      [gymId, day],
    );
    last7Days.push({ day, revenueMinor: dayRevenue?.c ?? 0, checkIns: dayCheckIns?.c ?? 0 });
  }

  const expiringSoon = db.all<{
    memberId: string;
    memberName: string;
    memberCode: string;
    planName: string;
    endDate: string;
    daysLeft: number;
  }>(`
    SELECT ms.member_id as "memberId", m.full_name as "memberName", m.member_code as "memberCode",
           p.name as "planName", ms.end_date as "endDate",
           CAST(julianday(ms.end_date) - julianday(date('now')) AS INTEGER) as "daysLeft"
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    JOIN membership_plans p ON p.id = ms.plan_id
    WHERE ms.gym_id = ? AND ms.deleted_at IS NULL AND ms.status = 'active'
      AND ms.end_date BETWEEN date('now') AND date('now', '+7 days')
    ORDER BY ms.end_date ASC LIMIT 20`,
    [gymId],
  );
  const expiredMembers = db.all<{
    memberId: string;
    memberName: string;
    memberCode: string;
    planName: string;
    endDate: string;
  }>(`
    SELECT ms.member_id as "memberId", m.full_name as "memberName", m.member_code as "memberCode",
           p.name as "planName", ms.end_date as "endDate"
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    JOIN membership_plans p ON p.id = ms.plan_id
    WHERE ms.gym_id = ? AND ms.deleted_at IS NULL AND ms.end_date < date('now')
      AND ms.end_date = (
        SELECT MAX(ms2.end_date) FROM memberships ms2
        WHERE ms2.member_id = ms.member_id AND ms2.deleted_at IS NULL
      )
    ORDER BY ms.end_date DESC LIMIT 50`,
    [gymId],
  );

  return {
    todayRevenueMinor: revenue?.c ?? 0,
    todayExpensesMinor: expenses?.c ?? 0,
    todayCheckIns: checkIns?.c ?? 0,
    activeMembers: active?.c ?? 0,
    expiringSoonCount: expiringSoon.length,
    pendingMembers: pending?.c ?? 0,
    monthRevenueMinor: monthRevenue?.c ?? 0,
    monthExpensesMinor: monthExpenses?.c ?? 0,
    last7Days,
    expiringSoon,
    expiredMembers,
  };
}

export interface FinancialReport {
  from: string;
  to: string;
  currencyCode: string;
  totals: { revenueMinor: number; expensesMinor: number; otherIncomeMinor: number; netMinor: number };
  revenueByMethod: Array<{ methodCode: string; totalMinor: number; count: number }>;
  expensesByCategory: Array<{ categoryName: string; totalMinor: number; count: number }>;
  revenueByDay: Array<{ day: string; totalMinor: number }>;
  newMembers: number;
  renewals: number;
}

export function getFinancialReport(
  db: SqlDatabase,
  gymId: string,
  from: string,
  to: string,
): FinancialReport {
  const gym = db.get<{ currency_code: string }>(`SELECT currency_code FROM gyms WHERE id = ?`, [gymId]);
  const currencyCode = gym?.currency_code ?? "PKR";

  const revenue = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM payments
     WHERE gym_id = ? AND deleted_at IS NULL AND date(paid_at) BETWEEN ? AND ?`,
    [gymId, from, to],
  );
  const expenses = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM expenses
     WHERE gym_id = ? AND deleted_at IS NULL AND date(incurred_at) BETWEEN ? AND ?`,
    [gymId, from, to],
  );
  const otherIncome = db.get<{ c: number | null }>(
    `SELECT SUM(amount_minor) as c FROM income
     WHERE gym_id = ? AND date(received_at) BETWEEN ? AND ?`,
    [gymId, from, to],
  );
  const newMembers = db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM members WHERE gym_id = ? AND deleted_at IS NULL AND date(join_date) BETWEEN ? AND ?`,
    [gymId, from, to],
  );
  const renewals = db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM renewals WHERE gym_id = ? AND date(created_at) BETWEEN ? AND ?`,
    [gymId, from, to],
  );

  const revenueByMethod = db.all<{ methodCode: string; totalMinor: number; count: number }>(`
    SELECT method_code as "methodCode", SUM(amount_minor) as "totalMinor", COUNT(*) as "count"
    FROM payments WHERE gym_id = ? AND deleted_at IS NULL AND date(paid_at) BETWEEN ? AND ?
    GROUP BY method_code ORDER BY "totalMinor" DESC`,
    [gymId, from, to],
  );
  const expensesByCategory = db.all<{ categoryName: string; totalMinor: number; count: number }>(`
    SELECT ec.name as "categoryName", SUM(e.amount_minor) as "totalMinor", COUNT(*) as "count"
    FROM expenses e JOIN expense_categories ec ON ec.id = e.category_id
    WHERE e.gym_id = ? AND e.deleted_at IS NULL AND date(e.incurred_at) BETWEEN ? AND ?
    GROUP BY ec.name ORDER BY "totalMinor" DESC`,
    [gymId, from, to],
  );
  const revenueByDay = db.all<{ day: string; totalMinor: number }>(`
    SELECT date(paid_at) as "day", SUM(amount_minor) as "totalMinor"
    FROM payments WHERE gym_id = ? AND deleted_at IS NULL AND date(paid_at) BETWEEN ? AND ?
    GROUP BY date(paid_at) ORDER BY "day" ASC`,
    [gymId, from, to],
  );

  const revenueMinor = revenue?.c ?? 0;
  const expensesMinor = expenses?.c ?? 0;
  const incomeMinor = otherIncome?.c ?? 0;

  return {
    from,
    to,
    currencyCode,
    totals: {
      revenueMinor,
      expensesMinor,
      otherIncomeMinor: incomeMinor,
      netMinor: revenueMinor + incomeMinor - expensesMinor,
    },
    revenueByMethod,
    expensesByCategory,
    revenueByDay,
    newMembers: newMembers?.c ?? 0,
    renewals: renewals?.c ?? 0,
  };
}

export interface MemberStats {
  total: number;
  active: number;
  expired: number;
  pending: number;
  suspended: number;
  cancelled: number;
  byGender: Array<{ gender: string; count: number }>;
  newPerMonth: Array<{ month: string; count: number }>;
}

export function getMemberStats(db: SqlDatabase, gymId: string): MemberStats {
  const byStatus = db.all<{ status: string; c: number }>(
    `SELECT status, COUNT(*) as c FROM members WHERE gym_id = ? AND deleted_at IS NULL GROUP BY status`,
    [gymId],
  );
  const totals = {
    total: 0,
    active: 0,
    expired: 0,
    pending: 0,
    suspended: 0,
    cancelled: 0,
  };
  for (const row of byStatus) {
    totals.total += row.c;
    if (row.status in totals) {
      (totals as Record<string, number>)[row.status] = row.c;
    }
  }
  const byGender = db.all<{ gender: string; count: number }>(
    `SELECT gender, COUNT(*) as count FROM members WHERE gym_id = ? AND deleted_at IS NULL GROUP BY gender`,
    [gymId],
  );
  const newPerMonth = db.all<{ month: string; count: number }>(
    `SELECT strftime('%Y-%m', join_date) as month, COUNT(*) as count
     FROM members WHERE gym_id = ? AND deleted_at IS NULL
       AND join_date >= date('now', '-11 months', 'start of month')
     GROUP BY month ORDER BY month ASC`,
    [gymId],
  );
  return { ...totals, byGender, newPerMonth };
}

export interface AttendanceReportDay {
  day: string;
  checkIns: number;
  checkOuts: number;
  uniqueMembers: number;
}

export function getAttendanceReport(
  db: SqlDatabase,
  gymId: string,
  from: string,
  to: string,
): AttendanceReportDay[] {
  const rows = db.all<{ day: string; checkIns: number; checkOuts: number; uniqueMembers: number }>(`
    SELECT date(occurred_at) as day,
           SUM(CASE WHEN direction = 'check_in' THEN 1 ELSE 0 END) as "checkIns",
           SUM(CASE WHEN direction = 'check_out' THEN 1 ELSE 0 END) as "checkOuts",
           COUNT(DISTINCT CASE WHEN direction = 'check_in' THEN member_id END) as "uniqueMembers"
    FROM attendance
    WHERE gym_id = ? AND deleted_at IS NULL AND date(occurred_at) BETWEEN ? AND ?
    GROUP BY date(occurred_at) ORDER BY day ASC`,
    [gymId, from, to],
  );
  return rows;
}

export function listAttendance(
  db: SqlDatabase,
  gymId: string,
  filter: { day?: string; limit?: number } = {},
): Array<{
  id: string;
  member_id: string;
  member_name: string;
  member_code: string;
  direction: string;
  method: string;
  occurred_at: string;
}> {
  const limit = filter.limit ?? 100;
  if (filter.day) {
    return db.all(`
      SELECT a.id, a.member_id, m.full_name as member_name, m.member_code, a.direction, a.method, a.occurred_at
      FROM attendance a JOIN members m ON m.id = a.member_id
      WHERE a.gym_id = ? AND a.deleted_at IS NULL AND date(a.occurred_at) = ?
      ORDER BY a.occurred_at DESC LIMIT ?`,
      [gymId, filter.day, limit],
    );
  }
  return db.all(`
    SELECT a.id, a.member_id, m.full_name as member_name, m.member_code, a.direction, a.method, a.occurred_at
    FROM attendance a JOIN members m ON m.id = a.member_id
    WHERE a.gym_id = ? AND a.deleted_at IS NULL
    ORDER BY a.occurred_at DESC LIMIT ?`,
    [gymId, limit],
  );
}
