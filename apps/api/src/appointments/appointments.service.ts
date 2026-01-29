import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentStatus, AppointmentType, Prisma } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: {
    userId: string;
    therapistId: string;
    scheduledAt: Date;
    duration: number;
    timezone: string;
    type?: AppointmentType;
    bookingNotes?: string;
    amount: number;
  }) {
    // Verify therapist exists and is available
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: data.therapistId },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Check for conflicting appointments
    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        therapistId: data.therapistId,
        scheduledAt: data.scheduledAt,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (conflicting) {
      throw new BadRequestException('Time slot is not available');
    }

    // Get patient info for notification
    const patient = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { firstName: true, lastName: true },
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        userId: data.userId,
        therapistId: data.therapistId,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        timezone: data.timezone,
        type: data.type || AppointmentType.SCHEDULED,
        bookingNotes: data.bookingNotes,
        amount: data.amount,
        status: AppointmentStatus.PENDING,
      },
      include: {
        therapist: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Notify therapist of new booking request
    const patientName = `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'A patient';
    const dateTime = this.formatDateTime(data.scheduledAt, data.timezone);

    await this.notificationsService.sendBookingRequest(
      appointment.therapist.user.id,
      appointment.id,
      patientName,
      dateTime,
    );

    return appointment;
  }

  private formatDateTime(date: Date, timezone: string): string {
    try {
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  async findByUser(userId: string, status?: 'upcoming' | 'past') {
    const where: Prisma.AppointmentWhereInput = { userId };

    if (status === 'upcoming') {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['PENDING', 'CONFIRMED'] };
    } else if (status === 'past') {
      where.OR = [
        { scheduledAt: { lt: new Date() } },
        { status: { in: ['COMPLETED', 'CANCELLED'] } },
      ];
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        therapist: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        review: true,
      },
      orderBy: { scheduledAt: status === 'past' ? 'desc' : 'asc' },
    });
  }

  async findByTherapist(therapistId: string, status?: 'upcoming' | 'past') {
    const where: Prisma.AppointmentWhereInput = { therapistId };

    if (status === 'upcoming') {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['PENDING', 'CONFIRMED'] };
    } else if (status === 'past') {
      where.OR = [
        { scheduledAt: { lt: new Date() } },
        { status: { in: ['COMPLETED', 'CANCELLED'] } },
      ];
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        review: true,
      },
      orderBy: { scheduledAt: status === 'past' ? 'desc' : 'asc' },
    });
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
          },
        },
        therapist: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        payment: true,
        review: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async confirm(id: string, userId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        therapist: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if the user is the therapist for this appointment
    if (appointment.therapist.user.id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Appointment cannot be confirmed');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });

    // Notify patient of confirmed booking
    const therapistName = `Dr. ${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`.trim();
    const dateTime = this.formatDateTime(appointment.scheduledAt, appointment.timezone);

    await this.notificationsService.sendBookingConfirmation(
      appointment.userId,
      appointment.id,
      therapistName,
      dateTime,
    );

    return updatedAppointment;
  }

  async decline(id: string, userId: string, reason?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        therapist: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if the user is the therapist for this appointment
    if (appointment.therapist.user.id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be declined');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason || 'Declined by therapist',
        cancelledAt: new Date(),
      },
    });

    // Notify patient of declined booking
    const therapistName = `Dr. ${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`.trim();

    await this.notificationsService.sendBookingDeclined(
      appointment.userId,
      appointment.id,
      therapistName,
      reason,
    );

    return updatedAppointment;
  }

  async cancel(
    id: string,
    userId: string,
    reason: string,
    isTherapist = false,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        therapist: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify ownership
    if (!isTherapist && appointment.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (isTherapist && appointment.therapist.user.id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException('Appointment cannot be cancelled');
    }

    // Calculate refund based on cancellation policy
    const hoursUntilAppointment =
      (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (hoursUntilAppointment > 24) {
      refundPercentage = 100;
    } else if (hoursUntilAppointment > 2) {
      refundPercentage = 50;
    }
    // Less than 2 hours: case by case (handled by admin)

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    // Notify the other party of cancellation
    const dateTime = this.formatDateTime(appointment.scheduledAt, appointment.timezone);

    if (isTherapist) {
      // Therapist cancelled, notify patient
      const therapistName = `Dr. ${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`.trim();
      await this.notificationsService.sendAppointmentCancelled(
        appointment.userId,
        appointment.id,
        therapistName,
        dateTime,
        reason,
      );
    } else {
      // Patient cancelled, notify therapist
      const patientName = `${appointment.user.firstName} ${appointment.user.lastName}`.trim();
      await this.notificationsService.sendAppointmentCancelled(
        appointment.therapist.user.id,
        appointment.id,
        patientName,
        dateTime,
        reason,
      );
    }

    return updatedAppointment;
  }

  async complete(id: string, userId: string, sessionNotes?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        therapist: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.therapist.user.id !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
        sessionNotes,
      },
    });
  }

  async addReview(
    appointmentId: string,
    userId: string,
    data: {
      rating: number;
      feedback?: string;
      tags?: string[];
      isAnonymous?: boolean;
    },
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed appointments');
    }

    // Create review and update therapist stats
    const review = await this.prisma.review.create({
      data: {
        userId,
        therapistId: appointment.therapistId,
        appointmentId,
        rating: data.rating,
        feedback: data.feedback,
        tags: data.tags || [],
        isAnonymous: data.isAnonymous || false,
      },
    });

    // Update therapist average rating
    const stats = await this.prisma.review.aggregate({
      where: { therapistId: appointment.therapistId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.therapist.update({
      where: { id: appointment.therapistId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });

    return review;
  }
}
