import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { HolidayListsService } from './holiday-lists.service';

@Controller('holiday-lists')
export class HolidayListsController {
  constructor(
    private readonly holidayListsService: HolidayListsService,
  ) {}

  @Post()
  async createList(@Body() body: any) {
    const data =
      await this.holidayListsService.createList(body);

    return {
      message: 'Holiday list created successfully',
      data,
    };
  }

  @Get()
  async getLists() {
    const data =
      await this.holidayListsService.getLists();

    return {
      message: 'Holiday lists fetched successfully',
      data,
    };
  }

  @Post(':id/holidays')
  async addHoliday(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const data =
      await this.holidayListsService.addHoliday(
        Number(id),
        body,
      );

    return {
      message: 'Holiday added successfully',
      data,
    };
  }

  @Get(':id/holidays')
  async getHolidays(
    @Param('id') id: string,
  ) {
    const data =
      await this.holidayListsService.getHolidays(
        Number(id),
      );

    return {
      message: 'Holidays fetched successfully',
      data,
    };
  }

  @Delete(':id/holidays/:hid')
  async deleteHoliday(
    @Param('id') id: string,
    @Param('hid') hid: string,
  ) {
    const data =
      await this.holidayListsService.deleteHoliday(
        Number(id),
        Number(hid),
      );

    return {
      message: 'Holiday deleted successfully',
      data,
    };
  }
}