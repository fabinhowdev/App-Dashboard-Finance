const { pgTable, serial, text, timestamp, date, integer, uniqueIndex } = require("drizzle-orm/pg-core");

const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    sobrenome: text("sobrenome").notNull(),
    nascimento: date("nascimento").notNull(),
    email: text("email").notNull(),
    senhaHash: text("senha_hash").notNull(),
    genero: text("genero").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

const authSessions = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

module.exports = {
  users,
  authSessions,
  passwordResets,
};
