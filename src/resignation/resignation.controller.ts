import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { ResignationService } from './resignation.service';

@Controller('resignations')
export class ResignationController {
  constructor(
    private readonly resignationService: ResignationService,
  ) {}

  // CREATE RESIGNATION
  @Post()
  create(@Body() body: any) {
    return this.resignationService.createResignation(
      Number(body.employeeId),
      body.resignationDate,
      body.reason,
      body.hrEmail,
    );
  }

  // GET ALL
  @Get()
  findAll() {
    return this.resignationService.findAll();
  }

  // GET BY ID
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.resignationService.findOne(id);
  }
}