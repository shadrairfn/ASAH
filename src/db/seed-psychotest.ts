import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

type PsychotestType =
  | 'Openness'
  | 'Conscientiousness'
  | 'Extraversion'
  | 'Agreeableness'
  | 'Neuroticism'
  | 'Numeric'
  | 'Spatial'
  | 'Perceptual'
  | 'Abstract'
  | 'Verbal';

type ScoringType = 'normal' | 'reverse';

type RawQuestion = {
  id: string;
  question: string;
  type: string;
  scoring?: ScoringType;
  options?: string[];
  answer?: string;
  explanation?: string;
};

type QuestionSource = {
  sections: {
    ocean_personality: {
      sub_sections: Record<string, RawQuestion[]>;
    };
    aptitude_test: {
      sub_sections: Record<string, RawQuestion[]>;
    };
  };
};

type SeedQuestion = {
  source_id: string;
  type_question: PsychotestType;
  question: string;
  options: string[] | null;
  answer: string | null;
  scoring_type: ScoringType;
  explanation: string | null;
};

const oceanTypeMap: Record<string, PsychotestType> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism',
};

const aptitudeTypeMap: Record<string, PsychotestType> = {
  numeric: 'Numeric',
  spatial: 'Spatial',
  perceptual: 'Perceptual',
  abstract: 'Abstract',
  verbal: 'Verbal',
};

const likertOptions = ['1', '2', '3', '4', '5'];

function readQuestionSource(): QuestionSource {
  const sourcePath = join(
    process.cwd(),
    'src',
    'psychotest',
    'question-answer.json',
  );

  return JSON.parse(readFileSync(sourcePath, 'utf8')) as QuestionSource;
}

function buildSeedRows(source: QuestionSource): SeedQuestion[] {
  const rows: SeedQuestion[] = [];
  const oceanSections = source.sections.ocean_personality.sub_sections;
  const aptitudeSections = source.sections.aptitude_test.sub_sections;

  for (const [sectionKey, typeQuestion] of Object.entries(oceanTypeMap)) {
    const questions = oceanSections[sectionKey] ?? [];

    for (const item of questions) {
      const scoringType = item.scoring === 'reverse' ? 'reverse' : 'normal';

      rows.push({
        source_id: item.id,
        type_question: typeQuestion,
        question: item.question,
        options: likertOptions,
        answer: null,
        scoring_type: scoringType,
        explanation:
          scoringType === 'reverse'
            ? 'Skor dibalik dengan rumus 6 - jawaban.'
            : 'Skor mengikuti nilai pilihan 1-5.',
      });
    }
  }

  for (const [sectionKey, typeQuestion] of Object.entries(aptitudeTypeMap)) {
    const questions = aptitudeSections[sectionKey] ?? [];

    for (const item of questions) {
      rows.push({
        source_id: item.id,
        type_question: typeQuestion,
        question: item.question,
        options: item.options ?? null,
        answer: item.answer ?? null,
        scoring_type: 'normal',
        explanation: item.explanation ?? null,
      });
    }
  }

  return rows;
}

function validateRows(rows: SeedQuestion[]) {
  if (rows.length === 0) {
    throw new Error('Tidak ada soal yang bisa di-seed.');
  }

  const invalidRows = rows.filter((row) => {
    const isAptitude = row.type_question.match(
      /^(Numeric|Spatial|Perceptual|Abstract|Verbal)$/,
    );

    if (row.question.length > 256) return true;
    if (row.answer && row.answer.length > 128) return true;
    if (row.explanation && row.explanation.length > 256) return true;

    return (
      isAptitude &&
      (!row.options ||
        row.options.length !== 4 ||
        !row.answer ||
        !row.options.includes(row.answer))
    );
  });

  if (invalidRows.length > 0) {
    const labels = invalidRows
      .slice(0, 5)
      .map((row) => `${row.source_id} (${row.type_question})`)
      .join(', ');
    throw new Error(`Ada ${invalidRows.length} soal tidak valid: ${labels}`);
  }
}

async function seedPsychotestQuestions() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum tersedia di environment.');
  }

  const rows = buildSeedRows(readQuestionSource());
  validateRows(rows);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const row of rows) {
      const existing = await client.query(
        `
          SELECT id_question
          FROM question_psychotest
          WHERE type_question = $1::type_question
            AND question = $2
          LIMIT 1
        `,
        [row.type_question, row.question],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        await client.query(
          `
            UPDATE question_psychotest
            SET "options" = $3::text[],
                answer = $4,
                scoring_type = $5::scoring_type,
                explanation = $6
            WHERE type_question = $1::type_question
              AND question = $2
          `,
          [
            row.type_question,
            row.question,
            row.options,
            row.answer,
            row.scoring_type,
            row.explanation,
          ],
        );
        updated += 1;
      } else {
        await client.query(
          `
            INSERT INTO question_psychotest (
              type_question,
              question,
              "options",
              answer,
              scoring_type,
              explanation
            )
            VALUES (
              $1::type_question,
              $2,
              $3::text[],
              $4,
              $5::scoring_type,
              $6
            )
          `,
          [
            row.type_question,
            row.question,
            row.options,
            row.answer,
            row.scoring_type,
            row.explanation,
          ],
        );
        inserted += 1;
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  const byType = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.type_question] = (acc[row.type_question] ?? 0) + 1;
    return acc;
  }, {});

  console.log('Psychotest seed selesai.');
  console.log(`Total sumber soal: ${rows.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.table(byType);
}

seedPsychotestQuestions().catch((error) => {
  console.error('Psychotest seed gagal.');
  console.error(error);
  process.exitCode = 1;
});
