import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DbService } from '../db/db.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, DbService],
  exports: [AuthService],
})
export class AuthModule {}