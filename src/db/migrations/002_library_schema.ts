import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Authors table
  await db.schema
    .createTable('authors')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('bio', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`NOW()`).notNull()
    )
    .execute();

  // 2. Genres table
  await db.schema
    .createTable('genres')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('description', 'text')
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`NOW()`).notNull()
    )
    .execute();

  // 3. Borrowers table (1:1 with pre-existing users table)
  await db.schema
    .createTable('borrowers')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('user_id', 'integer', (col) =>
      col.references('users.id').onDelete('cascade').unique()
    )
    .addColumn('card_number', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('phone', 'varchar(255)')
    .addColumn('status', 'varchar(255)', (col) =>
      col.defaultTo('active').notNull()
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`NOW()`).notNull()
    )
    .execute();

  // 4. Books table (references authors and genres)
  await db.schema
    .createTable('books')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('title', 'varchar(255)', (col) => col.notNull())
    .addColumn('isbn', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('author_id', 'integer', (col) =>
      col.references('authors.id').onDelete('cascade').notNull()
    )
    .addColumn('genre_id', 'integer', (col) =>
      col.references('genres.id').onDelete('cascade').notNull()
    )
    .addColumn('published_year', 'integer')
    .addColumn('total_copies', 'integer', (col) =>
      col.defaultTo(1).notNull()
    )
    .addColumn('available_copies', 'integer', (col) =>
      col.defaultTo(1).notNull()
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`NOW()`).notNull()
    )
    .execute();

  // 5. Loans table (references borrowers and books)
  await db.schema
    .createTable('loans')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('borrower_id', 'integer', (col) =>
      col.references('borrowers.id').onDelete('cascade').notNull()
    )
    .addColumn('book_id', 'integer', (col) =>
      col.references('books.id').onDelete('cascade').notNull()
    )
    .addColumn('loan_date', 'date', (col) =>
      col.defaultTo(sql`CURRENT_DATE`).notNull()
    )
    .addColumn('due_date', 'date', (col) => col.notNull())
    .addColumn('return_date', 'date')
    .addColumn('status', 'varchar(255)', (col) =>
      col.defaultTo('active').notNull()
    )
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`NOW()`).notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop in reverse dependency order
  await db.schema.dropTable('loans').ifExists().execute();
  await db.schema.dropTable('books').ifExists().execute();
  await db.schema.dropTable('borrowers').ifExists().execute();
  await db.schema.dropTable('genres').ifExists().execute();
  await db.schema.dropTable('authors').ifExists().execute();
}
