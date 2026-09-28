import { Module } from '@nestjs/common';
import { InterviewFeedbackController } from './interview-feedback.controller';
import { InterviewFeedbackService } from './interview-feedback.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [InterviewFeedbackController],
  providers: [InterviewFeedbackService],
})
export class InterviewFeedbackModule {}
