import { Module } from '@nestjs/common';
import { LeaveApplicationsController } from './leave-applications.controller';
import { LeaveApplicationsService } from './leave-applications.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [LeaveApplicationsController],
  providers: [LeaveApplicationsService],
})
export class LeaveApplicationsModule {}