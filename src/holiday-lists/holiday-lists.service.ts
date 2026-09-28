import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class HolidayListsService {
  constructor(private readonly db: DbService) {}

  // Create Holiday List
  async createList(data: any) {
    const { list_name, year } = data;

    const result = await this.db.query(
      `
      INSERT INTO holiday_lists (list_name, year)
      VALUES ($1, $2)
      RETURNING *
      `,
      [list_name, year],
    );

    return result.rows[0];
  }

  // Get all Holiday Lists
  async getLists() {
    const result = await this.db.query(
      `SELECT * FROM holiday_lists ORDER BY id DESC`,
    );

    return result.rows;
  }

  // Add Holiday
  async addHoliday(id: number, data: any) {
    const {
      holiday_date,
      holiday_name,
      holiday_type = 'Public',
    } = data;

    const result = await this.db.query(
      `
      INSERT INTO holidays
      (
        holiday_list_id,
        holiday_date,
        holiday_name,
        holiday_type
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        id,
        holiday_date,
        holiday_name,
        holiday_type,
      ],
    );

    return result.rows[0];
  }

  // Get holidays in a list
  async getHolidays(id: number) {
    const result = await this.db.query(
      `
      SELECT *
      FROM holidays
      WHERE holiday_list_id = $1
      ORDER BY holiday_date
      `,
      [id],
    );

    return result.rows;
  }

  // Delete Holiday
  async deleteHoliday(
    id: number,
    holidayId: number,
  ) {
    const result = await this.db.query(
      `
      DELETE FROM holidays
      WHERE id = $1
      AND holiday_list_id = $2
      RETURNING *
      `,
      [holidayId, id],
    );

    return result.rows[0];
  }
}