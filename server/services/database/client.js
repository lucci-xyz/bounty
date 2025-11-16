import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client instance for database access
 */
const prisma = new PrismaClient();

/**
 * Initialize database connection
 * @throws {Error} If connection fails
 */
export async function initDB() {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    throw error;
  }
}

export { prisma };
