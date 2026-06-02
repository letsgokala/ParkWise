import { prisma } from './prisma';
import { env } from '../config/env';
import { hashPassword } from './crypto';

/**
 * Ensure a System Administrator account exists on startup (idempotent), so a
 * fresh database is immediately usable even before the full seed is run.
 * Credentials come from SYS_ADMIN_* env vars.
 */
export async function ensureSystemAdmin(): Promise<void> {
  const email = env.systemAdmin.email;
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { sysAdminProfile: true },
  });

  if (existing) {
    if (!existing.sysAdminProfile) {
      await prisma.systemAdminProfile.create({ data: { userId: existing.id } });
    }
    return;
  }

  const passwordHash = await hashPassword(env.systemAdmin.password);
  await prisma.user.create({
    data: {
      email,
      name: env.systemAdmin.name,
      passwordHash,
      role: 'SYSTEM_ADMIN',
      sysAdminProfile: { create: {} },
    },
  });
  console.log(`✅ Seeded system administrator: ${email}`);
}
