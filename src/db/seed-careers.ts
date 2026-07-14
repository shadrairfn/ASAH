import 'dotenv/config';
import { Client } from 'pg';

type CareerSeed = {
  name: string;
  description: string;
  industry_name: string;
  vectorized: number[];
};

const careerSeeds: CareerSeed[] = [
  {
    name: 'Software Engineer',
    industry_name: 'Teknologi Informasi',
    description:
      'Membangun aplikasi dan sistem perangkat lunak dengan kemampuan logika, pemecahan masalah, dan ketelitian teknis.',
    vectorized: [0.72, 0.82, 0.45, 0.55, 0.25, 0.75, 0.55, 0.65, 0.85, 0.65],
  },
  {
    name: 'Data Analyst',
    industry_name: 'Data dan Bisnis',
    description:
      'Mengolah data, menemukan pola, dan menyajikan insight untuk membantu pengambilan keputusan bisnis.',
    vectorized: [0.65, 0.85, 0.45, 0.55, 0.25, 0.9, 0.45, 0.8, 0.8, 0.65],
  },
  {
    name: 'UI/UX Designer',
    industry_name: 'Desain Produk Digital',
    description:
      'Merancang pengalaman pengguna dan antarmuka digital yang mudah dipakai, menarik, dan sesuai kebutuhan pengguna.',
    vectorized: [0.9, 0.7, 0.55, 0.75, 0.3, 0.4, 0.85, 0.75, 0.7, 0.7],
  },
  {
    name: 'Digital Marketing Specialist',
    industry_name: 'Pemasaran Digital',
    description:
      'Merancang kampanye digital, membaca performa konten, dan mengomunikasikan nilai produk kepada audiens.',
    vectorized: [0.75, 0.7, 0.85, 0.75, 0.35, 0.55, 0.45, 0.65, 0.6, 0.9],
  },
  {
    name: 'Project Manager',
    industry_name: 'Manajemen Produk dan Operasi',
    description:
      'Mengatur prioritas, jadwal, komunikasi tim, dan risiko agar proyek selesai tepat sasaran.',
    vectorized: [0.65, 0.9, 0.8, 0.8, 0.25, 0.55, 0.4, 0.7, 0.65, 0.85],
  },
  {
    name: 'Cybersecurity Analyst',
    industry_name: 'Keamanan Siber',
    description:
      'Menganalisis risiko keamanan, mendeteksi anomali, dan menjaga sistem dari ancaman digital.',
    vectorized: [0.65, 0.9, 0.35, 0.45, 0.2, 0.8, 0.55, 0.95, 0.85, 0.55],
  },
  {
    name: 'Product Manager',
    industry_name: 'Produk Digital',
    description:
      'Menentukan arah produk dengan menggabungkan kebutuhan pengguna, tujuan bisnis, dan prioritas teknis.',
    vectorized: [0.75, 0.8, 0.75, 0.75, 0.25, 0.65, 0.5, 0.7, 0.8, 0.85],
  },
  {
    name: 'QA Engineer',
    industry_name: 'Teknologi Informasi',
    description:
      'Memastikan kualitas aplikasi melalui pengujian sistematis, dokumentasi bug, dan perhatian pada detail.',
    vectorized: [0.55, 0.9, 0.4, 0.55, 0.25, 0.65, 0.55, 0.95, 0.7, 0.6],
  },
  {
    name: 'Business Analyst',
    industry_name: 'Konsultasi dan Bisnis',
    description:
      'Menerjemahkan kebutuhan bisnis menjadi solusi, spesifikasi, dan rekomendasi yang bisa dijalankan tim.',
    vectorized: [0.65, 0.8, 0.65, 0.75, 0.3, 0.7, 0.4, 0.75, 0.75, 0.9],
  },
  {
    name: 'Content Writer',
    industry_name: 'Media dan Komunikasi',
    description:
      'Membuat tulisan informatif dan persuasif untuk edukasi, branding, pemasaran, atau dokumentasi produk.',
    vectorized: [0.85, 0.7, 0.55, 0.7, 0.35, 0.35, 0.35, 0.65, 0.65, 0.95],
  },
  {
    name: '3D Artist',
    industry_name: 'Kreatif Digital',
    description:
      'Membuat aset visual tiga dimensi untuk game, animasi, simulasi, iklan, atau visualisasi produk.',
    vectorized: [0.88, 0.68, 0.45, 0.55, 0.35, 0.45, 0.95, 0.85, 0.65, 0.45],
  },
  {
    name: 'HR Recruiter',
    industry_name: 'Sumber Daya Manusia',
    description:
      'Menilai kandidat, berkomunikasi dengan stakeholder, dan mencocokkan kebutuhan organisasi dengan talenta.',
    vectorized: [0.62, 0.75, 0.85, 0.9, 0.3, 0.45, 0.35, 0.65, 0.55, 0.85],
  },
];

function toVectorLiteral(vector: number[]) {
  if (vector.length !== 10) {
    throw new Error('Setiap career vector harus memiliki 10 dimensi.');
  }

  return `[${vector.join(',')}]`;
}

async function seedCareers() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum tersedia di environment.');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const career of careerSeeds) {
      const existing = await client.query(
        `
          SELECT id_career
          FROM careers
          WHERE name = $1
          LIMIT 1
        `,
        [career.name],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        await client.query(
          `
            UPDATE careers
            SET description = $2,
                industry_name = $3,
                vectorized = $4::vector
            WHERE name = $1
          `,
          [
            career.name,
            career.description,
            career.industry_name,
            toVectorLiteral(career.vectorized),
          ],
        );
        updated += 1;
        continue;
      }

      await client.query(
        `
          INSERT INTO careers (
            name,
            description,
            industry_name,
            vectorized
          )
          VALUES ($1, $2, $3, $4::vector)
        `,
        [
          career.name,
          career.description,
          career.industry_name,
          toVectorLiteral(career.vectorized),
        ],
      );
      inserted += 1;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  console.log('Career seed selesai.');
  console.log(`Total sumber karier: ${careerSeeds.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
}

seedCareers().catch((error) => {
  console.error('Career seed gagal.');
  console.error(error);
  process.exitCode = 1;
});
