import { PrismaClient } from '@prisma/client';

// Add { log: ['query'] } to see all queries in your console
const prisma = new PrismaClient();

export default prisma;