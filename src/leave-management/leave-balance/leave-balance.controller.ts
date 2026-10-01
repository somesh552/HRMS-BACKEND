import { Controller, Get, Param } from '@nestjs/common';
import { LeaveBalanceService } from './leave-balance.service';

@Controller('employees')
export class LeaveBalanceController {
    constructor(
        private readonly leaveBalanceService: LeaveBalanceService,
    ) { }

    @Get(':id/leave-balance')
    async getEmployeeBalance(@Param('id') id: string) {
        const data =
            await this.leaveBalanceService.getEmployeeBalance(
                Number(id),
            );

        return {
            message: 'Employee leave balance fetched successfully',
            data,
        };
    }
    @Get(':id/leave-balance/:typeId')
    async getEmployeeLeaveTypeBalance(
        @Param('id') id: string,
        @Param('typeId') typeId: string,
    ) {
        const data =
            await this.leaveBalanceService.getEmployeeLeaveTypeBalance(
                Number(id),
                Number(typeId),
            );

        return {
            message: 'Leave type balance fetched successfully',
            data,
        };
    }
}