import { Prisma, PrismaClient } from '@prisma/client';
import { env } from './env';

// Serialize Decimal money values as JSON numbers instead of strings.
// Safe for demo INR amounts (2 decimal places, well within double precision).
(Prisma.Decimal.prototype as unknown as { toJSON: () => unknown }).toJSON = function toJSON(this: Prisma.Decimal) {
  return this.toNumber();
};

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type Tx = Prisma.TransactionClient;
