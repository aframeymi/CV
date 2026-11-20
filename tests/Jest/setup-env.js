// Settings the application requires at startup, with values that only ever exist in tests
process.env.CSRF_SECRET = 'csrf-secret-used-only-by-the-automated-tests';

// Security events are written with console.info. Keep them out of the test output;
// tests that check the log replace this with their own spy.
jest.spyOn(console, 'info').mockImplementation(() => {});
