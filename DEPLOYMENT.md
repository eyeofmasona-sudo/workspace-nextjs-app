# Agent OS — Deployment Guide

## Database: Migration-based workflow (Prisma Migrate)

This project uses **`prisma migrate`** (not `db push`) for schema management.  
`db push` was used during initial development and is now replaced by migrations.

---

## Local Development

```bash
# Apply any pending migrations to local DB
npm run db:migrate
# or: npx prisma migrate dev

# Check migration status
npm run db:status

# Generate Prisma client after schema changes
npm run db:generate
```

## Production Deploy

```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Apply pending migrations — NON-DESTRUCTIVE, runs only new migrations
npm run db:deploy
# or: npx prisma migrate deploy

# 3. Start the server
npm run start
```

**`prisma migrate deploy`** is safe for production:
- Applies only pending migrations in order
- Never resets or drops existing data
- Fails fast if a migration has already been partially applied
- Idempotent if no pending migrations exist

## Migration Files

```
prisma/migrations/
├── migration_lock.toml                          # Lock file — commit this
├── 20260615000000_init/
│   └── migration.sql                            # Baseline: all tables (613 lines)
└── 20260615112734_add_content_crm_indexes/
    └── migration.sql                            # Delta: content/CRM tables + 136 indexes (567 lines)
```

## Adding Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Create and apply migration
npx prisma migrate dev --name describe_your_change
# 3. Commit both schema.prisma and the new migration file
```

## ⚠️ Do NOT use in production

```bash
# These are DEVELOPMENT-ONLY commands:
npx prisma db push        # Bypasses migrations — do not use in prod
npx prisma migrate reset  # DROPS ALL DATA
```
