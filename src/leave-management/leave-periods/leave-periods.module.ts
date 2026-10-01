import { Module } from '@nestjs/common';
import { LeavePeriodsController } from './leave-periods.controller';
import { LeavePeriodsService } from './leave-periods.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [LeavePeriodsController],
  providers: [LeavePeriodsService],
})
export class LeavePeriodsModule {}