import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { LeaveAllocationsService } from './leave-allocations.service';

@Controller('leave-allocations')
export class LeaveAllocationsController {
  constructor(
    private readonly leaveAllocationsService: LeaveAllocationsService,
  ) {}

  @Post()
  async create(@Body() body: any) {
    const data =
      await this.leaveAllocationsService.create(body);

    return {
      message: 'Leave allocated successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data =
      await this.leaveAllocationsService.findAll();

    return {
      message: 'Leave allocations fetched successfully',
      data,
    };
  }

  @Get(':id')
async findOne(@Param('id') id: string) {
  const data = await this.leaveAllocationsService.findOne(
    Number(id),
  );

  return {
    message: 'Leave allocation fetched successfully',
    data,
  };
}
  @Get('/employee/:id')
  async findByEmployee(@Param('id') id: string) {
    const data =
      await this.leaveAllocationsService.findByEmployee(
        Number(id),
      );

    return {
      message: 'Employee leave allocations fetched successfully',
      data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const data =
      await this.leaveAllocationsService.update(
        Number(id),
        body,
      );

    return {
      message: 'Leave allocation updated successfully',
      data,
    };
  }
}