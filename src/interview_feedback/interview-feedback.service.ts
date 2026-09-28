import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class InterviewFeedbackService {

  constructor(private readonly db: DbService) {}

  // POST /interviews/:id/feedback
  async createFeedback(id: string, data: any) {

    const result = await this.db.query(
      `
      INSERT INTO interview_feedback (
        interview_id,
        interviewer_id,
        technical_score,
        communication_score,
        problem_solving_score,
        leadership_score,
        overall_rating,
        recommendation,
        comments
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )
      RETURNING *
      `,
      [
        id,
        data.interviewer_id,
        data.technical_score,
        data.communication_score,
        data.problem_solving_score,
        data.leadership_score,
        data.overall_rating,
        data.recommendation,
        data.comments,
      ],
    );

    return {
      message: 'Interview feedback submitted successfully',
      data: result.rows[0],
    };
  }

  // GET /interviews/:id/feedback
  async getFeedback(id: string) {

    const result = await this.db.query(
      `
      SELECT *
      FROM interview_feedback
      WHERE interview_id = $1
      ORDER BY id DESC
      `,
      [id],
    );

    return {
      message: 'Interview feedback fetched successfully',
      data: result.rows,
    };
  }

  // PUT /interview-feedback/:id
  async updateFeedback(id: string, data: any) {

    const result = await this.db.query(
      `
      UPDATE interview_feedback
      SET
        interviewer_id = $1,
        technical_score = $2,
        communication_score = $3,
        problem_solving_score = $4,
        leadership_score = $5,
        overall_rating = $6,
        recommendation = $7,
        comments = $8
      WHERE id = $9
      RETURNING *
      `,
      [
        data.interviewer_id,
        data.technical_score,
        data.communication_score,
        data.problem_solving_score,
        data.leadership_score,
        data.overall_rating,
        data.recommendation,
        data.comments,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Interview feedback not found',
        data: null,
      };
    }

    return {
      message: 'Interview feedback updated successfully',
      data: result.rows[0],
    };
  }
}