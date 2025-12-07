import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { psychotestResults, careers } from 'src/db/schema';
import { eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

function processDataRoadmap(input: string): string[] {
    // 1. Split Awal: Membagi string pada setiap kemunculan pola Nomor. Spasi
    const initialSplit: string[] = input.split(/(?=\d+\. )/);

    const fixedArray: string[] = [];
    
    for (let i = 0; i < initialSplit.length; i++) {
        const currentItem = initialSplit[i].trim();
        
        // Cek kondisi perbaikan: Jika item saat ini adalah '1' dan item berikutnya dimulai dengan '0.'
        if (currentItem === '1' && i + 1 < initialSplit.length && initialSplit[i+1].trim().startsWith('0.')) {
            
            // Gabungkan '1' dengan '0. Terus Belajar...'
            const combinedItem = currentItem + initialSplit[i+1].trim();
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

@Injectable()
export class LlmService {
  private genAI: GoogleGenerativeAI;
  private modelRoadmap: GenerativeModel;
  private modelMapping: GenerativeModel;

  constructor(private configService: ConfigService, @Inject('DRIZZLE') private readonly db) {
    const apiKey =
      process.env.GEMINI_API_KEY || 'AIzaSyAYGqA6xEdT64-KQ4v7AeI1gbHnoFUZOqY';
    const roadmapModel = 'gemini-2.5-pro';
    const mappingModel = 'gemini-2.5-flash';

    this.genAI = new GoogleGenerativeAI(apiKey);

    // Inisialisasi Model
    this.modelRoadmap = this.genAI.getGenerativeModel({
      model: roadmapModel,
      generationConfig: {
        temperature: 0.7, // Tingkat kreativitas
        maxOutputTokens: 1000000000,
      },
    });

    this.modelMapping = this.genAI.getGenerativeModel({
      model: mappingModel,
      generationConfig: {
        temperature: 0.7, // Tingkat kreativitas
        maxOutputTokens: 1000000,
      },
    });
  }

  async generateText(id_user: string) {
    const userResults = await this.db
        .select({
            openness: psychotestResults.openness,
            conscientiousness: psychotestResults.conscientiousness,
            extraversion: psychotestResults.extraversion,
            agreeableness: psychotestResults.agreeableness,
            neuroticism: psychotestResults.neuroticism,
            numeric: psychotestResults.numeric,
            spatial: psychotestResults.spatial,
            perceptual: psychotestResults.perceptual,
            abstract: psychotestResults.abstract,
            verbal: psychotestResults.verbal,
        })
        .from(psychotestResults)
        .where(eq(psychotestResults.id_user, id_user))
        .limit(1);

    let prompt = 
    `Karir digital apa yang cocok untuk seseorang dengan 
    skor kepribadian OCEAN : Openess = ${userResults[0].openness}, 'Conscientiousness' = ${userResults[0].conscientiousness}, 
    'Extraversion' = ${userResults[0].extraversion}, 'Agreeableness' = ${userResults[0].agreeableness}, 'Neuroticism' = ${userResults[0].neuroticism}. 
    Kemudian skor Aptitude : 'Numerical' = ${userResults[0].numeric}, 'Spatial' = ${userResults[0].spatial}, 'Perceptual' = ${userResults[0].perceptual}
    , 'Abstract' = ${userResults[0].abstract}, 'Verbal' = ${userResults[0].verbal}. 
    Berikan 3 opsi karir dengan format jawaban seperti ini tanpa kalimat tambahan apapun: 1. {karir pertama} 2. {karir kedua} 3. {karir ketiga}`
        

    // 1. Cek apakah prompt benar-benar masuk?
    console.log('--- DEBUG PROMPT ---');
    console.log('Prompt yang diterima:', prompt);

    const result = await this.modelMapping.generateContent(prompt);
    const response = await result.response;

    // 2. Cek apakah kandidat diblokir?
    console.log('--- DEBUG RESPONSE ---');
    console.log('Finish Reason:', response.candidates?.[0]?.finishReason);
    console.log(
      'Safety Ratings:',
      JSON.stringify(response.candidates?.[0]?.safetyRatings, null, 2),
    );

    const text = response.text();

    const careerOptions = text.split('\n');

    const firstOption = careerOptions[0];
    const secondOption = careerOptions[1];
    const thirdOption = careerOptions[2];

    const insertOptions = [firstOption, secondOption, thirdOption];

    const careerData = {
      id_user: id_user,
      career_options: insertOptions,
    };

    await this.db
      .insert(careers)
      .values(
        careerData,
      );

    return {
      success: true,
      data: careerData,
      model: 'gemini-2.5-flash', // Note: Sebaiknya jangan hardcode '2.5-pro' jika belum rilis
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
  async chatWithHistory(history: any[], newMessage: string) {
    const chat = this.modelMapping.startChat({
      history: history, // Format: [{ role: "user", parts: "..." }, { role: "model", parts: "..." }]
    });

    const result = await chat.sendMessage(newMessage);
    return result.response.text();
  }
}
