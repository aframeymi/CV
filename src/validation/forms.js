// The rules every form must meet before the server acts on it.
// Browsers can skip the checks in the HTML, so these are the ones that count.
import { z } from 'zod';

// Length is what makes a password hard to guess. Rules about symbols or digits mostly lead to
// predictable passwords, so there are none (NIST SP 800-63B).
export const MIN_NEW_PASSWORD_LENGTH = 12;

export const MAX_LENGTH = {
  title: 120,
  description: 2000,
  name: 50,
  email: 254,
  password: 4096,
};

// Prisma's default IDs: "c" followed by 24 lowercase letters and digits
const RECORD_ID = /^c[a-z0-9]{24}$/;

function requiredText(label, maxLength) {
  const missing = `Please enter ${label}.`;
  return z
    .string({ error: missing })
    .trim()
    .min(1, missing)
    .max(maxLength, `The ${label} can be at most ${maxLength} characters.`);
}

const INVALID_EMAIL = 'Please enter a valid email address.';
const emailAddress = z
  .string({ error: INVALID_EMAIL })
  .trim()
  .max(MAX_LENGTH.email, INVALID_EMAIL)
  .pipe(z.email({ error: INVALID_EMAIL }));

// Passwords are never trimmed: spaces are allowed and count
const password = z
  .string({ error: 'Please enter a password.' })
  .min(1, 'Please enter a password.')
  .max(MAX_LENGTH.password, `Passwords can be at most ${MAX_LENGTH.password} characters.`);

// Only new passwords must be long: accounts created before the rule can still log in
const newPassword = password.min(
  MIN_NEW_PASSWORD_LENGTH,
  `Please choose a password with at least ${MIN_NEW_PASSWORD_LENGTH} characters.`
);

const recordId = (label) => z.string({ error: `Please choose ${label}.` }).regex(RECORD_ID, `Please choose ${label}.`);

const reportChanges = {
  title: requiredText('title', MAX_LENGTH.title),
  description: requiredText('description', MAX_LENGTH.description),
};

export const reportChangesForm = z.object(reportChanges);

export const newReportForm = z.object({
  ...reportChanges,
  neighborhoodId: recordId('a neighborhood'),
});

export const loginForm = z.object({ email: emailAddress, password });

export const passwordResetForm = z.object({ email: emailAddress });

export const registrationForm = z
  .object({
    name: requiredText('name', MAX_LENGTH.name),
    surname: requiredText('surname', MAX_LENGTH.name),
    email: emailAddress,
    password: newPassword,
    confirm_password: z.string({ error: 'Please confirm your password.' }),
  })
  .refine((form) => form.password === form.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

// Returns the cleaned values, or the message of the first rule the input breaks.
// Fields that a form does not define are dropped, so handlers only ever see known fields.
export function checkForm(form, input) {
  const result = form.safeParse(input);
  return result.success ? { values: result.data } : { problem: result.error.issues[0].message };
}

export function isRecordId(value) {
  return RECORD_ID.test(value);
}
