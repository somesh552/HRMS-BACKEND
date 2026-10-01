import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeaveLedgerService {
  constructor(private readonly db: DbService) {}

  async findByEmployee(employeeId: number) {
    const result = await this.db.query(
      `
      SELECT
        lle.*,
        lt.leave_type_name
      FROM leave_ledger_entries lle
      LEFT JOIN leave_types lt
        ON lt.id = lle.leave_type_id
      WHERE lle.employee_id = $1
      ORDER BY lle.transaction_date DESC, lle.id DESC
      `,
      [employeeId],
    );

    return result.rows;
  }

  async findAll() {
    const result = await this.db.query(
      `
      SELECT
        lle.*,
        lt.leave_type_name
      FROM leave_ledger_entries lle
      LEFT JOIN leave_types lt
        ON lt.id = lle.leave_type_id
      ORDER BY lle.transaction_date DESC, lle.id DESC
      `,
    );

    return result.rows;
  }
}