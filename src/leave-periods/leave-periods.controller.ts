import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { LeavePeriodsService } from './leave-periods.service';

@Controller('leave-periods')
export class LeavePeriodsController {
  constructor(
    private readonly leavePeriodsService: LeavePeriodsService,
  ) {}

  @Post()
  async create(@Body() body: any) {
    const data = await this.leavePeriodsService.create(body);

    return {
      message: 'Leave period created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.leavePeriodsService.findAll();

    return {
      message: 'Leave periods fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.leavePeriodsService.findOne(
      Number(id),
    );

    return {
      message: 'Leave period fetched successfully',
      data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const data = await this.leavePeriodsService.update(
      Number(id),
      body,
    );

    return {
      message: 'Leave period updated successfully',
      data,
    };
  }
}