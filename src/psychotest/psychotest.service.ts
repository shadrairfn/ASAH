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

    // 1. Ambil soal secara acak
    const queries = types.map((type) =>
      this.db
        .select({
          id_question: questionPsychotest.id_question,
          type_question: questionPsychotest.type_question,
          question: questionPsychotest.question,
          answer: questionPsychotest.answer,
          options: questionPsychotest.option,
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
      const insertData = allQuestions.map((q, index) => {
        // Kembalikan objek secara eksplisit
        if (q.type_question === 'Numeric' || q.type_question === 'Spatial' || q.type_question === 'Perceptual' || q.type_question === 'Abstract' || q.type_question === 'Verbal') {
          return {
            id_user: id_user,
            id_question: q.id_question,
            type_question: q.type_question,
            question: q.question, 
            optionA: q.options[0],
            optionB: q.options[1],
            optionC: q.options[2],
            optionD: q.options[3],
            number: index + 1, 
            correct_answer: q.answer,
          }
        }
        return {
          id_user: id_user,
          id_question: q.id_question,
          type_question: q.type_question,
          question: q.question, 
          number: index + 1, 
          correct_answer: q.answer,
        };
      });

      // 4. Lakukan Bulk Insert ke database dan return inserted records
      const insertedRecords = await this.db
        .insert(userQuestion)
        .values(insertData)
        .returning();

      // 5. Map questions dengan id_user_question dari database
      const questionsWithUserQuestionId = allQuestions.map((q, index) => ({
        id_question: q.id_question,
        id_user_question: insertedRecords[index].id_user_question,
        type_question: q.type_question,
        question: q.question,
        // Perhatikan penambahan titik (.) sebelum [0]
        optionA: q.options?.[0] || null, 
        optionB: q.options?.[1] || null,
        optionC: q.options?.[2] || null,
        optionD: q.options?.[3] || null,
        explanation: q.explanation,
        number: index + 1,
      }));

      return {
        status: 200,
        message: 'Success fetching and assigning questions',
        data: questionsWithUserQuestionId,
      };
    }

    return {
      status: 200,
      message: 'No questions found',
      data: [],
    };
  }

  async submitPsychotest(id_user: string, payload: { user_answers: any[] }) {
    const answersInput = payload.user_answers || payload;

    console.log('Received answers:', answersInput);

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

    // Ambil data user question dengan JOIN ke questionPsychotest untuk dapat scoring_type
    const questionUser = await this.db
      .select({
        id_user_question: userQuestion.id_user_question,
        type_question: userQuestion.type_question, 
        correct_answer: userQuestion.correct_answer,
        id_question: userQuestion.id_question,
      })
      .from(userQuestion)
      .where(eq(userQuestion.id_user, id_user));
      
    console.log('Question User from DB:', questionUser);
    console.log('Total questions:', questionUser.length);

    // Ambil semua id_question untuk query ke questionPsychotest
    const questionIds = questionUser.map(q => q.id_question);
    
    // Get scoring_type dari questionPsychotest
    const questionDetails = await this.db
      .select({
        id_question: questionPsychotest.id_question,
        scoring_type: questionPsychotest.scoring_type, 
      })
      .from(questionPsychotest)
      .where(inArray(questionPsychotest.id_question, questionIds));

    console.log('Question Details:', questionDetails);

    // Process setiap jawaban
    questionUser.forEach((dbQ) => {
      const matchAnswer = answersInput.find(
        (input) => input.id_user_question === dbQ.id_user_question,
      );

      if (matchAnswer) {
        const type = dbQ.type_question;
        
        // Cari scoring_type dari questionDetails
        const questionDetail = questionDetails.find(
          qd => qd.id_question === dbQ.id_question
        );
        const scoringType = questionDetail?.scoring_type || 'normal';

        console.log(`Processing: ${type}, answer: ${matchAnswer.answer}, correct: ${dbQ.correct_answer}, scoring: ${scoringType}`);

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
          if (scoringType === 'reverse') {
            const reverse = 6 - parseFloat(matchAnswer.answer);
            scoreOpeness += reverse;
          } else {
            scoreOpeness += parseFloat(matchAnswer.answer) || 0;
          }
        } else if (type === 'Conscientiousness') {
          if (scoringType === 'reverse') {
            const reverse = 6 - parseFloat(matchAnswer.answer);
            scoreConscientiousness += reverse;
          } else {
            scoreConscientiousness += parseFloat(matchAnswer.answer) || 0;
          }
        } else if (type === 'Extraversion') {
          if (scoringType === 'reverse') {
            const reverse = 6 - parseFloat(matchAnswer.answer);
            scoreExtraversion += reverse;
          } else {
            scoreExtraversion += parseFloat(matchAnswer.answer) || 0;
          }
        } else if (type === 'Agreeableness') {
          if (scoringType === 'reverse') {
            const reverse = 6 - parseFloat(matchAnswer.answer);
            scoreAgreeableness += reverse;
          } else {
            scoreAgreeableness += parseFloat(matchAnswer.answer) || 0;
          }
        } else if (type === 'Neuroticism') {
          if (scoringType === 'reverse') {
            const reverse = 6 - parseFloat(matchAnswer.answer);
            scoreNeuroticism += reverse;
          } else {
            scoreNeuroticism += parseFloat(matchAnswer.answer) || 0;
          }
        }
      } else {
        console.log(`No answer found for id_user_question: ${dbQ.id_user_question}`);
      }
    });

    console.log('Raw Scores:', {
      scoreNumeric,
      scoreSpatial,
      scorePerceptual,
      scoreAbstract,
      scoreVerbal,
      scoreOpeness,
      scoreConscientiousness,
      scoreExtraversion,
      scoreAgreeableness,
      scoreNeuroticism,
    });

    // Hitung average (dibagi 3 karena setiap tipe ada 3 soal)
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

    console.log('Final Result:', resultUser);

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