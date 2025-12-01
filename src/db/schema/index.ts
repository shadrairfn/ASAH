import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// TODO: sesuaikan dengan helper vector yang sudah kamu pakai
// misal: import { vector } from "pgvector/drizzle-orm";
import { vector } from "drizzle-orm/pg-core"; // contoh saja

/* ==========================
   ENUMS
========================== */

export const genderEnum = pgEnum("gender_type", [
  "male", 
  "female", 
  "other"
]);

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "institution_admin",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "weekly",
  "monthly",
  "yearly",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "xendit",
  "midtrans",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "failed",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export const institutionTypeEnum = pgEnum("institution_type", [
  "blk",
  "campus",
  "disnaker",
]);

export const skillRelationTypeEnum = pgEnum("skill_relation_type", [
  "prerequisite",
  "related",
  "advanced",
]);

/* ==========================
   USERS
========================== */

export const users = pgTable("users", {
  id_user: uuid("id_user").defaultRandom().primaryKey().notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 128 }).notNull().unique(),
  image: varchar("image", { length: 256 }),
  birth_date: date("birth_date"),
  gender_type: genderEnum("gender_type"),
  role: userRoleEnum("role").default("user"),
  refresh_token: text("refresh_token"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  psychotests: many(psychotestResults),
  careerRecommendations: many(careerRecommendations),
  roadmaps: many(roadmaps),
  moduleProgress: many(moduleProgress),
  subscriptions: many(subscriptions),
  payments: many(payments),
  quizAttempts: many(quizAttempts),
  institutionAdmins: many(institutionAdmins),
}));

/* ==========================
   PSYCHOTEST (OCEAN)
========================== */

