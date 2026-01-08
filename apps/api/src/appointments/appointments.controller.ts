import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(
    @Request() req: any,
    @Body()
    body: {
      therapistId: string;
      scheduledAt: string;
      duration: number;
      timezone: string;
      bookingNotes?: string;
      amount: number;
    },
  ) {
    return this.appointmentsService.create({
      userId: req.user.id,
      therapistId: body.therapistId,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration,
      timezone: body.timezone,
      bookingNotes: body.bookingNotes,
      amount: body.amount,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get user appointments' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'past'] })
  async findByUser(
    @Request() req: any,
    @Query('status') status?: 'upcoming' | 'past',
  ) {
    return this.appointmentsService.findByUser(req.user.id, status);
  }

  @Get('therapist')
  @ApiOperation({ summary: 'Get therapist appointments' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'past'] })
  async findByTherapist(
    @Request() req: any,
    @Query('status') status?: 'upcoming' | 'past',
  ) {
    // TODO: Get therapistId from user
    return this.appointmentsService.findByTherapist(req.user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findById(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm appointment (therapist only)' })
  async confirm(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.confirm(id, req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.appointmentsService.cancel(id, req.user.id, body.reason);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete appointment (therapist only)' })
  async complete(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { sessionNotes?: string },
  ) {
    return this.appointmentsService.complete(id, req.user.id, body.sessionNotes);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Add review for appointment' })
  async addReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      rating: number;
      feedback?: string;
      tags?: string[];
      isAnonymous?: boolean;
    },
  ) {
    return this.appointmentsService.addReview(id, req.user.id, body);
  }
}
