// Writes one JSON object per line to the server output, which Render keeps in its log view.
// Because every value stays inside its JSON field, a line break in a value cannot start a fake entry.
function writeEntry(write, entry) {
  write(JSON.stringify({ time: new Date().toISOString(), ...entry }));
}

// Details of an unexpected error, for the developer only. The visitor sees just the error ID.
export function logError(errorId, req, error) {
  writeEntry(console.error, {
    type: 'error',
    errorId,
    method: req.method,
    path: req.path,
    error: error?.stack ?? String(error),
  });
}

// Security-relevant actions such as logins, refused requests, and changes to reports.
// People appear only by ID and IP address: entries never hold passwords, tokens, cookies, or email addresses.
export function logSecurityEvent(event, req, details = {}) {
  writeEntry(console.info, {
    type: 'security',
    event,
    ip: req.ip,
    userId: req.currentUser?.id,
    firebaseUid: req.user?.uid,
    method: req.method,
    path: req.path,
    ...forwardedForDiagnostic(req),
    ...details,
  });
}

// Temporary, to measure TRUST_PROXY_HOPS on Render: while LOG_FORWARDED_FOR=true, entries also show
// the X-Forwarded-For list, so the position of the visitor's own address can be counted.
// Remove this, and the setting on Render, once TRUST_PROXY_HOPS is set.
function forwardedForDiagnostic(req) {
  return process.env.LOG_FORWARDED_FOR === 'true' ? { forwardedFor: req.headers['x-forwarded-for'] } : {};
}
