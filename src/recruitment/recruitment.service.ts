import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class RecruitmentService {

  constructor(private readonly db: DbService) {}

  // GET /recruitment/summary
  async getRecruitmentSummary() {

    const result = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM job_openings)
          AS total_job_openings,

        (SELECT COUNT(*) FROM job_applications)
          AS total_applications,

        (SELECT COUNT(*) FROM interviews)
          AS total_interviews,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Shortlisted')
          AS shortlisted_candidates,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Selected')
          AS selected_candidates,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Rejected')
          AS rejected_candidates
    `);

    return {
      message: 'Recruitment summary fetched successfully',
      data: result.rows[0],
    };
  }

  // GET /recruitment/dashboard
  async getRecruitmentDashboard() {

    const result = await this.db.query(`
      SELECT
        (SELECT COUNT(*)
         FROM job_openings)
          AS total_job_openings,

        (SELECT COUNT(*)
         FROM job_applications)
          AS total_applications,

        (SELECT COUNT(*)
         FROM interviews)
          AS total_interviews,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Applied')
          AS applied_candidates,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Shortlisted')
          AS shortlisted_candidates,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Selected')
          AS selected_candidates,

        (SELECT COUNT(*)
         FROM job_applications
         WHERE application_status = 'Rejected')
          AS rejected_candidates,

        (SELECT COUNT(*)
         FROM interviews
         WHERE interview_status = 'Scheduled')
          AS scheduled_interviews,

        (SELECT COUNT(*)
         FROM interviews
         WHERE interview_status = 'Completed')
          AS completed_interviews
    `);

    return {
      message: 'Recruitment dashboard fetched successfully',
      data: result.rows[0],
    };
  }

  // GET /recruitment/pipeline
async getRecruitmentPipeline() {

  const result = await this.db.query(`
    SELECT
      (SELECT COUNT(*)
       FROM job_applications
       WHERE application_status = 'Applied')
       AS applied,

      (SELECT COUNT(*)
       FROM job_applications
       WHERE application_status = 'Shortlisted')
       AS shortlisted,

      (SELECT COUNT(*)
       FROM interviews)
       AS interviews,

      (SELECT COUNT(*)
       FROM job_applications
       WHERE application_status = 'Selected')
       AS selected,

      (SELECT COUNT(*)
       FROM job_applications
       WHERE application_status = 'Rejected')
       AS rejected
  `);

  return {
    message: 'Recruitment pipeline fetched successfully',
    data: result.rows[0],
  };
}

}