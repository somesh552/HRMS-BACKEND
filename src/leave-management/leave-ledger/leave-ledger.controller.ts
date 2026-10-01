import { Controller, Get, Param } from '@nestjs/common';
import { LeaveLedgerService } from './leave-ledger.service';

@Controller()
export class LeaveLedgerController {
  constructor(
    private readonly leaveLedgerService: LeaveLedgerService,
  ) {}

  @Get('employees/:id/leave-ledger')
  async getEmployeeLedger(@Param('id') id: string) {
    const data =
      await this.leaveLedgerService.findByEmployee(
        Number(id),
      );

    return {
      message: 'Employee leave ledger fetched successfully',
      data,
    };
  }

  @Get('leave-ledger')
  async getAllLedger() {
    const data =
      await this.leaveLedgerService.findAll();

    return {
      message: 'Leave ledger fetched successfully',
      data,
    };
  }
}