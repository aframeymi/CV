// Fake of prismaClient.js. Tests choose what each query returns.
const prisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  role: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn() },
  city: { findMany: jest.fn() },
  neighborhood: { findUnique: jest.fn(), findMany: jest.fn() },
  report: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  statusChange: { create: jest.fn() },
  attachment: { create: jest.fn() },
  $queryRaw: jest.fn(),
  // Run the transaction body straight away, using this same fake as the transaction client
  $transaction: (runInTransaction) => runInTransaction(prisma),
};

export default prisma;
