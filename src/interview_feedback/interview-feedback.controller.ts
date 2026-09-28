import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { InterviewFeedbackService } from './interview-feedback.service';

@Controller()
export class InterviewFeedbackController {

  constructor(
    private readonly interviewFeedbackService: InterviewFeedbackService,
  ) {}

  // POST /interviews/:id/feedback
  @Post('interviews/:id/feedback')
  createFeedback(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.interviewFeedbackService.createFeedback(id, data);
  }

  // GET /interviews/:id/feedback
  @Get('interviews/:id/feedback')
  getFeedback(@Param('id') id: string) {
    return this.interviewFeedbackService.getFeedback(id);
  }

  // PUT /interview-feedback/:id
  @Put('interview-feedback/:id')
  updateFeedback(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.interviewFeedbackService.updateFeedback(id, data);
  }
}