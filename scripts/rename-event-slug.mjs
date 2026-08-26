/**
 * Renames test event slug to match exact event date.
 * Usage: node scripts/rename-event-slug.mjs wedding-jul-2026 wedding-3-oct-2026
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "packages/database/package.json"));
const { PrismaClient } = require("@prisma/client");

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

const oldSlug = process.argv[2] ?? "wedding-jul-2026";
const newSlug = process.argv[3] ?? "wedding-3-oct-2026";
const prisma = new PrismaClient();

try {
  const existing = await prisma.event.findFirst({
    where: { slug: oldSlug, deletedAt: null },
  });
  if (!existing) {
    console.error(`No event found with slug: ${oldSlug}`);
    process.exit(1);
  }

  const taken = await prisma.event.findUnique({ where: { slug: newSlug } });
  if (taken && taken.id !== existing.id) {
    console.error(`Slug already taken: ${newSlug}`);
    process.exit(1);
  }

  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      slug: newSlug,
      eventDate: new Date("2026-10-03T12:00:00.000Z"),
    },
    select: { id: true, slug: true, eventDate: true },
  });

  console.log(
    JSON.stringify(
      {
        id: updated.id,
        slug: updated.slug,
        eventDate: updated.eventDate.toISOString().slice(0, 10),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
