import { isAdmin } from './roles.js';

// Only the author of a report, or an administrator, may edit or delete it
export function canModifyReport(user, report) {
  if (!user || !report) {
    return false;
  }
  return isAdmin(user) || report.authorId === user.id;
}
