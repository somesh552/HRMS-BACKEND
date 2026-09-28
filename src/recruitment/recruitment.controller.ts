import { Controller, Get } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';

@Controller('recruitment')
export class RecruitmentController {

    constructor(
        private readonly recruitmentService: RecruitmentService,
    ) { }

    // GET /recruitment/summary
    @Get('summary')
    getRecruitmentSummary() {
        return this.recruitmentService.getRecruitmentSummary();
    }

    // GET /recruitment/dashboard
    @Get('dashboard')
    getRecruitmentDashboard() {
        return this.recruitmentService.getRecruitmentDashboard();
    }

    // GET /recruitment/pipeline
    @Get('pipeline')
    getRecruitmentPipeline() {
        return this.recruitmentService.getRecruitmentPipeline();
    }
}