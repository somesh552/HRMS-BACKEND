import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class LeaveApplicationsService {
    constructor(private readonly db: DbService) { }

    async create(data: any) {
        const {
            employee_id,
            leave_type_id,
            from_date,
            to_date,
            reason,
            is_half_day = false,
            half_day_date = null,
        } = data;

        // 1. Check required fields
        if (!employee_id) {
            throw new Error('Employee ID is required');
        }

        if (!leave_type_id) {
            throw new Error('Leave Type ID is required');
        }

        if (!from_date || !to_date) {
            throw new Error('From date and To date are required');
        }

        // 2. Convert dates
        const from = new Date(from_date);
        const to = new Date(to_date);

        // 3. Check invalid dates
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            throw new Error('Invalid leave date');
        }

        // 4. From date cannot be after To date
        if (from > to) {
            throw new Error(
                'From date cannot be greater than To date',
            );
        }
        // 5. Check whether employee exists
        const employeeResult = await this.db.query(
            `
    SELECT id
    FROM employees
    WHERE id = $1
    `,
            [employee_id],
        );

        if (employeeResult.rows.length === 0) {
            throw new Error(
                `Employee with ID ${employee_id} not found`,
            );
        }
        // 6.3 Check whether leave type exists
        const leaveTypeResult = await this.db.query(
            `
    SELECT id
    FROM leave_types
    WHERE id = $1
    `,
            [leave_type_id],
        );

        if (leaveTypeResult.rows.length === 0) {
            throw new Error(
                `Leave type with ID ${leave_type_id} not found`,
            );
        }

        // 6.4 Calculate leave days excluding Saturday and Sunday
        // 6.4 + 8.1 Calculate leave days
        // Exclude Saturday, Sunday and configured holidays

        const holidayResult = await this.db.query(
            `
    SELECT holiday_date
    FROM holidays
    WHERE holiday_list_id = $1
    `,
            [1],
        );

        const holidayDates = new Set(
            holidayResult.rows.map(
                (holiday) =>
                    new Date(holiday.holiday_date)
                        .toISOString()
                        .split('T')[0],
            ),
        );

        let total_leave_days = 0;

        const currentDate = new Date(from);

        while (currentDate <= to) {
            const day = currentDate.getDay();

            const dateString = currentDate
                .toISOString()
                .split('T')[0];

            // Saturday = 6
            // Sunday = 0
            // Holiday = configured holiday
            if (
                day !== 0 &&
                day !== 6 &&
                !holidayDates.has(dateString)
            ) {
                total_leave_days++;
            }

            currentDate.setDate(
                currentDate.getDate() + 1,
            );
        }
        // 7. Half-day calculation
        if (is_half_day) {
            if (!half_day_date) {
                throw new Error(
                    'Half day date is required',
                );
            }

            const halfDay = new Date(half_day_date);

            if (halfDay < from || halfDay > to) {
                throw new Error(
                    'Half day date must be within the leave period',
                );
            }

            total_leave_days =
                total_leave_days - 0.5;
        }

        // 6.5 Check overlapping leave
        const overlapResult = await this.db.query(
            `
    SELECT id
    FROM leave_applications
    WHERE employee_id = $1
      AND status IN ('Open', 'Approved')
      AND from_date <= $3
      AND to_date >= $2
    `,
            [
                employee_id,
                from_date,
                to_date,
            ],
        );

        if (overlapResult.rows.length > 0) {
            throw new Error(
                'Leave application overlaps with an existing leave',
            );
        }


        // 6.6 Check leave balance

        const allocationResult = await this.db.query(
            `
    SELECT *
    FROM leave_allocations
    WHERE employee_id = $1
      AND leave_type_id = $2
    `,
            [
                employee_id,
                leave_type_id,
            ],
        );

        const allocation = allocationResult.rows[0];

        if (!allocation) {
            throw new Error(
                'Leave allocation not found for this employee and leave type',
            );
        }

        const remainingLeaves = Number(
            allocation.remaining_leaves,
        );

        const requestedDays = Number(
            total_leave_days,
        );
        console.log("LWP TEST");
        console.log("Remaining Leaves:", remainingLeaves);
        console.log("Requested Days:", requestedDays);

        let is_lwp = false;

        if (requestedDays > remainingLeaves) {
            is_lwp = true;
        }
        console.log("FINAL is_lwp:", is_lwp);

        // 8. Create leave application
        const result = await this.db.query(
            `
    INSERT INTO leave_applications (
        employee_id,
        leave_type_id,
        from_date,
        to_date,
        total_leave_days,
        is_half_day,
        half_day_date,
        reason,
        status,
        is_lwp
    )
    VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'Open',
        $9
    )
    RETURNING *
    `,
            [
                employee_id,
                leave_type_id,
                from_date,
                to_date,
                total_leave_days,
                is_half_day,
                half_day_date,
                reason,
                is_lwp,
            ],
        );
    }


    async findAll() {
        const result = await this.db.query(
            `
    SELECT *
    FROM leave_applications
    ORDER BY id DESC
    `,
        );

        return result.rows;
    }
    async findOne(id: number) {
        const result = await this.db.query(
            `
    SELECT *
    FROM leave_applications
    WHERE id = $1
    `,
            [id],
        );

        return result.rows[0];
    }



    async update(id: number, data: any) {
        const {
            employee_id,
            leave_type_id,
            from_date,
            to_date,
            reason,
            is_half_day = false,
            half_day_date = null,
        } = data;

        const from = new Date(from_date);
        const to = new Date(to_date);

        const difference =
            to.getTime() - from.getTime();
        let total_leave_days =
            Math.floor(
                difference / (1000 * 60 * 60 * 24),
            ) + 1;

        if (is_half_day) {
            total_leave_days =
                total_leave_days - 0.5;
        }

        const result = await this.db.query(
            `
    UPDATE leave_applications
    SET
      employee_id = $1,
      leave_type_id = $2,
      from_date = $3,
      to_date = $4,
      total_leave_days = $5,
      is_half_day = $6,
      half_day_date = $7,
      reason = $8
    WHERE id = $9
    RETURNING *
    `,
            [
                employee_id,
                leave_type_id,
                from_date,
                to_date,
                total_leave_days,
                is_half_day,
                half_day_date,
                reason,
                id,
            ],
        );

        return result.rows[0];
    }



    async approve(id: number, hrApprovedBy: number) {
        // 1. Get leave application
        const applicationResult = await this.db.query(
            `
        SELECT *
        FROM leave_applications
        WHERE id = $1
        `,
            [id],
        );

        const application = applicationResult.rows[0];

        if (!application) {
            throw new Error('Leave application not found');
        }

        // 2. Only Open applications can be approved
        if (application.status !== 'Open') {
            throw new Error(
                `Leave application is already ${application.status}`,
            );
        }

        // 3. Check leave balance
        const allocationResult = await this.db.query(
            `
        SELECT *
        FROM leave_allocations
        WHERE employee_id = $1
          AND leave_type_id = $2
        `,
            [
                application.employee_id,
                application.leave_type_id,
            ],
        );

        const allocation = allocationResult.rows[0];

        if (!allocation) {
            throw new Error(
                'Leave allocation not found for this employee and leave type',
            );
        }

        const remainingLeaves = Number(
            allocation.remaining_leaves,
        );

        const requestedDays = Number(
            application.total_leave_days,
        );
        let is_lwp = false;

        if (requestedDays > remainingLeaves) {
            is_lwp = true;
        }

        // 4. Check sufficient balance
        if (requestedDays > remainingLeaves) {

            await this.db.query(
                `
            UPDATE leave_applications
            SET is_lwp = true
            WHERE id = $1
            `,
                [id],
            );

            throw new Error(
                `Insufficient leave balance. Available: ${remainingLeaves}, Requested: ${requestedDays}. Leave marked as LWP.`,
            );
        }

        // 5. Approve leave
        const approvedResult = await this.db.query(
            `
        UPDATE leave_applications
        SET
            status = 'Approved',
            hr_approved_by = $1
        WHERE id = $2
        RETURNING *
        `,
            [hrApprovedBy, id],
        );

        // 6. Update leave allocation
        const allocationUpdateResult = await this.db.query(
            `
        UPDATE leave_allocations
        SET
            used_leaves = used_leaves + $1,
            remaining_leaves =
                total_leaves_allocated
                + carry_forward_leaves
                - (used_leaves + $1)
        WHERE employee_id = $2
          AND leave_type_id = $3
        RETURNING *
        `,
            [
                application.total_leave_days,
                application.employee_id,
                application.leave_type_id,
            ],
        );

        const updatedAllocation =
            allocationUpdateResult.rows[0];

        if (!updatedAllocation) {
            throw new Error(
                'Leave allocation could not be updated',
            );
        }

        // 7. Create Leave Ledger entry
        await this.db.query(
            `
        INSERT INTO leave_ledger_entries (
            employee_id,
            leave_type_id,
            leave_period_id,
            transaction_type,
            leaves_change,
            balance_after,
            reference_id,
            reference_type,
            transaction_date
        )
        VALUES (
            $1,
            $2,
            $3,
            'Leave Taken',
            $4,
            $5,
            $6,
            'Leave Application',
            CURRENT_DATE
        )
        `,
            [
                application.employee_id,
                application.leave_type_id,
                updatedAllocation.leave_period_id,
                -Number(application.total_leave_days),
                updatedAllocation.remaining_leaves,
                application.id,
            ],
        );

        return approvedResult.rows[0];
    }




    async reject(id: number, hrRejectedBy: number) {
        const result = await this.db.query(
            `
    UPDATE leave_applications
    SET
      status = 'Rejected',
      hr_approved_by = $1
    WHERE id = $2
    RETURNING *
    `,
            [hrRejectedBy, id],
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



    async delete(id: number) {
        const result = await this.db.query(
            `
    DELETE FROM leave_applications
    WHERE id = $1
      AND status = 'Open'
    RETURNING *
    `,
            [id],
        );

        return result.rows[0];
    }

    

}