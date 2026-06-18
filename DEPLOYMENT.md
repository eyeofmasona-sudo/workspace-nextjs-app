# Agent OS — Deployment Guide

## Database: Supabase Postgres + Prisma Migrate

Проект использует **Supabase Postgres** с двумя connection string и
**`prisma migrate`** для управления схемой.

---

## Supabase Setup

### Получение строк подключения

1. Supabase Dashboard → Project → Settings → Database → Connection string
2. Скопируй два URL:

| URL | Порт | Назначение |
|-----|------|-----------|
| Pooled (Transaction mode) | `:6543` | `DATABASE_URL` — runtime (Next.js, API, agents) |
| Direct | `:5432` | `DIRECT_URL` — только migrate/introspect |

### .env (production — НЕ коммитить)

```env
# Runtime (pgBouncer, transaction mode)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migrate only (direct connection)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

Параметры `?pgbouncer=true&connection_limit=1` **обязательны** для pooled URL —
pgBouncer в transaction mode не поддерживает prepared statements, Prisma
переключается на inline params при наличии этого флага.

---

## Первый деплой на новую БД

```bash
# 1. Установи переменные окружения (DATABASE_URL + DIRECT_URL)

# 2. Примени миграции (использует DIRECT_URL — прямое соединение)
npm run db:deploy
# = npx prisma migrate deploy

# 3. Запусти seed (создаёт агентов, навыки, инструменты)
npm run db:seed
# = npx prisma db seed

# 4. Запусти сервер
npm run start
```

## Деплой обновлений (schema changes)

```bash
# 1. Создай миграцию локально (требует живой DIRECT_URL)
npx prisma migrate dev --name describe_change

# 2. Закоммить schema.prisma + новый файл в prisma/migrations/

# 3. В production:
npm run db:deploy   # применяет только новые миграции, не трогает данные
```

---

## Скрипты package.json

| Команда | Описание |
|---------|---------|
| `npm run db:migrate` | `prisma migrate dev` — создать новую миграцию (dev) |
| `npm run db:deploy`  | `prisma migrate deploy` — применить миграции (prod) ✅ |
| `npm run db:status`  | `prisma migrate status` — статус миграций |
| `npm run db:generate`| `prisma generate` — перегенерировать клиент |

---

## Локальная разработка

```bash
# Можно использовать локальный Supabase CLI или remote dev project
# Обязательно ставить оба URL в .env.local
npx prisma migrate dev   # создаёт миграции через DIRECT_URL
npm run dev
```

---

## Migration files

```
prisma/
├── schema.prisma                     # provider = "postgresql"
├── migrations/
│   ├── migration_lock.toml           # provider = "postgresql" — коммитить
│   └── 20260618000000_init_postgres/
│       └── migration.sql             # Полный pg baseline (1357 строк, 136 индексов)
└── migrations_sqlite_archive/        # Старые SQLite миграции — только для истории
    ├── 20260615000000_init/
    ├── 20260615112734_add_content_crm_indexes/
    └── 20260615214432_add_tool_execution_input_full/
```

---

## ⚠️ Что НЕ делать

```bash
npx prisma db push        # Обходит миграции — НЕ использовать в prod
npx prisma migrate reset  # УДАЛЯЕТ ВСЕ ДАННЫЕ
```

## Данные из SQLite

Dev-данные из `db/custom.db` **не мигрировались** (умышленно).
Они пересоздаются через `npm run db:seed` на новой БД.
`db/custom.db` и `prisma/db/custom.db` исключены из git (`.gitignore`).
