import { Inject, Injectable } from '@nestjs/common';
import { LlmService } from 'src/llm/llm.service';
import { careerRecommendations } from 'src/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class RoadmapService {
    constructor(@Inject('DRIZZLE') private readonly db, private readonly llmService: LlmService) {}

    async getRoadmap(id_user: string) {
        const model = this.llmService.getModelRoadmap();


    }

    async getOptionsCareer(id_user: string) {
        const userCareer = await this.db
          .select({
            options_career: careerRecommendations.options_career,
          })
          .from(careerRecommendations)
          .where(eq(careerRecommendations.id_user, id_user))
          .limit(1);
    
        userCareer.map((career, index) => {
          const split = [
            career.options_career[0], career.options_career[1], 
            career.options_career[2], career.options_career[3], 
            career.options_career[4], career.options_career[5]
          ]
          
          userCareer[index] = split;
        })
    
        const returnValue = [
          {
            id_career: userCareer[0][0],
            similarity: userCareer[0][1],
          },
          {
            id_career: userCareer[0][2],
            similarity: userCareer[0][3],
          },
          {
            id_career: userCareer[0][4],
            similarity: userCareer[0][5],
          }
        ]
    
        return {
          success: true,
          data: returnValue,
          model: 'vector-search-v1',
        };
      }
}
