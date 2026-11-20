// Unit tests for the form rules, without the app around them.
import {
  checkForm,
  isRecordId,
  loginForm,
  MAX_LENGTH,
  newReportForm,
  registrationForm,
  reportChangesForm,
} from '../../src/validation/forms.js';
import { NEIGHBORHOOD_ID } from './helpers/ids.js';

const report = { title: 'Broken light', description: 'Out since Monday', neighborhoodId: NEIGHBORHOOD_ID };
const registration = {
  name: 'Ada',
  surname: 'Lovelace',
  email: 'ada@example.org',
  password: 'analytical engine',
  confirm_password: 'analytical engine',
};

describe('newReportForm', () => {
  it('accepts a complete report and trims the text', () => {
    const { values } = checkForm(newReportForm, { ...report, title: '  Broken light  ' });

    expect(values).toEqual(report);
  });

  it.each(['title', 'description', 'neighborhoodId'])('requires %s', (field) => {
    expect(checkForm(newReportForm, { ...report, [field]: undefined }).problem).toBeDefined();
    expect(checkForm(newReportForm, { ...report, [field]: '' }).problem).toBeDefined();
  });

  it('treats text made only of spaces as missing', () => {
    expect(checkForm(newReportForm, { ...report, title: '   ' }).problem).toBe('Please enter title.');
  });

  it.each([
    ['title', MAX_LENGTH.title],
    ['description', MAX_LENGTH.description],
  ])('accepts a %s of the maximum length, and refuses one character more', (field, maxLength) => {
    expect(checkForm(newReportForm, { ...report, [field]: 'a'.repeat(maxLength) }).problem).toBeUndefined();
    expect(checkForm(newReportForm, { ...report, [field]: 'a'.repeat(maxLength + 1) }).problem).toBe(
      `The ${field} can be at most ${maxLength} characters.`
    );
  });

  it('refuses a field sent twice, which arrives as a list', () => {
    expect(checkForm(newReportForm, { ...report, title: ['one', 'two'] }).problem).toBeDefined();
  });

  it('refuses a neighborhood ID in the wrong format', () => {
    expect(checkForm(newReportForm, { ...report, neighborhoodId: "' OR 1=1 --" }).problem).toBe(
      'Please choose a neighborhood.'
    );
  });

  it('drops fields the form does not define', () => {
    const { values } = checkForm(newReportForm, { ...report, status: 'RESOLVED', authorId: 'someone' });

    expect(values).toEqual(report);
  });
});

describe('reportChangesForm', () => {
  it('keeps only the title and description', () => {
    const { values } = checkForm(reportChangesForm, { title: 'New', description: 'Text', status: 'RESOLVED' });

    expect(values).toEqual({ title: 'New', description: 'Text' });
  });
});

describe('registrationForm', () => {
  it('accepts a complete registration', () => {
    expect(checkForm(registrationForm, registration).problem).toBeUndefined();
  });

  it.each(['not-an-email', 'ada@', '@example.org', `${'a'.repeat(250)}@example.org`])(
    'refuses the email address %s',
    (email) => {
      expect(checkForm(registrationForm, { ...registration, email }).problem).toBe(
        'Please enter a valid email address.'
      );
    }
  );

  it('refuses a name longer than 50 characters', () => {
    expect(checkForm(registrationForm, { ...registration, name: 'a'.repeat(51) }).problem).toBeDefined();
  });

  it('refuses passwords that do not match', () => {
    const { problem } = checkForm(registrationForm, { ...registration, confirm_password: 'something else' });

    expect(problem).toBe('Passwords do not match.');
  });

  it('keeps spaces around the password, because they are part of it', () => {
    const password = ' analytical engine ';
    const { values } = checkForm(registrationForm, { ...registration, password, confirm_password: password });

    expect(values.password).toBe(password);
  });
});

describe('new passwords', () => {
  function register(password) {
    return checkForm(registrationForm, { ...registration, password, confirm_password: password });
  }

  it('accepts 12 characters with no symbols or digits', () => {
    expect(register('abcdefghijkl').problem).toBeUndefined();
  });

  it('refuses 11 characters', () => {
    expect(register('abcdefghijk').problem).toBe('Please choose a password with at least 12 characters.');
  });
});

describe('loginForm', () => {
  it('requires a password', () => {
    expect(checkForm(loginForm, { email: 'ada@example.org' }).problem).toBe('Please enter a password.');
  });

  it('still accepts a short password, so accounts created before the 12-character rule can log in', () => {
    expect(checkForm(loginForm, { email: 'ada@example.org', password: 'short' }).problem).toBeUndefined();
  });
});

describe('isRecordId', () => {
  it('accepts an ID in the format Prisma generates', () => {
    expect(isRecordId('cmhb1x8k20000qz0g5d3ve7ny')).toBe(true);
  });

  it.each(['missing', '', 'CMHB1X8K20000QZ0G5D3VE7NY', "' OR 1=1 --", 'cmhb1x8k20000qz0g5d3ve7ny/../x'])(
    'refuses %p',
    (id) => {
      expect(isRecordId(id)).toBe(false);
    }
  );
});
