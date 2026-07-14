import {
  BadRequestException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  psychotestResults,
  careers,
  careerRecommendations,
  roadmaps,
  roadmapItems,
  quizzes,
} from 'src/db/schema';
import {
  cosineDistance,
  eq,
  sql,
  ilike,
  and,
  asc,
  desc,
  isNotNull,
} from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function processDataRoadmap(input: string): string[] {
  // 1. Split Awal: Membagi string pada setiap kemunculan pola Nomor. Spasi
  const initialSplit: string[] = input.split(/(?=\d+\. )/);

  const fixedArray: string[] = [];

  for (let i = 0; i < initialSplit.length; i++) {
    const currentItem = initialSplit[i].trim();

    // Cek kondisi perbaikan: Jika item saat ini adalah '1' dan item berikutnya dimulai dengan '0.'
    if (
      currentItem === '1' &&
      i + 1 < initialSplit.length &&
      initialSplit[i + 1].trim().startsWith('0.')
    ) {
      // Gabungkan '1' dengan '0. Terus Belajar...'
      const combinedItem = currentItem + initialSplit[i + 1].trim();
      fixedArray.push(combinedItem);

      // Lompati elemen berikutnya karena sudah digabungkan
      i++;
    } else if (currentItem) {
      // Jika tidak ada masalah, tambahkan item yang sudah di-trim
      fixedArray.push(currentItem);
    }
  }
  return fixedArray;
}

export interface CareerOption {
  options: string[];
}

export interface RoadmapModule {
  id: number;
  title: string;
  details: string[];
}

export interface RoadmapPhase {
  phase: string;
  modules: RoadmapModule[];
}

type OpenAIResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class LlmService {
  private readonly openAIModel: string;
  private readonly openAIBaseUrl = 'https://api.openai.com/v1';

  constructor(
    private configService: ConfigService,
    @Inject('DRIZZLE') private readonly db,
  ) {
    this.openAIModel = process.env.OPENAI_MODEL || 'gpt-4.1';
  }

  getModelRoadmap() {
    return this.openAIModel;
  }

  getModelMapping() {
    return this.openAIModel;
  }

  private async callOpenAIText(
    instructions: string,
    input: string,
    maxOutputTokens = 2048,
    timeoutMs = 30000,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY belum tersedia di environment.');
    }

    const request = fetch(`${this.openAIBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.openAIModel,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
      }),
    });

    const response = await withTimeout(request, timeoutMs, 'OpenAI response');
    const data = (await response.json().catch(() => ({}))) as OpenAIResponsesPayload;

    if (!response.ok) {
      throw new Error(
        data.error?.message || `OpenAI API error: ${response.status}`,
      );
    }

    const directText = data.output_text?.trim();
    if (directText) return directText;

    const nestedText = data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join('\n')
      .trim();

    if (nestedText) return nestedText;

    throw new Error('OpenAI response tidak berisi output teks.');
  }

  async careerRecomendation(id_user: string) {
    const userRecord = await this.db
      .select({
        vectorized_result: psychotestResults.vectorize_score,
      })
      .from(psychotestResults)
      .where(eq(psychotestResults.id_user, id_user))
      .limit(1);

    if (!userRecord.length || !userRecord[0].vectorized_result) {
      throw new Error(
        'User belum memiliki hasil tes atau vektor belum digenerate.',
      );
    }

    const userVector = userRecord[0].vectorized_result;

    const recommendedCareers = await this.db
      .select({
        id_career: careers.id_career,
        name: careers.name,
        description: careers.description,
        similarity: sql<number>`1 - (${cosineDistance(careers.vectorized, userVector)})`,
      })
      .from(careers)
      .where(isNotNull(careers.vectorized))
      .orderBy(cosineDistance(careers.vectorized, userVector))
      .limit(3);

    if (!recommendedCareers.length) {
      throw new BadRequestException(
        'Data karier belum tersedia atau belum memiliki vektor rekomendasi.',
      );
    }

    const option_career = recommendedCareers.flatMap((career) => [
      career.id_career,
      String(career.similarity ?? 0),
    ]);

    const careerData = {
      id_user: id_user,
      options_career: option_career,
    };

    await this.db
      .delete(careerRecommendations)
      .where(eq(careerRecommendations.id_user, id_user));

    await this.db.insert(careerRecommendations).values(careerData);

    return {
      success: true,
      data: careerData,
      model: 'vector-search-v1',
    };
  }

  async generateRoadmap(id_user: string, id_career: string) {
    // 1. Ambil data karir dari DB
    const userCareer = await this.db
      .select({
        nama_karir: careers.name,
        deskripsi: careers.description,
      })
      .from(careers)
      .where(eq(careers.id_career, id_career))
      .limit(1);

    if (!userCareer.length) {
      throw new Error('Career not found');
    }

    const careerName = userCareer[0].nama_karir;
    const careerDescription = userCareer[0].deskripsi;

    const prompt = `
      Bertindaklah sebagai Senior Technical Mentor.
      Buatkan roadmap pembelajaran teknis untuk peran: "${careerName}" (Deskripsi: ${careerDescription}).

      Instruksi Struktur:
      Bagi roadmap menjadi 4 Phase (Fase) logis dari basic ke expert.

      ATURAN FORMAT OUTPUT (PENTING):
      Gunakan format teks persis seperti ini (jangan gunakan Markdown bold/italic):

      Phase 1: [Nama Fase]
      1. [Judul Langkah] ([Detail skill/tools dipisah koma])
      2. [Judul Langkah] ([Detail skill/tools dipisah koma])

      Phase 2: [Nama Fase]
      1. [Judul Langkah] ([Detail...])
      ... dan seterusnya.

      Syarat:
      - Judul Langkah harus kata kerja aktif (Pelajari, Kuasai, Buat).
      - Detail WAJIB di dalam kurung (...).
      - Jangan ada teks pembuka/penutup. Langsung mulai dari Phase 1.
      - Gunakan Bahasa Indonesia.
    `;

    let processedRoadmap: RoadmapPhase[];

    try {
      const text = await this.callOpenAIText(
        'Anda adalah Senior Technical Mentor. Buat output persis sesuai format yang diminta user, tanpa pembuka atau penutup.',
        prompt,
        4096,
        20000,
      );

      processedRoadmap = this.processDataRoadmap(text);

      if (
        processedRoadmap.length === 0 ||
        processedRoadmap.every((phase) => phase.modules.length === 0)
      ) {
        throw new Error('AI roadmap response tidak sesuai format.');
      }
    } catch (error) {
      console.error(
        'Roadmap AI generation failed, using fallback:',
        error instanceof Error ? error.message : error,
      );
      processedRoadmap = this.buildFallbackRoadmap(
        careerName,
        careerDescription,
      );
    }

    await this.db.delete(roadmaps).where(eq(roadmaps.id_user, id_user));

    await this.db.insert(roadmaps).values({
      id_user: id_user,
      id_career: id_career,
      roadmapPath: processedRoadmap,
    });

    return processedRoadmap;
  }

  async getRoadmapUser(id_user: string) {
    const roadmap = await this.db
      .select({
        roadmapPath: roadmaps.roadmapPath,
      })
      .from(roadmaps)
      .where(eq(roadmaps.id_user, id_user))
      .limit(1);

    return {
      status: 200,
      message: 'Roadmap found successfully',
      data: roadmap[0],
    }
  }

  // --- Helper Function Parsing Baru (Phase Aware) ---
  private processDataRoadmap(inputText: string): RoadmapPhase[] {
    const result: RoadmapPhase[] = [];
    const lines = inputText.split('\n'); // Pecah per baris

    let currentPhase: RoadmapPhase | null = null;

    // Regex untuk mendeteksi item: "1. Judul (Detail)"
    // Group 1: Angka, Group 2: Judul, Group 3: Isi Kurung
    const itemRegex = /(\d+)\.\s+([^(]+)\s*\(([^)]+)\)/;

    // Regex untuk mendeteksi Header Phase: "Phase 1: ..."
    const phaseRegex = /^Phase\s+\d+:/i;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Cek apakah ini Header Phase?
      if (phaseRegex.test(trimmedLine)) {
        // Jika ketemu phase baru, inisialisasi object phase
        currentPhase = {
          phase: trimmedLine, // Contoh: "Phase 1: Fondasi..."
          modules: [],
        };
        result.push(currentPhase);
      }
      // Cek apakah ini Item Roadmap?
      else if (itemRegex.test(trimmedLine)) {
        const match = trimmedLine.match(itemRegex);

        // Pastikan kita sudah punya phase aktif (untuk jaga-jaga)
        if (currentPhase && match) {
          currentPhase.modules.push({
            id: parseInt(match[1]), // Nomor
            title: match[2].trim(), // Judul
            details: match[3].split(',').map((d) => d.trim()), // Detail array
          });
        }
      }
    }

    return result;
  }

  private buildFallbackRoadmap(
    careerName: string,
    careerDescription?: string | null,
  ): RoadmapPhase[] {
    return [
      {
        phase: 'Phase 1: Fondasi Peran',
        modules: [
          {
            id: 1,
            title: `Pahami Ruang Lingkup ${careerName}`,
            details: ['tanggung jawab utama', 'alur kerja', 'standar industri'],
          },
          {
            id: 2,
            title: 'Kuasai Dasar Teknis',
            details: ['konsep dasar', 'tools utama', 'praktik sederhana'],
          },
        ],
      },
      {
        phase: 'Phase 2: Praktik Terarah',
        modules: [
          {
            id: 1,
            title: 'Bangun Proyek Mini',
            details: ['studi kasus', 'workflow end-to-end', 'dokumentasi'],
          },
          {
            id: 2,
            title: 'Latih Problem Solving',
            details: ['analisis masalah', 'prioritas solusi', 'evaluasi hasil'],
          },
        ],
      },
      {
        phase: 'Phase 3: Portofolio dan Kolaborasi',
        modules: [
          {
            id: 1,
            title: 'Susun Portofolio',
            details: ['narasi proyek', 'hasil terukur', 'presentasi karya'],
          },
          {
            id: 2,
            title: 'Simulasikan Kerja Tim',
            details: ['komunikasi', 'review', 'iterasi'],
          },
        ],
      },
      {
        phase: 'Phase 4: Kesiapan Karier',
        modules: [
          {
            id: 1,
            title: 'Persiapkan Interview',
            details: ['pertanyaan teknis', 'cerita pengalaman', 'refleksi'],
          },
          {
            id: 2,
            title: 'Rancang Rencana 30 Hari',
            details: ['target belajar', 'jadwal praktik', 'metrik kemajuan'],
          },
        ],
      },
    ].map((phase) => ({
      ...phase,
      modules: phase.modules.map((module) => ({
        ...module,
        details:
          careerDescription && module.id === 1
            ? [...module.details, careerDescription.slice(0, 80)]
            : module.details,
      })),
    }));
  }

  private buildFallbackMaterial(
    careerName: string,
    phaseName: string,
    module: RoadmapModule,
  ): string {
    const details = module.details.map((detail) => `- ${detail}`).join('\n');

    return `# ${module.title}

## 1. Konsep Inti
Materi ini membantu kamu memahami bagian penting dari jalur ${careerName} pada ${phaseName}. Fokus utamanya adalah mengenali konteks kerja, melatih kebiasaan belajar yang rapi, dan mengubah konsep menjadi praktik kecil yang bisa dievaluasi.

## 2. Poin yang Perlu Dikuasai
${details}

## 3. Studi Kasus
Bayangkan kamu diminta menyelesaikan tugas kecil yang relevan dengan ${careerName}. Mulailah dari memahami masalah, tentukan output yang diharapkan, kerjakan versi sederhana, lalu dokumentasikan keputusan yang kamu ambil.

## 4. Kesalahan Umum
- Belajar terlalu banyak teori tanpa membuat hasil praktik.
- Tidak mencatat proses, sehingga sulit mengevaluasi perkembangan.
`;
  }

  async generateContent(id_user: string) {
    const roadmapRecord = await this.db
      .select({
        roadmap: roadmaps,
        career_name: careers.name,
        description: careers.description,
      })
      .from(roadmaps)
      .innerJoin(careers, eq(roadmaps.id_career, careers.id_career))
      .where(eq(roadmaps.id_user, id_user))
      .orderBy(desc(roadmaps.created_at))
      .limit(1);

    if (!roadmapRecord.length) {
      throw new Error('Roadmap user belum tersedia.');
    }

    const currentRoadmap = roadmapRecord[0].roadmap;
    const careerName = roadmapRecord[0].career_name;

    const fullRoadmap = currentRoadmap.roadmapPath as unknown as RoadmapPhase[];

    await this.db
      .delete(roadmapItems)
      .where(eq(roadmapItems.id_roadmap, currentRoadmap.id_roadmap));

    for (let i = 0; i < fullRoadmap.length; i++) {
      const phase = fullRoadmap[i];

      for (let j = 0; j < phase.modules.length; j++) {
        const module = phase.modules[j];

        const prompt = `
          Bertindaklah sebagai **Senior Technical Instructor** dan **Industry Expert**.
          Tugas Anda adalah menyusun materi pembelajaran singkat namun padat (micro-learning) untuk pengguna.

          INFORMASI KONTEKS:
          - **Karir**: ${careerName}
          - **Deskripsi Karir**: ${roadmapRecord[0].description}
          - **Fase Belajar**: ${phase.phase}
          - **Topik Utama**: ${module.title}
          - **Poin Kunci yang Wajib Dibahas**: ${module.details.join(', ')}

          STRUKTUR MATERI YANG WAJIB ANDA HASILKAN (Gunakan format Markdown):

          # 1. Konsep Inti (The "What" & "Why")
          jelaskan definisi topik ini secara ringkas. Jelaskan mengapa skill ini penting di dunia kerja nyata. Hindari bahasa yang terlalu akademis, gunakan analogi jika perlu.

          # 2. Bedah Teknis (The "How")
          Jelaskan poin-poin kunci (${module.details.join(', ')}) secara mendalam.
          - Jika ini programming, BERIKAN CONTOH CODE SNIPPET yang valid.
          - Jika ini manajemen/softskill, berikan framework atau langkah eksekusi.

          # 3. Studi Kasus / Contoh Penerapan
          Berikan satu contoh skenario nyata di industri di mana skill ini digunakan.
          (Contoh: "Seorang Backend Dev menggunakan skill ini ketika...")

          # 4. Kesalahan Umum (Common Pitfalls)
          Sebutkan 1-2 kesalahan yang sering dilakukan pemula saat mempelajari hal ini.

          ATURAN PENULISAN:
          - Gaya bahasa: Profesional, Mengajar, namun tetap Rileks (seperti mentor ke mentee).
          - Format: Gunakan **Bold** untuk istilah penting. Gunakan List/Bullet points agar mudah di-scan.
          - Output: HANYA materi saja, jangan ada kalimat pembuka seperti "Berikut adalah materi yang Anda minta".
          `;

        let text: string;

        try {
          text = await this.callOpenAIText(
            'Anda adalah instruktur teknis senior. Tulis materi dalam Markdown bahasa Indonesia sesuai struktur yang diminta, tanpa kalimat pembuka.',
            prompt,
            4096,
            30000,
          );
        } catch (error) {
          console.error(
            'Content AI generation failed, using fallback:',
            error instanceof Error ? error.message : error,
          );
          text = this.buildFallbackMaterial(careerName, phase.phase, module);
        }

        const insertData = {
          id_user: id_user,
          id_roadmap: currentRoadmap.id_roadmap,
          phase: phase.phase,
          judul: module.title,
          materi: text,
        };

        await this.db.insert(roadmapItems).values(insertData);

        await sleep(1000);
      }
    }

    return fullRoadmap;
  }

  async getMaterialsByPhase(id_user: string, phaseName: string) {
    try {
      const materials = await this.db
        .select({
          id_roadmap: roadmapItems.id_roadmap,
          id_item: roadmapItems.id_item,
          judul: roadmapItems.judul,
          materi: roadmapItems.materi,
          phase: roadmapItems.phase,
          // Ambil kolom lain yang dibutuhkan
        })
        .from(roadmapItems)
        .where(
          and(
            // 1. Filter User (Wajib security)
            eq(roadmapItems.id_user, id_user),

            // 2. Filter Phase menggunakan ILIKE (Case Insensitive)
            // Menambahkan % di depan dan belakang agar mencari substring
            // Contoh: input "Phase 1" akan cocok dengan "Phase 1: Fondasi..."
            ilike(roadmapItems.phase, `%${phaseName}%`),
          ),
        )
        // 3. Urutkan berdasarkan ID agar urutan materi sesuai roadmap
        .orderBy(asc(roadmapItems.id_roadmap));

      if (materials.length === 0) {
        return {
          status: 404,
          message: `Tidak ada materi ditemukan untuk fase: ${phaseName}`,
          data: [],
        };
      }

      return {
        status: 200,
        success: true,
        phase_keyword: phaseName,
        total_items: materials.length,
        data: materials,
      };
    } catch (error) {
      console.error('Error fetching materials:', error);
      throw new Error('Gagal mengambil materi berdasarkan fase.');
    }
  }

  async chatWithRoadmap(id_user: string, userMessage: string) {
    try {
      const relevantMaterials = await this.db
        .select({
          judul: roadmapItems.judul,
          materi: roadmapItems.materi,
        })
        .from(roadmapItems)
        .where(eq(roadmapItems.id_user, id_user))
        .orderBy(desc(roadmapItems.created_at))
        .limit(6);

      if (relevantMaterials.length === 0) {
        return {
          reply:
            'Materi roadmap kamu belum tersedia. Coba tunggu proses generate selesai, lalu kirim pertanyaan lagi.',
          sources: [],
        };
      }

      const contextString = relevantMaterials
        .map((item) => `Topik: ${item.judul}\nIsi Materi: ${item.materi}`)
        .join('\n\n---\n\n');

      const reply = await this.callOpenAIText(
        `Anda adalah Asisten Belajar AI ASAH.
Jawab pertanyaan user hanya berdasarkan KONTEKS MATERI.
Jika konteks tidak cukup, katakan bahwa informasi tersebut belum ada di materi roadmap saat ini, lalu beri saran belajar umum secara singkat.
Jawab ringkas, ramah, dan memotivasi dalam bahasa Indonesia.`,
        `KONTEKS MATERI:
${contextString}

PERTANYAAN USER:
${userMessage}`,
        1200,
        20000,
      );

      return {
        reply,
        sources: relevantMaterials.map((m) => m.judul),
      };
    } catch (error) {
      console.error(
        'Error RAG Chat:',
        error instanceof Error ? error.message : error,
      );
      return {
        reply:
          'Maaf, chat materi sedang tidak bisa diproses. Coba ulang sebentar lagi.',
        sources: [],
      };
    }
  }

  async generateQuiz(id_user: string, id_roadmap_item: string) {
    await this.db
    .delete(quizzes)
    .where(eq(quizzes.id_roadmapItems, id_roadmap_item))

    const contentData = await this.db
      .select({
        judul: roadmapItems.judul,
        materi: roadmapItems.materi,
      })
      .from(roadmapItems)
      .where(eq(roadmapItems.id_item, id_roadmap_item))
      .limit(1);

    const judul = contentData[0].judul;
    const materi = contentData[0].materi;

    const prompt = `
    Berdasarkan konten berikut, buatlah 5 soal pilihan ganda.
    
    Judul Materi: "${judul}"
    Isi Materi: "${materi}"
    
    Kembalikan output HANYA berupa Array JSON yang valid dengan struktur berikut:
    [
      {
        "question": "Teks pertanyaan",
        "opsi_a": "Teks pilihan A",
        "opsi_b": "Teks pilihan B",
        "opsi_c": "Teks pilihan C",
        "opsi_d": "Teks pilihan D",
        "correct_answer": "Teks pilihan A" 
      }
    ]
    Pastikan "correct_answer" hanya berisi 'A', 'B', 'C', atau 'D'.
    JANGAN gunakan format Markdown seperti \`\`\`json. Hanya JSON mentah (raw JSON).
    `;

    const cleanJson = (await this.callOpenAIText(
      'Buat output hanya berupa JSON mentah yang valid. Jangan gunakan Markdown.',
      prompt,
      2048,
      20000,
    ))
      .replace(/```json|```/g, '')
      .trim();

    const quizData = JSON.parse(cleanJson);

    const payload = quizData.map((item) => ({
      id_user: id_user,
      id_roadmapItems: id_roadmap_item,
      question: item.question,
      opsi_a: item.opsi_a,
      opsi_b: item.opsi_b,
      opsi_c: item.opsi_c,
      opsi_d: item.opsi_d,
      correct_answer: item.correct_answer,
      // id_quiz dan created_at akan otomatis dihandle oleh defaultRandom() & defaultNow() di schema
    }));

    // 6. Bulk Insert ke Database
    if (payload.length > 0) {
      await this.db.insert(quizzes).values(payload);
    }

    return cleanJson;
  }

  async getQuizByRoadmapId(userId: string, roadmapId: string) {
    // 1. Ambil data dari tabel quizzes
    const quizData = await this.db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id_roadmapItems, roadmapId)); // Filter by materi ID

    // 2. Jika kosong, mungkin perlu generate dulu?
    // Untuk saat ini kita return kosong atau throw error 404
    if (!quizData.length) {
      return { status: 404, message: 'Quiz belum tersedia', data: [] };
    }

    return {
      status: 200,
      message: 'Quiz retrieved successfully',
      data: quizData,
    };
  }

  async submitQuiz(id_roadmap_item: string, score: number) {
    await this.db
      .update(roadmapItems)
      .set({
        gradeQuiz: score,
      })
      .where(eq(roadmapItems.id_item, id_roadmap_item))
      .returning();
  }
}
