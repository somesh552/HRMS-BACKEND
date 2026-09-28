import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // ===========================
  // CREATE EMPLOYEE ACCOUNT
  // ===========================

  @Post('create-account')
  async createAccount(
    @Body()
    body: {
      employeeId: number;
      email: string;
    },
  ) {
    return this.authService.createEmployeeAccount(
      body.employeeId,
      body.email,
    );
  }

  // ===========================
  // EMPLOYEE LOGIN
  // ===========================

  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    return this.authService.login(
      body.email,
      body.password,
    );
  }
}