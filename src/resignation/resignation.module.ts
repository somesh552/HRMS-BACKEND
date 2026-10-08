import { Module } from '@nestjs/common';

import { ResignationController } from './resignation.controller';
import { ResignationService } from './resignation.service';

import { DbModule } from '../db/db.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    DbModule,
    MailModule,
  ],

  controllers: [
    ResignationController,
  ],

  providers: [
    ResignationService,
  ],

  exports: [
    ResignationService,
  ],
})
export class ResignationModule {}