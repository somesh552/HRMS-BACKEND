import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeavePeriodsService {
  constructor(private readonly db: DbService) {}

  async create(data: any) {
    const {
      period_name,
      start_date,
      end_date,
      company,
      is_active = true,
    } = data;

    const result = await this.db.query(
      `
      INSERT INTO leave_periods
      (
        period_name,
        start_date,
        end_date,
        company,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        period_name,
        start_date,
        end_date,
        company,
        is_active,
      ],
    );

    return result.rows[0];
  }

  async findAll() {
    const result = await this.db.query(
      `SELECT * FROM leave_periods ORDER BY id DESC`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.db.query(
      `SELECT * FROM leave_periods WHERE id = $1`,
      [id],
    );

    return result.rows[0];
  }

  async update(id: number, data: any) {
    const {
      period_name,
      start_date,
      end_date,
      company,
      is_active,
    } = data;

    const result = await this.db.query(
      `
      UPDATE leave_periods
      SET
        period_name = $1,
        start_date = $2,
        end_date = $3,
        company = $4,
        is_active = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        period_name,
        start_date,
        end_date,
        company,
        is_active,
        id,
      ],
    );

    return result.rows[0];
  }
}