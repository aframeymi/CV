import prisma from '../../prismaClient.js';
import { CITIZEN_ROLE } from '../policies/roles.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export class ProfileConflictError extends Error {}

// Profiles are matched by Firebase ID, never by email: an email alone does not prove who someone is.
// `details` holds optional fields that only the registration form provides.
export async function findOrCreateProfile(token, details = {}) {
  const existing = await findProfileByFirebaseUid(token.uid);
  return existing ?? createCitizenProfile(token, details);
}

function findProfileByFirebaseUid(firebaseUid) {
  return prisma.user.findUnique({ where: { firebaseUid }, include: { role: true } });
}

async function createCitizenProfile(token, { phone = '' }) {
  const citizenRole = await prisma.role.findUniqueOrThrow({ where: { title: CITIZEN_ROLE } });
  const { firstName, lastName } = splitDisplayName(token.name);
  try {
    return await prisma.user.create({
      data: {
        firebaseUid: token.uid,
        email: token.email,
        firstName,
        lastName,
        phone,
        roleId: citizenRole.id,
      },
      include: { role: true },
    });
  } catch (error) {
    if (error.code === UNIQUE_CONSTRAINT_VIOLATION) {
      return handleDuplicateProfile(token);
    }
    throw error;
  }
}

// A parallel request may have created the profile first. Any other clash means the email
// belongs to a different account, which must never be taken over automatically.
async function handleDuplicateProfile(token) {
  const createdMeanwhile = await findProfileByFirebaseUid(token.uid);
  if (createdMeanwhile) {
    return createdMeanwhile;
  }
  throw new ProfileConflictError(
    'An account with this email address already exists. Please contact the site administrator.'
  );
}

function splitDisplayName(displayName = '') {
  const [firstName = '', ...otherNames] = displayName.trim().split(/\s+/);
  return { firstName, lastName: otherNames.join(' ') };
}
