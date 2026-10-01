import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly db: DbService) {}

  async getEmployeeBalance(employeeId: number) {
    const result = await this.db.query(
      `
      SELECT
        la.employee_id,
        la.leave_type_id,
        lt.leave_type_name,
        la.leave_period_id,
        la.total_leaves_allocated,
        la.carry_forward_leaves,
        la.used_leaves,
        (
          la.total_leaves_allocated
          + la.carry_forward_leaves
          - la.used_leaves
        ) AS remaining_leaves
      FROM leave_allocations la
      JOIN leave_types lt
        ON lt.id = la.leave_type_id
      WHERE la.employee_id = $1
      ORDER BY la.leave_type_id
      `,
      [employeeId],
    );

    return result.rows;
  }

  async getEmployeeLeaveTypeBalance(
  employeeId: number,
  leaveTypeId: number,
) {
  const result = await this.db.query(
    `
    SELECT
      la.employee_id,
      la.leave_type_id,
      lt.leave_type_name,
      la.leave_period_id,
      la.total_leaves_allocated,
      la.carry_forward_leaves,
      la.used_leaves,
      (
        la.total_leaves_allocated
        + la.carry_forward_leaves
        - la.used_leaves
      ) AS remaining_leaves
    FROM leave_allocations la
    JOIN leave_types lt
      ON lt.id = la.leave_type_id
    WHERE la.employee_id = $1
      AND la.leave_type_id = $2
    `,
    [employeeId, leaveTypeId],
  );

  return result.rows[0];
}
}