export const psychotestResults = pgTable("psychotest_results", {
  id_psikotes: uuid("id_psikotes").defaultRandom().primaryKey().notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),

  // skor 0-100 misalnya
  openness: integer("openness").notNull(),
  conscientiousness: integer("conscientiousness").notNull(),
  extraversion: integer("extraversion").notNull(),
  agreeableness: integer("agreeableness").notNull(),
  neuroticism: integer("neuroticism").notNull(),

  rekomendasi_gaya_belajar: varchar("rekomendasi_gaya_belajar", {
    length: 64,
  }),

  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const psychotestResultsRelations = relations(
  psychotestResults,
  ({ one, many }) => ({
    user: one(users, {
      fields: [psychotestResults.id_user],
      references: [users.id_user],
    }),
    careerRecommendations: many(careerRecommendations),
  })
);

/* ==========================
   CAREERS & RECOMMENDATIONS
========================== */

export const careers = pgTable("careers", {
  id_career: uuid("id_career").defaultRandom().primaryKey().notNull(),
  nama_karir: varchar("nama_karir", { length: 128 }).notNull(),
  deskripsi: text("deskripsi"),
  level_kesulitan: varchar("level_kesulitan", { length: 32 }), // beginner / intermediate / advanced
  industri: varchar("industri", { length: 64 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const careersRelations = relations(careers, ({ many }) => ({
  careerRecommendations: many(careerRecommendations),
  roadmaps: many(roadmaps),
  modules: many(modules),
}));

export const careerRecommendations = pgTable("career_recommendations", {
  id_rekomendasi: uuid("id_rekomendasi")
    .defaultRandom()
    .primaryKey()
    .notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  id_psikotes: uuid("id_psikotes")
    .notNull()
    .references(() => psychotestResults.id_psikotes, { onDelete: "cascade" }),
  id_career: uuid("id_career")
    .notNull()
    .references(() => careers.id_career, { onDelete: "cascade" }),
  skor_kecocokan: numeric("skor_kecocokan", { precision: 5, scale: 2 }), // 0-100.00
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const careerRecommendationsRelations = relations(
  careerRecommendations,
  ({ one }) => ({
    user: one(users, {
      fields: [careerRecommendations.id_user],
      references: [users.id_user],
    }),
    psychotest: one(psychotestResults, {
      fields: [careerRecommendations.id_psikotes],
      references: [psychotestResults.id_psikotes],
    }),
    career: one(careers, {
      fields: [careerRecommendations.id_career],
      references: [careers.id_career],
    }),
  })
);

/* ==========================
   ROADMAP
========================== */

export const roadmaps = pgTable("roadmaps", {
  id_roadmap: uuid("id_roadmap").defaultRandom().primaryKey().notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  id_career: uuid("id_career")
    .notNull()
    .references(() => careers.id_career, { onDelete: "cascade" }),
  generated_by_ai: boolean("generated_by_ai").default(true).notNull(),
  start_date: date("start_date"),
  end_date: date("end_date"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roadmapsRelations = relations(roadmaps, ({ one, many }) => ({
  user: one(users, {
    fields: [roadmaps.id_user],
    references: [users.id_user],
  }),
  career: one(careers, {
    fields: [roadmaps.id_career],
    references: [careers.id_career],
  }),
  items: many(roadmapItems),
}));

export const roadmapItems = pgTable("roadmap_items", {
  id_item: uuid("id_item").defaultRandom().primaryKey().notNull(),
  id_roadmap: uuid("id_roadmap")
    .notNull()
    .references(() => roadmaps.id_roadmap, { onDelete: "cascade" }),
  minggu_ke: integer("minggu_ke").notNull(),
  judul: varchar("judul", { length: 128 }).notNull(),
  deskripsi: text("deskripsi"),
  skill_target: varchar("skill_target", { length: 128 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roadmapItemsRelations = relations(
  roadmapItems,
  ({ one, many }) => ({
    roadmap: one(roadmaps, {
      fields: [roadmapItems.id_roadmap],
      references: [roadmaps.id_roadmap],
    }),
    modules: many(modules),
  })
);

/* ==========================
   MODULES & RAG
========================== */

export const modules = pgTable("modules", {
  id_module: uuid("id_module").defaultRandom().primaryKey().notNull(),
  id_career: uuid("id_career")
    .notNull()
    .references(() => careers.id_career, { onDelete: "cascade" }),
  id_roadmap_item: uuid("id_roadmap_item")
    .notNull()
    .references(() => roadmapItems.id_item, { onDelete: "cascade" }),
  format: varchar("format", { length: 32 }).notNull(), // text / quiz / task / exercise / video_link
  title: varchar("title", { length: 128 }).notNull(),
  content: text("content").notNull(),
  // vektor untuk RAG
  embedding_vector: vector("embedding_vector", { dimensions: 1536 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const modulesRelations = relations(modules, ({ one, many }) => ({
  career: one(careers, {
    fields: [modules.id_career],
    references: [careers.id_career],
  }),
  roadmapItem: one(roadmapItems, {
    fields: [modules.id_roadmap_item],
    references: [roadmapItems.id_item],
  }),
  quizzes: many(quizzes),
  moduleProgress: many(moduleProgress),
}));

/* ==========================
   QUIZ
========================== */

export const quizzes = pgTable("quizzes", {
  id_quiz: uuid("id_quiz").defaultRandom().primaryKey().notNull(),
  id_module: uuid("id_module")
    .notNull()
    .references(() => modules.id_module, { onDelete: "cascade" }),
  title: varchar("title", { length: 128 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  module: one(modules, {
    fields: [quizzes.id_module],
    references: [modules.id_module],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestions = pgTable("quiz_questions", {
  id_question: uuid("id_question").defaultRandom().primaryKey().notNull(),
  id_quiz: uuid("id_quiz")
    .notNull()
    .references(() => quizzes.id_quiz, { onDelete: "cascade" }),
  pertanyaan: text("pertanyaan").notNull(),
  opsi_a: text("opsi_a").notNull(),
  opsi_b: text("opsi_b").notNull(),
  opsi_c: text("opsi_c").notNull(),
  opsi_d: text("opsi_d").notNull(),
  jawaban_benar: varchar("jawaban_benar", { length: 1 }).notNull(), // 'A' | 'B' | 'C' | 'D'
});

export const quizQuestionsRelations = relations(
  quizQuestions,
  ({ one }) => ({
    quiz: one(quizzes, {
      fields: [quizQuestions.id_quiz],
      references: [quizzes.id_quiz],
    }),
  })
);

export const quizAttempts = pgTable("quiz_attempts", {
  id_attempt: uuid("id_attempt").defaultRandom().primaryKey().notNull(),
  id_quiz: uuid("id_quiz")
    .notNull()
    .references(() => quizzes.id_quiz, { onDelete: "cascade" }),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  skor: numeric("skor", { precision: 5, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.id_quiz],
    references: [quizzes.id_quiz],
  }),
  user: one(users, {
    fields: [quizAttempts.id_user],
    references: [users.id_user],
  }),
}));

/* ==========================
   MODULE PROGRESS
========================== */

export const moduleProgress = pgTable("module_progress", {
  id_progress: uuid("id_progress").defaultRandom().primaryKey().notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  id_module: uuid("id_module")
    .notNull()
    .references(() => modules.id_module, { onDelete: "cascade" }),
  status: progressStatusEnum("status").default("not_started").notNull(),
  waktu_mulai: timestamp("waktu_mulai", { withTimezone: true }),
  waktu_selesai: timestamp("waktu_selesai", { withTimezone: true }),
  nilai_quiz: numeric("nilai_quiz", { precision: 5, scale: 2 }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const moduleProgressRelations = relations(
  moduleProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [moduleProgress.id_user],
      references: [users.id_user],
    }),
    module: one(modules, {
      fields: [moduleProgress.id_module],
      references: [modules.id_module],
    }),
  })
);

/* ==========================
   SUBSCRIPTIONS & PAYMENTS
========================== */

export const payments = pgTable("payments", {
  id_payment: uuid("id_payment").defaultRandom().primaryKey().notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  metode: paymentMethodEnum("metode").notNull(),
  status: paymentStatusEnum("status").notNull(),
  external_id: varchar("external_id", { length: 128 }), // ID dari Xendit/Midtrans
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.id_user],
    references: [users.id_user],
  }),
  subscriptions: many(subscriptions),
}));

export const subscriptions = pgTable("subscriptions", {
  id_subscription: uuid("id_subscription")
    .defaultRandom()
    .primaryKey()
    .notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").default("free").notNull(),
  harga: numeric("harga", { precision: 12, scale: 2 }).notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  id_payment: uuid("id_payment").references(() => payments.id_payment, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [subscriptions.id_user],
      references: [users.id_user],
    }),
    payment: one(payments, {
      fields: [subscriptions.id_payment],
      references: [payments.id_payment],
    }),
  })
);

/* ==========================
   INSTITUTIONS (B2G)
========================== */

export const institutions = pgTable("institutions", {
  id_institution: uuid("id_institution")
    .defaultRandom()
    .primaryKey()
    .notNull(),
  nama_instansi: varchar("nama_instansi", { length: 128 }).notNull(),
  alamat: text("alamat"),
  jenis: institutionTypeEnum("jenis").notNull(), // blk/campus/disnaker
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const institutionsRelations = relations(
  institutions,
  ({ many }) => ({
    admins: many(institutionAdmins),
    licenses: many(institutionLicenses),
  })
);

export const institutionAdmins = pgTable("institution_admins", {
  id_admin: uuid("id_admin").defaultRandom().primaryKey().notNull(),
  id_user: uuid("id_user")
    .notNull()
    .references(() => users.id_user, { onDelete: "cascade" }),
  id_institution: uuid("id_institution")
    .notNull()
    .references(() => institutions.id_institution, { onDelete: "cascade" }),
});

export const institutionAdminsRelations = relations(
  institutionAdmins,
  ({ one }) => ({
    user: one(users, {
      fields: [institutionAdmins.id_user],
      references: [users.id_user],
    }),
    institution: one(institutions, {
      fields: [institutionAdmins.id_institution],
      references: [institutions.id_institution],
    }),
  })
);

export const institutionLicenses = pgTable("institution_licenses", {
  id_license: uuid("id_license").defaultRandom().primaryKey().notNull(),
  id_institution: uuid("id_institution")
    .notNull()
    .references(() => institutions.id_institution, { onDelete: "cascade" }),
  tahun: integer("tahun").notNull(),
  harga: numeric("harga", { precision: 12, scale: 2 }).notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const institutionLicensesRelations = relations(
  institutionLicenses,
  ({ one }) => ({
    institution: one(institutions, {
      fields: [institutionLicenses.id_institution],
      references: [institutions.id_institution],
    }),
  })
);

/* ==========================
   SKILL GRAPH
========================== */

export const skills = pgTable("skills", {
  id_skill: uuid("id_skill").defaultRandom().primaryKey().notNull(),
  nama_skill: varchar("nama_skill", { length: 128 }).notNull(),
  kategori: varchar("kategori", { length: 64 }), // technical / softskill / dll
});

export const skillRelations = pgTable("skill_relations", {
  id_relation: uuid("id_relation").defaultRandom().primaryKey().notNull(),
  id_skill_parent: uuid("id_skill_parent")
    .notNull()
    .references(() => skills.id_skill, { onDelete: "cascade" }),
  id_skill_child: uuid("id_skill_child")
    .notNull()
    .references(() => skills.id_skill, { onDelete: "cascade" }),
  jenis_relasi: skillRelationTypeEnum("jenis_relasi").notNull(),
});

export const skillsRelations = relations(skills, ({ many }) => ({
  relationsAsParent: many(skillRelations, {
    relationName: "skill_parent",
  }),
  relationsAsChild: many(skillRelations, {
    relationName: "skill_child",
  }),
}));

export const skillRelationsRelations = relations(
  skillRelations,
  ({ one }) => ({
    parent: one(skills, {
      fields: [skillRelations.id_skill_parent],
      references: [skills.id_skill],
      relationName: "skill_parent",
    }),
    child: one(skills, {
      fields: [skillRelations.id_skill_child],
      references: [skills.id_skill],
      relationName: "skill_child",
    }),
  })
);
