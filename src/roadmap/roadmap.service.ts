import { Inject, Injectable, Body, NotFoundException } from '@nestjs/common';
import { LlmService } from 'src/llm/llm.service';
import {
  careerRecommendations,
  careers,
  psychotestResults,
} from 'src/db/schema';
import { sql, inArray, eq, cosineDistance, desc } from 'drizzle-orm';

@Injectable()
export class RoadmapService {
  constructor(
    @Inject('DRIZZLE') private readonly db,
    private readonly llmService: LlmService,
  ) {}

  async getRoadmap(id_user: string) {
    const model = this.llmService.getModelRoadmap();
  }

  async getOptionsCareer(id_user: string) {
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
    // 1. Ambil data rekomendasi mentah
    const recommendation = await this.db
      .select({
        options_career: careerRecommendations.options_career,
      })
      .from(careerRecommendations)
      .where(eq(careerRecommendations.id_user, id_user))
      .limit(1);

    // Cek jika data tidak ditemukan
    if (recommendation.length === 0) {
      return {
        success: false,
        message: 'User recommendations not found',
        data: [],
      };
    }

    const rawOptions = recommendation[0].options_career;

    // 2. Ambil ID saja dari array (index genap: 0, 2, 4)
    // Asumsi format array: [id1, score1, id2, score2, id3, score3]
    const targetIds = [rawOptions[0], rawOptions[2], rawOptions[4]];

    // 3. Ambil detail career dari tabel careers berdasarkan ID yang didapat
    const careerDetails = await this.db
      .select({
        id_career: careers.id_career,
        name: careers.name,
        description: careers.description,
        similarity: sql<number>`1 - (${cosineDistance(careers.vectorized, userVector)})`,
      })
      .from(careers)
      .where(inArray(careers.id_career, targetIds));

    // 4. Susun return value agar urutannya sesuai dengan rekomendasi awal
    // (Karena hasil query database tidak menjamin urutan)
    const returnValue = targetIds.map((id) => {
      // Cari detail yang cocok dengan ID
      const detail = careerDetails.find((c) => c.id_career === id);

      return {
        id_career: id,
        name: detail ? detail.name : 'Unknown Career',
        description: detail ? detail.description : 'No description available',
        similarity: detail ? detail.similarity : 0,
      };
    });

    return {
      success: true,
      data: returnValue,
      model: 'vector-search-v1',
    };
  }

  async selectCareer(id_user: string, @Body() body: { id_career: string }) {
    const { id_career } = body;

    const careerData = await this.db
      .select({
        name: careers.name,
        description: careers.description,
      })
      .from(careers)
      .where(eq(careers.id_career, id_career))
      .limit(1);

    // Validasi: Apakah karir ditemukan?
    if (!careerData.length) {
      throw new NotFoundException('Karir tidak ditemukan.');
    }

    const selectedCareer = careerData[0];

    console.log(selectedCareer);
    

    const userRecord = await this.db
      .update(careerRecommendations)
      .set({
        id_career: id_career,
        career_name: selectedCareer.name,
        description: selectedCareer.description,
      })
      .where(eq(careerRecommendations.id_user, id_user))
      .returning();

    return {
      success: true,
      data: userRecord,
    };
  }
}
