export interface DeadlineComplaint {
  status: string; priority: number | null; is_sensitive: boolean; created_at: string;
}
/** Terminal/review cases never escalate; sensitive reports never gain union recipients. */
export function deadlinePlan(c: DeadlineComplaint, responseHours: number, now = Date.now()): { overdue: boolean; headOnly: boolean; finalStage: boolean } {
  const hours = c.priority === 1 ? Math.min(4, responseHours) : c.priority === 2 ? Math.min(24, responseHours) : responseHours;
  const age = now - Date.parse(c.created_at);
  const eligible = ['submitted', 'under_verification', 'accepted', 'in_progress'].includes(c.status);
  return { overdue: eligible && Number.isFinite(age) && hours > 0 && age >= hours * 3600e3,
    headOnly: c.is_sensitive || c.priority === 1, finalStage: age >= hours * 2 * 3600e3 };
}
