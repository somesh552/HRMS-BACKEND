import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';
import * as nodemailer from 'nodemailer';

@Injectable()
export class JobApplicationsService {

  constructor(private readonly db: DbService) { }


  // POST /job-applications
  async createApplication(data: any) {

    const result = await this.db.query(
      `
      INSERT INTO job_applications (
        job_opening_id,
        candidate_name,
        candidate_email,
        candidate_phone,
        resume_url,
        cover_letter,
        experience_years,
        current_location,
        application_status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )
      RETURNING *
      `,
      [
        data.job_opening_id,
        data.candidate_name,
        data.candidate_email,
        data.candidate_phone,
        data.resume_url,
        data.cover_letter,
        data.experience_years,
        data.current_location,
        data.application_status || 'Applied',
      ],
    );

    return {
      message: 'Job application created successfully',
      data: result.rows[0],
    };
  }


  // POST /job-applications/:id/resume
  async uploadResume(
    id: string,
    file: Express.Multer.File,
  ) {

    if (!file) {
      return {
        message: 'Resume file is required',
        data: null,
      };
    }

    // PDF only
    if (file.mimetype !== 'application/pdf') {
      return {
        message: 'Only PDF files are allowed',
        data: null,
      };
    }

    // Maximum 5 MB
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      return {
        message: 'Resume file must be 5 MB or less',
        data: null,
      };
    }

    // Check application exists
    const application = await this.db.query(
      `
      SELECT id
      FROM job_applications
      WHERE id = $1
      `,
      [id],
    );

    if (application.rows.length === 0) {
      return {
        message: 'Job application not found',
        data: null,
      };
    }

    // Read uploaded PDF
    const pdfBuffer = fs.readFileSync(file.path);

    // Extract PDF text
    const parser = new PDFParse({
      data: pdfBuffer,
    });

    const pdfData = await parser.getText();

    const resumeText = pdfData.text.trim();

    await parser.destroy();

    if (!resumeText) {
      return {
        message: 'Could not extract text from resume PDF',
        data: null,
      };
    }

    // Save uploaded file path
    const resumeUrl = file.path;

    const result = await this.db.query(
      `
      UPDATE job_applications
      SET resume_url = $1
      WHERE id = $2
      RETURNING *
      `,
      [resumeUrl, id],
    );

