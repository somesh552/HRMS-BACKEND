import { Module } from '@nestjs/common';

import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

import { DbModule } from '../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    DbModule,
    AuthModule,
    MailModule,
  ],
  controllers: [
    EmployeeController,
    DocumentController,
  ],
  providers: [
    EmployeeService,
    DocumentService,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}