import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { DbService } from '../db/db.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DbService,
  ) {}

  // ===========================
  // CREATE EMPLOYEE ACCOUNT
  // ===========================

  async createEmployeeAccount(
    employeeId: number,
    email: string,
  ) {
    // Generate temporary password
    const temporaryPassword =
      this.generateTemporaryPassword();

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(
      temporaryPassword,
      10,
    );

    // Create employee login account
    const result = await this.dbService.query(
      `
      INSERT INTO employee_accounts (
        employee_id,
        email,
        password_hash,
        is_active,
        must_change_password
      )
      VALUES ($1, $2, $3, TRUE, TRUE)
      RETURNING
        id,
        employee_id,
        email,
        is_active,
        must_change_password;
      `,
      [
        employeeId,
        email,
        passwordHash,
      ],
    );

    return {
      account: result.rows[0],
      temporaryPassword,
    };
  }

  // ===========================
  // EMPLOYEE LOGIN
  // ===========================

  async login(
    email: string,
    password: string,
  ) {
    // Find employee account
    const result = await this.dbService.query(
      `
      SELECT
        ea.id,
        ea.employee_id,
        ea.email,
        ea.password_hash,
        ea.is_active,
        ea.must_change_password,

        e.employee_code,
        e.first_name,
        e.last_name,
        e.status

      FROM employee_accounts ea

      INNER JOIN employees e
        ON e.id = ea.employee_id

      WHERE LOWER(ea.email) = LOWER($1);
      `,
      [email],
    );

    // Account not found
    if (result.rows.length === 0) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const account = result.rows[0];

    // Check login account status
    if (!account.is_active) {
      throw new UnauthorizedException(
        'Your employee account is inactive',
      );
    }

    // Check employee status
    if (account.status === 'Inactive') {
      throw new UnauthorizedException(
        'Your employee account is inactive',
      );
    }

    // Compare entered password with stored bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      account.password_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    // Update last login
    await this.dbService.query(
      `
      UPDATE employee_accounts
      SET
        last_login = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
      `,
      [account.id],
    );

    // Return login information
    return {
      message: 'Login successful',

      employee: {
        id: account.employee_id,
        employeeCode: account.employee_code,
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
      },

      mustChangePassword:
        account.must_change_password,
    };
  }

  // ===========================
  // GENERATE TEMPORARY PASSWORD
  // ===========================

  private generateTemporaryPassword(): string {
    const randomPart = Math.random()
      .toString(36)
      .slice(-6);

    return `HRMS@${randomPart}`;
  }
}