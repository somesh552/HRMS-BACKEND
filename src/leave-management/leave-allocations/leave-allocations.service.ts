import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeaveAllocationsService {
  constructor(private readonly db: DbService) {}

// =========================
// CREATE
// =========================
async create(data: any) {
  const {
    employee_id,
    leave_type_id,
    leave_period_id,
    total_leaves_allocated,
    carry_forward_leaves = 0,
  } = data;

  // Validate required fields
  if (!employee_id) {
    throw new Error('Employee ID is required');
  }

  if (!leave_type_id) {
    throw new Error('Leave Type ID is required');
  }

  if (!leave_period_id) {
    throw new Error('Leave Period ID is required');
  }

  if (
    total_leaves_allocated === undefined ||
    total_leaves_allocated === null
  ) {
    throw new Error('Total leaves allocated is required');
  }

  // Check employee exists
  const employee = await this.db.query(
    `
    SELECT id
    FROM employees
    WHERE id = $1
    `,
    [employee_id],
  );

  if (employee.rows.length === 0) {
    throw new Error(`Employee with ID ${employee_id} not found`);
  }

  // Check leave type exists
  const leaveType = await this.db.query(
    `
    SELECT id
    FROM leave_types
    WHERE id = $1
    `,
    [leave_type_id],
  );

  if (leaveType.rows.length === 0) {
    throw new Error(`Leave type with ID ${leave_type_id} not found`);
  }

  // Check leave period exists
  const leavePeriod = await this.db.query(
    `
    SELECT id
    FROM leave_periods
    WHERE id = $1
    `,
    [leave_period_id],
  );

  if (leavePeriod.rows.length === 0) {
    throw new Error(`Leave period with ID ${leave_period_id} not found`);
  }

  // Prevent duplicate allocation
  const existing = await this.db.query(
    `
    SELECT id
    FROM leave_allocations
    WHERE employee_id = $1
      AND leave_type_id = $2
      AND leave_period_id = $3
    `,
    [
      employee_id,
      leave_type_id,
      leave_period_id,
    ],
  );

  if (existing.rows.length > 0) {
    throw new Error(
      `Leave allocation already exists for this employee, leave type and period`,
    );
  }

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

  // =========================
  // GET ALL
  // =========================
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

  // =========================
  // GET BY ID
  // =========================
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

  // =========================
  // GET BY EMPLOYEE
  // =========================
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

  // =========================
  // UPDATE
  // =========================
  async update(id: number, data: any) {
    const {
      employee_id,
      leave_type_id,
      leave_period_id,
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
        employee_id = $1,
        leave_type_id = $2,
        leave_period_id = $3,
        total_leaves_allocated = $4,
        carry_forward_leaves = $5,
        used_leaves = $6,
        remaining_leaves = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        employee_id,
        leave_type_id,
        leave_period_id,
        total_leaves_allocated,
        carry_forward_leaves,
        used_leaves,
        remaining_leaves,
        id,
      ],
    );

    if (result.rows.length === 0) {
      throw new Error(
        `Leave allocation with ID ${id} not found`,
      );
    }

    return result.rows[0];
  }

  // =========================
  // CANCEL
  // =========================
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