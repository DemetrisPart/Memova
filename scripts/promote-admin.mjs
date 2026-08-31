/**
 * Promote a user to PLATFORM_ADMIN (or demote back to COUPLE).
 *
 * Usage:
 *   node scripts/promote-admin.mjs partasas96@icloud.com
 *   node scripts/promote-admin.mjs partasas96@icloud.com --couple
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "packages/database/package.json"));
const { PrismaClient, UserRole } = require("@prisma/client");

const envPath = resolve(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const emailArg = process.argv[2];
const demote = process.argv.includes("--couple");

if (!emailArg) {
  console.error("Usage: node scripts/promote-admin.mjs <email> [--couple]");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const prisma = new PrismaClient();

async function main() {
  const role = demote ? UserRole.COUPLE : UserRole.PLATFORM_ADMIN;
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  console.log(`Updated ${email} → ${role}`);
  console.log(
    demote
      ? "Sign in again to refresh the JWT role."
      : "Sign out / sign in again, then open http://localhost:3000/admin",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
