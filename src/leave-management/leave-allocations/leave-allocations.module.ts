import { Module } from '@nestjs/common';
import { LeaveAllocationsController } from './leave-allocations.controller';
import { LeaveAllocationsService } from './leave-allocations.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [LeaveAllocationsController],
  providers: [LeaveAllocationsService],
})
export class LeaveAllocationsModule {}