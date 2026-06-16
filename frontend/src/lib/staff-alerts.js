/** Staff moderation alerts — popup + dedup across socket and HTTP polling. */
export const STAFF_ALERT_KINDS = new Set(["staff_ticket", "staff_ticket_reply", "staff_report"]);

const seenIds = new Set();

export function markStaffAlertsSeen(docs = []) {
  for (const doc of docs) {
    if (doc?.notif_id && STAFF_ALERT_KINDS.has(doc.kind)) {
      seenIds.add(doc.notif_id);
    }
  }
}

/** Show the staff overlay once per notification id. Returns true if dispatched. */
export function publishStaffAlert(doc) {
  if (!doc?.notif_id || !STAFF_ALERT_KINDS.has(doc.kind)) return false;
  if (seenIds.has(doc.notif_id)) return false;
  seenIds.add(doc.notif_id);
  try {
    window.dispatchEvent(new CustomEvent("nexoria:staff-alert", { detail: doc }));
  } catch {
    return false;
  }
  return true;
}
