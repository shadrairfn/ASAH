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
} from 'src/db/schema';
import { cosineDistance, eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

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
  options : string[]
}

@Injectable()
export class LlmService {
  private genAI: GoogleGenerativeAI;
  private modelRoadmap: GenerativeModel;
  private modelMapping: GenerativeModel;

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
  }

  getModelRoadmap() {
    return this.modelRoadmap;
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
      const split = [
        career.id_career, career.similarity
      ]
      
      option_career.push(split[0], split[1]);
    });

    option_career.shift();

    const careerData = {
      id_user: id_user,
      options_career: option_career
    };

    await this.db.insert(careerRecommendations).values(careerData);

    return {
      success: true,
      data: careerData,
      model: 'vector-search-v1', 
    };
  }

  // async generateRoadmap(id_user: string) {
  //     const userCareer = await this.db
  //     .select({
  //         nama_karir: careers.nama_karir,
  //         deskripsi: careers.deskripsi,
  //     })
  //     .from(careers)
  //     .where(eq(careers.id_user, id_user))
  //     .limit(1);

  //     const prompt =
  //     `Buat Roadmap yang komprehensif dan komplit untuk seseorang yang ingin menjadi data scientist. Berikan alur roadmap dengan format jawaban seperti ini tanpa kalimat tambahan apapun:
  //     1. {roadmap pertama} 2. {roadmap kedua} 3. {roadmap ketiga}, dan seterusnya`

  //     const result = await this.modelRoadmap.generateContent(prompt);
  //     const response = await result.response;

  //     // 2. Cek apakah kandidat diblokir?
  //     console.log('--- DEBUG RESPONSE ---');
  //     console.log('Finish Reason:', response.candidates?.[0]?.finishReason);
  //     console.log(
  //       'Safety Ratings:',
  //       JSON.stringify(response.candidates?.[0]?.safetyRatings, null, 2),
  //     );

  //     const text = response.text();
  //     const splittingRoadmap: string[] = processDataRoadmap(text);
  //     console.log(splittingRoadmap);

  //     return text
  // }

  // Opsional: Fitur Chat dengan History
  // async chatWithHistory(history: any[], newMessage: string) {
  //   const chat = this.modelMapping.startChat({
  //     history: history, 
  //   });

  //   const result = await chat.sendMessage(newMessage);
  //   return result.response.text();
  // }

  async mappingVector() {
    
  }
}
