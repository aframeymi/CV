// Limits on how often one client may repeat an action: against password guessing, spam accounts,
// email flooding, and filling the database with reports. Clients are told apart by IP address.
// The counts live in memory, which suits a single server; they start again when it restarts.
import { HOUR, MINUTE, rateLimit } from 'express-rate-limit';

// `respond` sends the page shown once the limit is reached
function limitRequests({ window, limit, respond, countSuccessful = true }) {
  return rateLimit({
    windowMs: window,
    limit,
    skipSuccessfulRequests: !countSuccessful,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => respond(req, res),
  });
}

// Only failed logins count, so someone who signs in and out often is never locked out
export function limitLoginAttempts(respond) {
  return limitRequests({ window: 15 * MINUTE, limit: 10, respond, countSuccessful: false });
}

export function limitRegistrations(respond) {
  return limitRequests({ window: HOUR, limit: 5, respond });
}

// Each request sends an email, so this also keeps the site from being used to flood an inbox
export function limitPasswordResets(respond) {
  return limitRequests({ window: HOUR, limit: 5, respond });
}

export function limitReportSubmissions(respond) {
  return limitRequests({ window: HOUR, limit: 20, respond });
}
