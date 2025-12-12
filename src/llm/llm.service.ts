import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  psychotestResults,
  careers,
  careerRecommendations,
  optionCareers,
  roadmaps,
  roadmapItems,
} from 'src/db/schema';
import { cosineDistance, eq, sql, ilike, like, and, asc } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

@Injectable()
export class LlmService {
  private genAI: GoogleGenerativeAI;
  private modelRoadmap: GenerativeModel;
  private modelMapping: GenerativeModel;
  private modelEmbedding: GenerativeModel;

  constructor(
    private configService: ConfigService,
    @Inject('DRIZZLE') private readonly db,
  ) {
    const apiKey = process.env.GEMINI_API_KEY!;
    const roadmapModel = process.env.ROADMAP_MODEL!;
    const mappingModel = process.env.MAPPING_CAREER_MODEL!;

    this.genAI = new GoogleGenerativeAI(apiKey);

    this.modelRoadmap = this.genAI.getGenerativeModel({
      model: roadmapModel,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000000000,
      },
    });

    this.modelMapping = this.genAI.getGenerativeModel({
      model: mappingModel,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000000,
      },
    });

    this.modelEmbedding = this.genAI.getGenerativeModel({
      model: 'text-embedding-004',
    });
  }

  getModelRoadmap() {
    return this.modelRoadmap;
  }

  getModelMapping() {
    return this.modelMapping;
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
      .orderBy(cosineDistance(careers.vectorized, userVector))
      .limit(3);

    let option_career: string[] = ['['];

    recommendedCareers.map((career, index) => {
      const split = [career.id_career, career.similarity];

      option_career.push(split[0], split[1]);
    });

    option_career.shift();

    const careerData = {
      id_user: id_user,
      options_career: option_career,
    };

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

    // 2. Siapkan Prompt
    // PERUBAHAN: Prompt disesuaikan untuk meminta struktur PHASE -> ITEM
    const prompt = `
      Bertindaklah sebagai Senior Technical Mentor.
      Buatkan roadmap pembelajaran teknis untuk peran: "${userCareer[0].nama_karir}" (Deskripsi: ${userCareer[0].deskripsi}).

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

    // 3. Panggil AI Model
    const result = await this.modelMapping.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('--- RAW AI RESPONSE ---');
    console.log(text);

    // 4. Proses Parsing (String -> Array of Phases)
    const processedRoadmap = this.processDataRoadmap(text);

    console.log('--- PROCESSED DATA ---');
    console.log(JSON.stringify(processedRoadmap, null, 2));

    // 5. Simpan ke DB
    await this.db.insert(roadmaps).values({
      id_user: id_user,
      id_career: id_career,
      // Pastikan kolom DB tipe json/jsonb
      roadmapPath: processedRoadmap,
    });

    return processedRoadmap;
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
      .limit(1);

    const currentRoadmap = roadmapRecord[0].roadmap;
    const careerName = roadmapRecord[0].career_name;

    console.log('Nama Karir:', careerName);

    const fullRoadmap = currentRoadmap.roadmapPath as unknown as RoadmapPhase[];

    console.log(roadmapRecord[0].roadmap.id_roadmap);

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

        console.log(`PROMPT (${module.title}): ...Sending...`);

        // 1. Generate Materi
        const result = await this.modelMapping.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 2. Vectorize / Embedding
        const textToEmbed = `Topik: ${module.title}\nIsi Materi: ${text}`;
        const embeddingResult =
          await this.modelEmbedding.embedContent(textToEmbed);
        const vector = embeddingResult.embedding.values;

        // 3. Simpan ke Database
        await this.db.insert(roadmapItems).values({
          id_user: id_user,
          id_roadmap: roadmapRecord[0].roadmap.id_roadmap,
          phase: phase.phase,
          judul: module.title,
          module: module.details,
          materi: text,
          vectorize: vector,
        });

        console.log(`[OK] Saved & Vectorized: ${module.title}`);

        await sleep(1000);
      }
    }

    return fullRoadmap;
  }

  async getMaterialsByPhase(id_user: string, phaseName: string) {
    try {
      const materials = await this.db
        .select({
          id: roadmapItems.id_roadmap,
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
          message: `Tidak ada materi ditemukan untuk fase: ${phaseName}`,
          data: [],
        };
      }

      return {
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
}
