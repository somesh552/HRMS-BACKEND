import {
    Body,
    Controller,
    Post,
    Get,
    Put,
    Param,
    Delete,
} from '@nestjs/common';

import { LeaveApplicationsService } from './leave-applications.service';

@Controller('leave-applications')
export class LeaveApplicationsController {
    constructor(
        private readonly leaveApplicationsService: LeaveApplicationsService,
    ) { }

    @Post()
    async create(@Body() body: any) {
        const data =
            await this.leaveApplicationsService.create(body);

        return {
            message: 'Leave application created successfully',
            data,
        };
    }
    @Get()
    async findAll() {
        const data =
            await this.leaveApplicationsService.findAll();

        return {
            message: 'Leave applications fetched successfully',
            data,
        };
    }
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const data =
            await this.leaveApplicationsService.findOne(
                Number(id),
            );

        return {
            message: 'Leave application fetched successfully',
            data,
        };
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() body: any,
    ) {
        const data =
            await this.leaveApplicationsService.update(
                Number(id),
                body,
            );

        return {
            message: 'Leave application updated successfully',
            data,
        };
    }

    @Put(':id/approve')
    async approve(
        @Param('id') id: string,
        @Body() body: any,
    ) {
        const applicationId = Number(id);
        const hrApprovedBy = Number(body.hr_approved_by);

        if (isNaN(applicationId)) {
            throw new Error('Invalid leave application ID');
        }

        if (isNaN(hrApprovedBy)) {
            throw new Error('hr_approved_by is required and must be a valid number');
        }

        const result =
            await this.leaveApplicationsService.approve(
                applicationId,
                hrApprovedBy,
            );

        return {
            message: 'Leave application approved by HR successfully',
            data: result,
        };
    }
    @Put(':id/reject')
    async reject(
        @Param('id') id: string,
        @Body() body: any,
    ) {
        const applicationId = Number(id);
        const hrRejectedBy = Number(body.hr_rejected_by);

        if (isNaN(applicationId)) {
            throw new Error('Invalid leave application ID');
        }

        if (isNaN(hrRejectedBy)) {
            throw new Error(
                'hr_rejected_by is required and must be a valid number',
            );
        }

        const data =
            await this.leaveApplicationsService.reject(
                applicationId,
                hrRejectedBy,
            );

        return {
            message: 'Leave application rejected by HR successfully',
            data,
        };
    }
    @Put(':id/cancel')
    async cancel(@Param('id') id: string) {
        const data = await this.leaveApplicationsService.cancel(
            Number(id),
        );

        return {
            message: 'Leave application cancelled successfully',
            data,
        };
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        const data = await this.leaveApplicationsService.delete(
            Number(id),
        );

        return {
            message: 'Draft leave application deleted successfully',
            data,
        };
    }


}