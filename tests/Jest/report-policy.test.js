import { canModifyReport } from '../../src/policies/report-policy.js';
import { isAdmin } from '../../src/policies/roles.js';

const author = { id: 'user-1', role: { title: 'Citizen' } };
const otherCitizen = { id: 'user-2', role: { title: 'Citizen' } };
const admin = { id: 'user-3', role: { title: 'Admin' } };
const report = { id: 'report-1', authorId: author.id };

describe('canModifyReport', () => {
  it('allows the author', () => {
    expect(canModifyReport(author, report)).toBe(true);
  });

  it('allows an admin who is not the author', () => {
    expect(canModifyReport(admin, report)).toBe(true);
  });

  it('refuses another citizen', () => {
    expect(canModifyReport(otherCitizen, report)).toBe(false);
  });

  it('refuses when there is no user', () => {
    expect(canModifyReport(null, report)).toBe(false);
  });

  it('refuses when there is no report', () => {
    expect(canModifyReport(author, null)).toBe(false);
  });

  it('refuses a user whose role is missing', () => {
    expect(canModifyReport({ id: 'user-4' }, report)).toBe(false);
  });
});

describe('isAdmin', () => {
  it('recognises the admin role only', () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(author)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
