import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { LeaveTypesService } from './leave-types.service';

@Controller('leave-types')
export class LeaveTypesController {
  constructor(
    private readonly leaveTypesService: LeaveTypesService,
  ) {}

  @Post()
  async create(@Body() body: any) {
    const data = await this.leaveTypesService.create(body);

    return {
      message: 'Leave type created successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.leaveTypesService.findAll();

    return {
      message: 'Leave types fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.leaveTypesService.findOne(Number(id));

    return {
      message: 'Leave type fetched successfully',
      data,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const data = await this.leaveTypesService.update(
      Number(id),
      body,
    );

    return {
      message: 'Leave type updated successfully',
      data,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.leaveTypesService.remove(Number(id));

    return {
      message: 'Leave type deleted successfully',
      data,
    };
  }
}