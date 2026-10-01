import { Module } from '@nestjs/common';
import { LeaveLedgerController } from './leave-ledger.controller';
import { LeaveLedgerService } from './leave-ledger.service';
import { DbModule } from '../../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [LeaveLedgerController],
  providers: [LeaveLedgerService],
})
export class LeaveLedgerModule {}