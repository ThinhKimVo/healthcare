import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, AppointmentType, Prisma } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.appointment.create({
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
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
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

  async confirm(id: string, therapistId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.therapistId !== therapistId) {
      throw new ForbiddenException('Not authorized');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Appointment cannot be confirmed');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
  }

  async cancel(
    id: string,
    userId: string,
    reason: string,
    isTherapist = false,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify ownership
    if (!isTherapist && appointment.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (isTherapist && appointment.therapistId !== userId) {
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

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });
  }

  async complete(id: string, therapistId: string, sessionNotes?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.therapistId !== therapistId) {
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
