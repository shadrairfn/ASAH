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
        .limit(1),
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
        question: q.question, // Mengisi kolom question (redundansi dari schema)
        number: index + 1, // Mengisi nomor urut soal (1 - 10)
        correct_answer: q.answer,
        // answer: null,      // Dibiarkan kosong karena user belum menjawab
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
        } else if (type === 'Openness') {
          scoreOpeness += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Conscientiousness') {
          scoreConscientiousness += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Extraversion') {
          scoreExtraversion += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Agreeableness') {
          scoreAgreeableness += parseFloat(matchAnswer.answer) || 0;
        } else if (type === 'Neuroticism') {
          scoreNeuroticism += parseFloat(matchAnswer.answer) || 0;
        }
      }
    });

    const resultUser = {
      id_user: id_user,
      openness: scoreOpeness,
      conscientiousness: scoreConscientiousness,
      extraversion: scoreExtraversion,
      agreeableness: scoreAgreeableness,
      neuroticism: scoreNeuroticism,
      numeric: scoreNumeric,
      spatial: scoreSpatial,
      perceptual: scorePerceptual,
      abstract: scoreAbstract,
      verbal: scoreVerbal,
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
        },
      });

    return {
      success: true,
      message: 'Success Posting Results',
      data: resultUser,
    };
  }
}