    return {
      message: 'Resume uploaded and text extracted successfully',
      data: {
        application_id: result.rows[0].id,
        resume_url: result.rows[0].resume_url,
        resume_text: resumeText,
      },
    };
  }


  // POST /job-applications/:id/ats
  async calculateATS(id: string) {

    // Get application + job opening details
    const result = await this.db.query(
      `
      SELECT
        ja.id AS application_id,
        ja.candidate_name,
        ja.candidate_email,
        ja.experience_years,
        ja.resume_url,

        jo.id AS job_opening_id,
        jo.required_skills,
        jo.experience_required,
        jo.qualification,
        jo.job_description

      FROM job_applications ja

      INNER JOIN job_openings jo
        ON jo.id = ja.job_opening_id

      WHERE ja.id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Job application or job opening not found',
        data: null,
      };
    }

    const application = result.rows[0];

    if (!application.resume_url) {
      return {
        message: 'Resume is not uploaded',
        data: null,
      };
    }

    // Read resume PDF
    const pdfBuffer = fs.readFileSync(application.resume_url);

    // Extract resume text
    const parser = new PDFParse({
      data: pdfBuffer,
    });

    const pdfData = await parser.getText();

    const resumeText = pdfData.text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    await parser.destroy();

    if (!resumeText) {
      return {
        message: 'Could not extract text from resume',
        data: null,
      };
    }

    // Job opening information
    const requiredSkills = (
      application.required_skills || ''
    ).toLowerCase();

    const experienceRequired = (
      application.experience_required || ''
    ).toLowerCase();

    const qualification = (
      application.qualification || ''
    ).toLowerCase();

    const jobDescription = (
      application.job_description || ''
    ).toLowerCase();


    // ----------------------------------
    // 1. SKILL MATCH - 40%
    // ----------------------------------

    const skills = requiredSkills
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of skills) {

      if (resumeText.includes(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }

    }

    let skillScore = 0;

    if (skills.length > 0) {

      skillScore =
        (matchedSkills.length / skills.length) * 40;

    } else {

      skillScore = 40;

    }


    // ----------------------------------
    // 2. EXPERIENCE - 20%
    // ----------------------------------

    let experienceScore = 0;

    const requiredExperienceMatch =
      experienceRequired.match(/(\d+(?:\.\d+)?)/);

    const requiredExperience =
      requiredExperienceMatch
        ? Number(requiredExperienceMatch[1])
        : 0;

    const candidateExperience =
      Number(application.experience_years) || 0;

    if (requiredExperience === 0) {

      experienceScore = 20;

    } else if (candidateExperience >= requiredExperience) {

      experienceScore = 20;

    } else {

      experienceScore =
        (candidateExperience / requiredExperience) * 20;

    }


    // ----------------------------------
    // 3. QUALIFICATION - 15%
    // ----------------------------------

    let qualificationScore = 0;

    if (
      qualification &&
      resumeText.includes(qualification)
    ) {

      qualificationScore = 15;

    }


    // ----------------------------------
    // 4. JOB DESCRIPTION - 25%
    // ----------------------------------

    // ----------------------------------
    // 4. JOB DESCRIPTION - 25%
    // ----------------------------------

    const descriptionWords: string[] = jobDescription
      .split(/[\s,.;:()\-\/]+/)
      .map((word: string) => word.trim())
      .filter((word: string) => word.length >= 4);

    const uniqueDescriptionWords: string[] = [
      ...new Set<string>(descriptionWords),
    ];

    let matchedDescriptionWords = 0;

    for (const word of uniqueDescriptionWords) {

      if (resumeText.includes(word)) {
        matchedDescriptionWords++;
      }

    }

    let descriptionScore = 0;

    if (uniqueDescriptionWords.length > 0) {

      descriptionScore =
        (matchedDescriptionWords /
          uniqueDescriptionWords.length) * 25;

    } else {

      descriptionScore = 25;

    }

    // ----------------------------------
    // FINAL ATS SCORE
    // ----------------------------------

    const atsScore =
      skillScore +
      experienceScore +
      qualificationScore +
      descriptionScore;

    const finalScore =
      Number(atsScore.toFixed(2));


    // ----------------------------------
    // SELECTED / REJECTED
    // ----------------------------------
    const applicationStatus =
      finalScore >= 70
        ? 'Selected'
        : 'Rejected';

    const selectionMessage =
      finalScore >= 70
        ? `Candidate selected. ATS Score: ${finalScore}%`
        : `Candidate not selected. ATS Score: ${finalScore}%`;


    // Update database
    const updateResult = await this.db.query(
      `
  UPDATE job_applications
  SET
    ats_score = $1,
    matched_skills = $2,
    missing_skills = $3,
    application_status = $4,
    selection_message = $5
  WHERE id = $6
  RETURNING *
  `,
      [
        finalScore,
        matchedSkills.join(', '),
        missingSkills.join(', '),
        applicationStatus,
        selectionMessage,
        id,
      ],
    );
    // Automatically send email
    await this.sendApplicationEmail(
      application.candidate_name,
      application.candidate_email,
      finalScore,
      applicationStatus,
    );

    if (applicationStatus === 'Rejected') {
      return {
        message: 'Candidate not selected',
        data: {
          application_id: id,
          candidate_name: application.candidate_name,
          ats_score: finalScore,
          application_status: applicationStatus,
          selection_message: selectionMessage,
        },
      };
    }

    return {
      message: 'Candidate selected',
      data: {
        application_id: id,
        candidate_name: application.candidate_name,
        ats_score: finalScore,
        application_status: applicationStatus,
        selection_message: selectionMessage,
      },
    };
  }




  // GET /job-applications
  async getAllApplications() {

    const result = await this.db.query(`
      SELECT *
      FROM job_applications
      ORDER BY id DESC
    `);

    return {
      message: 'Job applications fetched successfully',
      data: result.rows,
    };
  }


  // GET /job-applications/:id
  async getApplicationById(id: string) {

    const result = await this.db.query(
      `
      SELECT *
      FROM job_applications
      WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Job application not found',
        data: null,
      };
    }

    return {
      message: 'Job application fetched successfully',
      data: result.rows[0],
    };
  }


  // PUT /job-applications/:id
  async updateApplication(
    id: string,
    data: any,
  ) {

    const result = await this.db.query(
      `
      UPDATE job_applications
      SET
        job_opening_id = $1,
        candidate_name = $2,
        candidate_email = $3,
        candidate_phone = $4,
        resume_url = $5,
        cover_letter = $6,
        experience_years = $7,
        current_location = $8,
        application_status = $9
      WHERE id = $10
      RETURNING *
      `,
      [
        data.job_opening_id,
        data.candidate_name,
        data.candidate_email,
        data.candidate_phone,
        data.resume_url,
        data.cover_letter,
        data.experience_years,
        data.current_location,
        data.application_status,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Job application not found',
        data: null,
      };
    }

    return {
      message: 'Job application updated successfully',
      data: result.rows[0],
    };
  }


  // PUT /job-applications/:id/status
  async updateApplicationStatus(
    id: string,
    status: string,
  ) {

    if (!status) {
      return {
        message: 'Status is required',
        data: null,
      };
    }

    const result = await this.db.query(
      `
      UPDATE job_applications
      SET application_status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, id],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Job application not found',
        data: null,
      };
    }

    return {
      message: 'Application status updated successfully',
      data: result.rows[0],
    };
  }

  // POST /job-applications/:id/schedule-exam
  async scheduleExam(
    id: string,
    examDate: string,
    examTime: string,
  ) {

    // Get application
    const result = await this.db.query(
      `
      SELECT
        id,
        candidate_name,
        candidate_email,
        application_status,
        ats_score
      FROM job_applications
      WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Job application not found',
        data: null,
      };
    }

    const application = result.rows[0];

    // Only selected candidates can get an exam
    if (application.application_status !== 'Selected') {
      return {
        message: 'Only selected candidates can be scheduled for an exam',
        data: {
          application_id: application.id,
          candidate_name: application.candidate_name,
          ats_score: application.ats_score,
          application_status: application.application_status,
        },
      };

    }

    // Check exam date and time
    if (!examDate || !examTime) {
      return {
        message: 'Exam date and exam time are required',
        data: null,
      };
    }

    // Create selection message
    const selectionMessage =

      `Congratulations ${application.candidate_name}, ` +
      `your resume has been selected. ` +
      `Your exam is scheduled on ${examDate} at ${examTime}.`;

    // Save exam details
    const updateResult = await this.db.query(
      `
      UPDATE job_applications
      SET
        exam_date = $1,
        exam_time = $2,
        selection_message = $3
      WHERE id = $4
      RETURNING *
      `,
      [
        examDate,
        examTime,
        selectionMessage,
        id,
      ],
    );

    return {
      message: 'Exam scheduled successfully',
      data: {
        application_id: updateResult.rows[0].id,
        candidate_name: updateResult.rows[0].candidate_name,
        candidate_email: updateResult.rows[0].candidate_email,
        ats_score: updateResult.rows[0].ats_score,
        application_status: updateResult.rows[0].application_status,
        exam_date: updateResult.rows[0].exam_date,
        exam_time: updateResult.rows[0].exam_time,
        selection_message: updateResult.rows[0].selection_message,
      },
    };
  }


  async sendApplicationEmail(
    candidateName: string,
    candidateEmail: string,
    atsScore: number,
    applicationStatus: string,
  ) {

    console.log('MAIL_USER:', process.env.MAIL_USER);
    console.log('MAIL_PASSWORD loaded:', !!process.env.MAIL_PASSWORD);
    console.log('MAIL_PASSWORD length:', process.env.MAIL_PASSWORD?.length);

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    let subject = '';
    let html = '';

    if (applicationStatus === 'Selected') {

      subject = 'Congratulations! Your Application Has Been Selected';

      html = `
      <div style="font-family: Arial; max-width: 650px; margin: auto;">

        <h2>Congratulations ${candidateName}!</h2>

        <p>Your job application has been shortlisted.</p>

        <h3>Job Application Details</h3>

        <table border="1" cellpadding="8" cellspacing="0"
               style="border-collapse: collapse; width: 100%;">

          <tr>
            <td><strong>Candidate Name</strong></td>
            <td>${candidateName}</td>
          </tr>

          <tr>
            <td><strong>Email</strong></td>
            <td>${candidateEmail}</td>
          </tr>

          <tr>
            <td><strong>ATS Score</strong></td>
            <td>${atsScore}%</td>
          </tr>

          <tr>
            <td><strong>Application Status</strong></td>
            <td>Selected</td>
          </tr>

        </table>

        <p>
          Your resume has been shortlisted for the next stage
          of the recruitment process.
        </p>

        <p>Our HR team will contact you with the next steps.</p>

        <br>

        <p>
          Regards,<br>
          <strong>HR Recruitment Team</strong>
        </p>

      </div>
    `;

    } else {

      subject = 'Application Update - HRMS Recruitment';

      html = `
      <div style="font-family: Arial; max-width: 650px; margin: auto;">

        <h2>Hello ${candidateName},</h2>

        <p>
          Thank you for applying for the position.
        </p>

        <h3>Job Application Details</h3>

        <table border="1" cellpadding="8" cellspacing="0"
               style="border-collapse: collapse; width: 100%;">

          <tr>
            <td><strong>Candidate Name</strong></td>
            <td>${candidateName}</td>
          </tr>

          <tr>
            <td><strong>Email</strong></td>
            <td>${candidateEmail}</td>
          </tr>

          <tr>
            <td><strong>ATS Score</strong></td>
            <td>${atsScore}%</td>
          </tr>

          <tr>
            <td><strong>Application Status</strong></td>
            <td>Rejected</td>
          </tr>

        </table>

        <p>
          After reviewing your resume, we regret to inform you
          that you have not been shortlisted for the next stage
          of the recruitment process.
        </p>

        <p>
          We wish you all the best for your future career.
        </p>

        <br>

        <p>
          Regards,<br>
          <strong>HR Recruitment Team</strong>
        </p>

      </div>
    `;
    }

    await transporter.sendMail({
      from: `"HRMS Recruitment" <${process.env.MAIL_USER}>`,
      to: candidateEmail,
      subject,
      html,
    });

    console.log(`Email sent successfully to ${candidateEmail}`);
  }

  // DELETE /job-applications/:id
  async deleteApplication(id: string) {

    const result = await this.db.query(
      `
      UPDATE job_applications
      SET application_status = 'Rejected'
      WHERE id = $1
      RETURNING *
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return {
        message: 'Job application not found',
        data: null,
      };
    }

    return {
      message: 'Job application rejected successfully',
      data: result.rows[0],
    };
  }

}