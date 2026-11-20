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
