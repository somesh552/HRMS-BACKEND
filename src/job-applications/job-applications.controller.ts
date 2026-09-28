import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { JobApplicationsService } from './job-applications.service';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) { }

  @Post()
  createApplication(@Body() data: any) {
    return this.jobApplicationsService.createApplication(data);
  }

  // Step 3I.1 - PDF Resume Upload
  @Post(':id/resume')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: diskStorage({
        destination: './uploads/resumes',

        filename: (req, file, callback) => {
          const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
            extname(file.originalname);

          callback(null, uniqueName);
        },
      }),

      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new Error('Only PDF files are allowed'),
            false,
          );
        }

        callback(null, true);
      },

      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadResume(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.jobApplicationsService.uploadResume(id, file);
  }

  @Get()
  getAllApplications() {
    return this.jobApplicationsService.getAllApplications();
  }

  @Get(':id')
  getApplicationById(@Param('id') id: string) {
    return this.jobApplicationsService.getApplicationById(id);
  }

  @Put(':id')
  updateApplication(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.jobApplicationsService.updateApplication(id, data);
  }


  @Delete(':id')
  deleteApplication(@Param('id') id: string) {
    return this.jobApplicationsService.deleteApplication(id);
  }

  @Put(':id/status')
  updateApplicationStatus(
    @Param('id') id: string,
    @Body() data: { status: string },
  ) {
    return this.jobApplicationsService.updateApplicationStatus(
      id,
      data.status,
    );
  }

  @Post(':id/ats')
  calculateATS(@Param('id') id: string) {
    return this.jobApplicationsService.calculateATS(id);
  }

  @Post(':id/schedule-exam')
  scheduleExam(
    @Param('id') id: string,
    @Body()
    data: {
      exam_date: string;
      exam_time: string;
    },
  ) {
    return this.jobApplicationsService.scheduleExam(
      id,
      data.exam_date,
      data.exam_time,
    );
  }

}