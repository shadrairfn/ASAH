import { Injectable, Inject } from '@nestjs/common';
import {
  psychotestResults,
  questionPsychotest,
  userQuestion,
} from 'src/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { match } from 'assert';

@Injectable()
export class PsychotestService {
  constructor(@Inject('DRIZZLE') private readonly db) {}
  async getQuestions(id_user: string) {
    const types = [
      'Openness',
      'Conscientiousness',
      'Extraversion',
      'Agreeableness',
      'Neuroticism',
      'Numeric',
      'Spatial',
      'Perceptual',
      'Abstract',
      'Verbal',
    ];

    // 1. Ambil soal secara acak (kode lama Anda)
    const queries = types.map((type) =>
      this.db
        .select({
          id_question: questionPsychotest.id_question,
          type_question: questionPsychotest.type_question,
          question: questionPsychotest.question,
          answer: questionPsychotest.answer,
          explanation: questionPsychotest.explanation,
        })
        .from(questionPsychotest)
        .where(eq(questionPsychotest.type_question, type as any))
        .orderBy(sql`RANDOM()`)
        .limit(3),
    );

    const results = await Promise.all(queries);
    const allQuestions = results.flat();

    // 2. Cek jika ada soal yang ditemukan sebelum insert
    if (allQuestions.length > 0) {
      // 3. Siapkan data untuk dimasukkan ke tabel userQuestion
      const insertData = allQuestions.map((q, index) => ({
        id_user: id_user,
        id_question: q.id_question,
        type_question: q.type_question,
        question: q.question, 
        number: index + 1, 
        correct_answer: q.answer,
      }));

      console.log(insertData);

      // 4. Lakukan Bulk Insert ke database
      await this.db.insert(userQuestion).values(insertData);
    }

    return {
      status: 200,
      message: 'Success fetching and assigning questions',
      data: allQuestions,
    };
  }

  async submitAptitude(id_user: string, payload: { user_answers: any[] }) {
    // 1. Ekstrak array dari dalam object payload (jika terbungkus)
    // Jika Anda yakin inputnya langsung array, ganti 'payload.user_answers' menjadi 'payload'
    const answersInput = payload.user_answers || payload;

    let scoreNumeric = 0;
    let scoreSpatial = 0;
    let scorePerceptual = 0;
    let scoreAbstract = 0;
    let scoreVerbal = 0;

    let scoreOpeness = 0;
    let scoreConscientiousness = 0;
    let scoreExtraversion = 0;
    let scoreAgreeableness = 0;
    let scoreNeuroticism = 0;

    const questionUser = await this.db
      .select({
        id_user_question: userQuestion.id_user_question,
        type_question: userQuestion.type_question, 
        correct_answer: userQuestion.correct_answer, 
      })
      .from(userQuestion)
      .where(eq(userQuestion.id_user, id_user))
      .limit(10);
      
    const processedResults = questionUser.map((dbQ) => {
      const matchAnswer = answersInput.find(
        (input) => input.id_user_question === dbQ.id_user_question,
      );

      if (matchAnswer) {
        const type = dbQ.type_question; 
        const scoringType = dbQ.scoring_type;
        let reverse = 0;

        // Cek apakah tipe soal termasuk Aptitude
        if (type === 'Numeric') {
          scoreNumeric += matchAnswer.answer === dbQ.correct_answer ? 1 : 0;
        } else if (type === 'Spatial') {
          scoreSpatial += matchAnswer.answer === dbQ.correct_answer ? 1 : 0;
        } else if (type === 'Perceptual') {
          scorePerceptual += matchAnswer.answer === dbQ.correct_answer ? 1 : 0;
        } else if (type === 'Abstract') {
          scoreAbstract += matchAnswer.answer === dbQ.correct_answer ? 1 : 0;
        } else if (type === 'Verbal') {
          scoreVerbal += matchAnswer.answer === dbQ.correct_answer ? 1 : 0;
        } else if (type === 'Openness' && scoringType === 'normal') {
          scoreOpeness += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Openness' && scoringType === 'reverse') {
          reverse = 6 - parseFloat(matchAnswer.answer) || 0;
          scoreOpeness += reverse;
        } else if (type === 'Conscientiousness' && scoringType === 'normal') {
          scoreConscientiousness += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Conscientiousness' && scoringType === 'reverse') {
          reverse = 6 - parseFloat(matchAnswer.answer) || 0;
          scoreConscientiousness += reverse;
        } else if (type === 'Extraversion' && scoringType === 'normal') {
          scoreExtraversion += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Extraversion' && scoringType === 'reverse') {
          reverse = 6 - parseFloat(matchAnswer.answer) || 0;
          scoreExtraversion += reverse;
        } else if (type === 'Agreeableness' && scoringType === 'normal') {
          scoreAgreeableness += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Agreeableness' && scoringType === 'reverse') {
          reverse = 6 - parseFloat(matchAnswer.answer) || 0;
          scoreAgreeableness += reverse;
        } else if (type === 'Neuroticism' && scoringType === 'normal') {
          scoreNeuroticism += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Neuroticism' && scoringType === 'reverse') {
          reverse = 6 - parseFloat(matchAnswer.answer) || 0;
          scoreNeuroticism += reverse;
        }
      }
    });

    const avgOpen = (scoreOpeness / 3) / 5;
    const avgCon = (scoreConscientiousness / 3) / 5;
    const avgExt = (scoreExtraversion / 3) / 5;
    const avgAg = (scoreAgreeableness / 3) / 5;
    const avgNeu = (scoreNeuroticism / 3) / 5;

    const avgNum = scoreNumeric / 3;
    const avgSpat = scoreSpatial / 3;
    const avgPer = scorePerceptual / 3;
    const avgAbs = scoreAbstract / 3;
    const avgVer = scoreVerbal / 3;

    const vectorizeScore = [
      avgOpen,
      avgCon,
      avgExt,
      avgAg,
      avgNeu,
      avgNum,
      avgSpat,
      avgPer,
      avgAbs,
      avgVer,
    ];

    const resultUser = {
      id_user: id_user,
      openness: avgOpen,
      conscientiousness: avgCon,
      extraversion: avgExt,
      agreeableness: avgAg,
      neuroticism: avgNeu,
      numeric: avgNum,
      spatial: avgSpat,
      perceptual: avgPer,
      abstract: avgAbs,
      verbal: avgVer,
      vectorize_score: vectorizeScore,
    };

    await this.db
      .insert(psychotestResults)
      .values(resultUser)
      .onConflictDoUpdate({
        target: psychotestResults.id_user,
        set: {
          openness: resultUser.openness,
          conscientiousness: resultUser.conscientiousness,
          extraversion: resultUser.extraversion,
          agreeableness: resultUser.agreeableness,
          neuroticism: resultUser.neuroticism,
          numeric: resultUser.numeric,
          spatial: resultUser.spatial,
          perceptual: resultUser.perceptual,
          abstract: resultUser.abstract,
          verbal: resultUser.verbal,
          vectorize_score: resultUser.vectorize_score,
        },
      });

    return {
      success: true,
      message: 'Success Posting Results',
      data: resultUser,
    };
  }
}
