import { Module } from '@nestjs/common';
import { HolidayListsController } from './holiday-lists.controller';
import { HolidayListsService } from './holiday-lists.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [HolidayListsController],
  providers: [HolidayListsService],
})
export class HolidayListsModule {}