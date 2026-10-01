import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DepartmentModule } from './department/department.module';

import { DbModule } from './db/db.module';

import { DesignationModule } from './designation/designation.module';

import { EmployeeModule } from './employee/employee.module';
import { HolidayListsModule } from './holiday-lists/holiday-lists.module';
import { LeaveAllocationsModule } from './leave-management/leave-allocations/leave-allocations.module';
import { LeaveApplicationsModule } from './leave-management/leave-applications/leave-applications.module';
import { LeaveBalanceModule } from './leave-management/leave-balance/leave-balance.module';
import { LeaveLedgerModule } from './leave-management/leave-ledger/leave-ledger.module';
import { LeavePeriodsModule } from './leave-management/leave-periods/leave-periods.module';
import { LeaveTypesModule } from './leave-management/leave-types/leave-types.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    DepartmentModule,
    DesignationModule,
    EmployeeModule,
      LeaveAllocationsModule,
    LeaveApplicationsModule,
    LeaveBalanceModule,
    LeaveLedgerModule,
    HolidayListsModule,
    LeavePeriodsModule,
    LeaveTypesModule,

  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
