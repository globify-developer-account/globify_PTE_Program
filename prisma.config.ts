import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

// A prisma.config.ts disables Prisma's implicit .env loading, hence the
// `dotenv/config` import above — keep it first.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
})
