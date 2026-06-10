import type { QuarantineRecord } from "flake-radar/types/flake-radar";

export interface QuarantineQueueProps {
  records: QuarantineRecord[];
}

const REASON_LABELS: Record<QuarantineRecord["reason"], string> = {
  chronic_flake: "Chronic flake",
  operator_manual: "Manual quarantine",
  policy_threshold: "Policy threshold",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Quarantined tests with operator audit trail. */
export function QuarantineQueue({ records }: QuarantineQueueProps) {
  const active = records.filter((r) => r.status === "active");

  return (
    <section className="flake-radar-panel" aria-label="Quarantine queue">
      <h2 className="flake-radar-panel__title">Quarantine queue</h2>
      <p className="flake-radar-panel__subtitle">
        {active.length} active · tests excluded from blocking merge status
      </p>

      {active.length === 0 ? (
        <p className="flake-radar-empty">No tests are currently quarantined.</p>
      ) : (
        <div className="quarantine-table-wrap">
          <table className="quarantine-table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Reason</th>
                <th scope="col">Quarantined</th>
                <th scope="col">By</th>
                <th scope="col">Blocking</th>
                <th scope="col">Audit notes</th>
              </tr>
            </thead>
            <tbody>
              {active.map((record) => (
                <tr key={record.id}>
                  <td>
                    <span className="quarantine-table__test">{record.testName}</span>
                    <span className="quarantine-table__id">{record.testId}</span>
                  </td>
                  <td>{REASON_LABELS[record.reason]}</td>
                  <td>{formatTimestamp(record.quarantinedAt)}</td>
                  <td>{record.quarantinedBy}</td>
                  <td>
                    {record.excludedFromBlocking ? (
                      <span className="quarantine-badge quarantine-badge--excluded">
                        Excluded
                      </span>
                    ) : (
                      <span className="quarantine-badge">Advisory</span>
                    )}
                  </td>
                  <td className="quarantine-table__notes">
                    {record.auditNotes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {records.some((r) => r.status !== "active") && (
        <details className="quarantine-audit-history">
          <summary>Released / expired ({records.length - active.length})</summary>
          <ul role="list">
            {records
              .filter((r) => r.status !== "active")
              .map((record) => (
                <li key={record.id}>
                  <strong>{record.testName}</strong> — {record.status}
                  {record.releasedAt && (
                    <>
                      {" "}
                      · released {formatTimestamp(record.releasedAt)}
                      {record.releasedBy ? ` by ${record.releasedBy}` : ""}
                    </>
                  )}
                  {record.auditNotes ? ` · ${record.auditNotes}` : ""}
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}
