import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly db: DbService) {}

  async create(data: any) {
    const {
      leave_type_name,
      max_days_allowed,
      is_paid = true,
      is_carry_forward = false,
      max_carry_forward_days = 0,
      is_encashable = false,
      applicable_after_days = 0,
    } = data;

    const result = await this.db.query(
      `
      INSERT INTO leave_types
      (
        leave_type_name,
        max_days_allowed,
        is_paid,
        is_carry_forward,
        max_carry_forward_days,
        is_encashable,
        applicable_after_days
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        leave_type_name,
        max_days_allowed,
        is_paid,
        is_carry_forward,
        max_carry_forward_days,
        is_encashable,
        applicable_after_days,
      ],
    );

    return result.rows[0];
  }

  async findAll() {
    const result = await this.db.query(
      `SELECT * FROM leave_types ORDER BY id DESC`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.db.query(
      `SELECT * FROM leave_types WHERE id = $1`,
      [id],
    );

    return result.rows[0];
  }

  async update(id: number, data: any) {
    const {
      leave_type_name,
      max_days_allowed,
      is_paid,
      is_carry_forward,
      max_carry_forward_days,
      is_encashable,
      applicable_after_days,
    } = data;

    const result = await this.db.query(
      `
      UPDATE leave_types
      SET
        leave_type_name = $1,
        max_days_allowed = $2,
        is_paid = $3,
        is_carry_forward = $4,
        max_carry_forward_days = $5,
        is_encashable = $6,
        applicable_after_days = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        leave_type_name,
        max_days_allowed,
        is_paid,
        is_carry_forward,
        max_carry_forward_days,
        is_encashable,
        applicable_after_days,
        id,
      ],
    );

    return result.rows[0];
  }

  async remove(id: number) {
    const result = await this.db.query(
      `DELETE FROM leave_types WHERE id = $1 RETURNING *`,
      [id],
    );

    return result.rows[0];
  }
}