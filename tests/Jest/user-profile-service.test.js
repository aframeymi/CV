// Unit tests for profile lookup and creation, with the fake Prisma client.
import prisma from '../../prismaClient.js';
import { findOrCreateProfile, ProfileConflictError } from '../../src/services/user-profile-service.js';

const CITIZEN_ROLE = { id: 'role-citizen', title: 'Citizen' };
const token = { uid: 'uid-new', email: 'new@example.org', email_verified: true, name: 'Ada Mae Lovelace' };
const uniqueViolation = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

beforeEach(() => {
  prisma.role.findUniqueOrThrow.mockResolvedValue(CITIZEN_ROLE);
  prisma.user.create.mockImplementation(async ({ data }) => ({ id: 'user-new', ...data, role: CITIZEN_ROLE }));
});

describe('findOrCreateProfile', () => {
  it('looks the user up by Firebase ID, not by email', async () => {
    const existing = { id: 'user-1', firebaseUid: token.uid, role: CITIZEN_ROLE };
    prisma.user.findUnique.mockResolvedValue(existing);

    const profile = await findOrCreateProfile(token);

    expect(profile).toBe(existing);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: token.uid },
      include: { role: true },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a citizen profile when none exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const profile = await findOrCreateProfile(token);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        firebaseUid: 'uid-new',
        email: 'new@example.org',
        firstName: 'Ada',
        lastName: 'Mae Lovelace',
        phone: '',
        roleId: CITIZEN_ROLE.id,
      },
      include: { role: true },
    });
    expect(profile.role.title).toBe('Citizen');
  });

  it('copes with a token that has no display name', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await findOrCreateProfile({ ...token, name: undefined });

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.firstName).toBe('');
    expect(data.lastName).toBe('');
  });

  it('refuses to take over an existing account that has the same email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue(uniqueViolation);

    await expect(findOrCreateProfile(token)).rejects.toBeInstanceOf(ProfileConflictError);
  });

  it('returns the profile a parallel request created first', async () => {
    const createdMeanwhile = { id: 'user-new', firebaseUid: token.uid, role: CITIZEN_ROLE };
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(createdMeanwhile);
    prisma.user.create.mockRejectedValue(uniqueViolation);

    await expect(findOrCreateProfile(token)).resolves.toBe(createdMeanwhile);
  });

  it('passes on unexpected database errors', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue(new Error('connection lost'));

    await expect(findOrCreateProfile(token)).rejects.toThrow('connection lost');
  });
});

describe('findOrCreateProfile with registration details', () => {
  it('stores the phone number from the registration form', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await findOrCreateProfile(token, { phone: '0301234567' });

    expect(prisma.user.create.mock.calls[0][0].data.phone).toBe('0301234567');
  });
});
