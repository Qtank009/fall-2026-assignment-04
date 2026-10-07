---
name: kysely-migration-generator
description: Use this skill when asked to generate a Kysely database migration from a Mermaid ERD, or to translate an existing schema diagram (schema.mmd or erd.svg) into a TypeScript migration file. Triggers on requests like "generate a migration for this ERD", "read schema.mmd and create a migration", or "translate this diagram into Kysely".
---

# Kysely Migration Generator

## Purpose

Parse a compiled Mermaid ERD (`docs/architecture/schema.mmd`, falling back to `docs/architecture/erd.svg` if the `.mmd` source is unavailable) and translate it into a single, type-safe, production-ready Kysely migration file.

## Execution Workflow

1. **Read the baseline.** Before writing anything, read `src/db/migrations/001_initial_schema.ts` in full. This is the project's established convention for column types, naming, and structure — match its style exactly (e.g. its choice of `serial` vs `uuid` for primary keys, its timestamp column pattern, its `.ifExists()` usage on drops). Do not introduce a different style even if another approach is equally valid.

2. **Read the diagram.** Parse `docs/architecture/schema.mmd`. Identify every entity, its attributes with `PK`/`FK` markers, and every relationship line with its cardinality token.

3. **Translate entities to tables.**
   - Convert each entity name to a `snake_case` table name (e.g. `BORROWERS` → `borrowers`, `USERS` → `users`).
   - Skip creating a table for any entity the user has stated already exists (e.g. if told "the users relation has already been created," do not emit a `createTable('users')` call — only reference it as a foreign key target).

4. **Translate columns.**
   - A `PK` attribute becomes the table's primary key: `serial` with `.primaryKey()` for an integer-style ID, matching whatever the baseline migration uses for its own primary keys. If the ERD explicitly specifies a UUID type, use `uuid` with a default of `gen_random_uuid()` instead — but default to matching the baseline's convention when the diagram doesn't specify.
   - An `FK` attribute becomes `.addColumn('<fk_name>', 'integer', (col) => col.references('<target_table>.id').onDelete('cascade').notNull())` — unless the relationship's cardinality indicates the foreign key side is optional (see cardinality rules below), in which case omit `.notNull()`.
   - Mermaid scalar types map to Postgres/Kysely types as follows: `string` → `varchar(255)`, `int`/`integer` → `integer`, `date` → `date`, `timestamp` → `timestamptz`, `boolean` → `boolean`, `decimal`/`numeric` → `numeric`, `text` → `text`.
   - Every table gets a `created_at timestamptz` column defaulting to `sql\`CURRENT_TIMESTAMP\`` if the baseline migration follows that pattern, even if not explicitly drawn in the ERD's attribute list — match the project's established convention over the diagram's literal content when the two are silent on a point.

5. **Translate cardinalities.**
   - `||--o{` (one-to-many): the "many" side gets the foreign key column, `.notNull()`, `.onDelete('cascade')`.
   - `||--o|` (one-to-one, optional on the right): the right-hand entity gets the foreign key column, marked `.unique()` in addition to the FK constraint, and the column is nullable (no `.notNull()`) since the relationship is optional.
   - `}o--o{` (many-to-many): create a dedicated join table named `<entity_a>_<entity_b>` (alphabetical order) with two FK columns, both `.notNull()`, a composite primary key or unique constraint across both columns, and `.onDelete('cascade')` on each.

6. **Order table creation by dependency.** Tables with no foreign keys to other new tables are created first; tables with foreign keys are created only after their referenced tables exist in the migration. (Tables already noted as pre-existing, per step 3, don't need to be created at all, but can still be referenced.)

7. **Write the output file.** Save the generated migration to `src/db/migrations/<timestamp>_<migration_name>.ts`, where `<timestamp>` follows the same numbering/naming convention as `001_initial_schema.ts` (e.g. `002_library_schema.ts`, incrementing from the highest existing migration number) and `<migration_name>` is a short, descriptive snake_case name for what the migration adds.

8. **Structure requirements.**
   - Export both `async function up(db: Kysely<any>): Promise<void>` and `async function down(db: Kysely<any>): Promise<void>`.
   - `down` must drop tables in **reverse dependency order** — any table that was created last (because it had foreign keys to others) must be dropped first, so that dropping never violates a foreign-key constraint still pointing at a table being removed. Use `.ifExists()` on every drop, matching the baseline's convention.
   - Match the baseline file's import style, ESLint disable comment (if present), and general formatting exactly.

9. **Verify.** After writing the file, run `npm run build` to confirm the migration compiles with no TypeScript errors. If it fails, read the compiler error, correct the migration file, and re-run `npm run build` until it passes.

## Example Translation

Given:

erDiagram
AUTHORS ||--o{ BOOKS : writes
AUTHORS {
int id PK
string name
}
BOOKS {
int id PK
string title
int author_id FK
}


Produces (abbreviated):
```typescript
await db.schema
  .createTable('authors')
  .addColumn('id', 'serial', (col) => col.primaryKey())
  .addColumn('name', 'varchar(255)', (col) => col.notNull())
  .execute();

await db.schema
  .createTable('books')
  .addColumn('id', 'serial', (col) => col.primaryKey())
  .addColumn('title', 'varchar(255)', (col) => col.notNull())
  .addColumn('author_id', 'integer', (col) =>
    col.references('authors.id').onDelete('cascade').notNull(),
  )
  .execute();
```

With `down` dropping `books` before `authors`, since `books` depends on `authors`.