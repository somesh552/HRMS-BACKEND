import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeaveAllocationsService {
    constructor(private readonly db: DbService) { }

    async create(data: any) {
        const {
            employee_id,
            leave_type_id,
            leave_period_id,
            total_leaves_allocated,
            carry_forward_leaves = 0,
        } = data;

        const remaining_leaves =
            Number(total_leaves_allocated) +
            Number(carry_forward_leaves);

        const result = await this.db.query(
            `
      INSERT INTO leave_allocations
      (
        employee_id,
        leave_type_id,
        leave_period_id,
        total_leaves_allocated,
        carry_forward_leaves,
        used_leaves,
        remaining_leaves
      )
      VALUES ($1, $2, $3, $4, $5, 0, $6)
      RETURNING *
      `,
            [
                employee_id,
                leave_type_id,
                leave_period_id,
                total_leaves_allocated,
                carry_forward_leaves,
                remaining_leaves,
            ],
        );

        return result.rows[0];
    }

    async findAll() {
        const result = await this.db.query(
            `
      SELECT *
      FROM leave_allocations
      ORDER BY id DESC
      `,
        );

        return result.rows;
    }
    async findOne(id: number) {
        const result = await this.db.query(
            `
    SELECT *
    FROM leave_allocations
    WHERE id = $1
    `,
            [id],
        );

        return result.rows[0];
    }

    async findByEmployee(employeeId: number) {
        const result = await this.db.query(
            `
      SELECT *
      FROM leave_allocations
      WHERE employee_id = $1
      ORDER BY id DESC
      `,
            [employeeId],
        );

        return result.rows;
    }

    async update(id: number, data: any) {
        const {
            total_leaves_allocated,
            carry_forward_leaves = 0,
            used_leaves = 0,
        } = data;

        const remaining_leaves =
            Number(total_leaves_allocated) +
            Number(carry_forward_leaves) -
            Number(used_leaves);

        const result = await this.db.query(
            `
      UPDATE leave_allocations
      SET
        total_leaves_allocated = $1,
        carry_forward_leaves = $2,
        used_leaves = $3,
        remaining_leaves = $4
      WHERE id = $5
      RETURNING *
      `,
            [
                total_leaves_allocated,
                carry_forward_leaves,
                used_leaves,
                remaining_leaves,
                id,
            ],
        );

        return result.rows[0];
    }
    async cancel(id: number) {
        const result = await this.db.query(
            `
    UPDATE leave_applications
    SET
      status = 'Cancelled'
    WHERE id = $1
    RETURNING *
    `,
            [id],
        );

        return result.rows[0];
    }



}