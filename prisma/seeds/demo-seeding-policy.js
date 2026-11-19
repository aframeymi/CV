export const DEMO_FLAG = '--demo';

// Demo data is added only when asked for explicitly, and never in production
export function shouldSeedDemoData(args, env) {
  if (!args.includes(DEMO_FLAG)) {
    return false;
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data because NODE_ENV is production.');
  }
  return true;
}
