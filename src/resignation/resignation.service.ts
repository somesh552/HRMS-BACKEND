import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DbService } from '../db/db.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ResignationService {
  constructor(
    private readonly dbService: DbService,
    private readonly mailService: MailService,
  ) {}

  // =========================================================
  // CREATE RESIGNATION
  // =========================================================
async createResignation(
  employeeId: number,
  resignationDate: string,
  reason: string,
  hrEmail: string,
) {
  try {
    // 1. Check employee
    const employeeResult = await this.dbService.query(
      `
      SELECT
        id,
        employee_code,
        first_name,
        last_name,
        email
      FROM employees
      WHERE id = $1;
      `,
      [employeeId],
    );

    if (employeeResult.rows.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const employee = employeeResult.rows[0];

    const employeeName =
      `${employee.first_name} ${employee.last_name}`.trim();

    // 2. Check HR email
    if (!hrEmail || hrEmail.trim() === '') {
      throw new BadRequestException(
        'HR email is required',
      );
    }

    // 3. Save resignation
    const resignationResult =
      await this.dbService.query(
        `
        INSERT INTO employee_resignations (
          employee_id,
          resignation_date,
          reason,
          status
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `,
        [
          employeeId,
          resignationDate,
          reason,
          'Completed',
        ],
      );

    // 4. Update employee status
    await this.dbService.query(
      `
      UPDATE employees
      SET
        status = 'Inactive',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
      `,
      [employeeId],
    );

    // 5. Send email to HR
    let emailSent = false;

    try {
      await this.mailService.sendResignationMail(
        hrEmail,
        employeeName,
        employee.employee_code,
      );

      emailSent = true;

      console.log(
        `Resignation email sent successfully to ${hrEmail}`,
      );
    } catch (mailError) {
      emailSent = false;

      console.error(
        'Resignation saved, but HR email failed:',
        mailError,
      );
    }

    // 6. Return response
    return {
      success: true,

      message:
        'Employee resignation completed successfully',

      resignation: resignationResult.rows[0],

      emailSent,
    };
  } catch (error) {
    console.error(
      'Create resignation failed:',
      error,
    );

    throw error;
  }
}
  // =========================================================
  // GET ALL RESIGNATIONS
  // =========================================================
  async findAll() {
    const result = await this.dbService.query(
      `
      SELECT
        r.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email
      FROM employee_resignations r
      INNER JOIN employees e
        ON e.id = r.employee_id
      ORDER BY r.id DESC;
      `,
    );

    return result.rows;
  }

  // =========================================================
  // GET RESIGNATION BY ID
  // =========================================================
  async findOne(id: number) {
    const result = await this.dbService.query(
      `
      SELECT
        r.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email
      FROM employee_resignations r
      INNER JOIN employees e
        ON e.id = r.employee_id
      WHERE r.id = $1;
      `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        'Resignation not found',
      );
    }

    return result.rows[0];
  }
}