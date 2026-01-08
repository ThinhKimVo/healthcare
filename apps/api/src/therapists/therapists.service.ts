import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TherapistVerificationStatus, Prisma } from '@prisma/client';

@Injectable()
export class TherapistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    specialization?: string;
    language?: string;
    minRating?: number;
    maxPrice?: number;
    isOnline?: boolean;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      specialization,
      language,
      minRating,
      maxPrice,
      isOnline,
    } = options;

    const where: Prisma.TherapistWhereInput = {
      verificationStatus: TherapistVerificationStatus.APPROVED,
      user: { status: 'ACTIVE' },
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { professionalTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (specialization) {
      where.specializations = {
        some: { specialization: { name: specialization } },
      };
    }

    if (language) {
      where.languages = {
        some: { language },
      };
    }

    if (minRating) {
      where.averageRating = { gte: minRating };
    }

    if (maxPrice) {
      where.hourlyRate = { lte: maxPrice };
    }

    if (isOnline !== undefined) {
      where.isOnline = isOnline;
    }

    const [therapists, total] = await Promise.all([
      this.prisma.therapist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          languages: true,
          specializations: {
            include: { specialization: true },
          },
        },
        orderBy: [{ isOnline: 'desc' }, { averageRating: 'desc' }],
      }),
      this.prisma.therapist.count({ where }),
    ]);

    return {
      data: therapists,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            bio: true,
          },
        },
        languages: true,
        specializations: {
          include: { specialization: true },
        },
        licenses: {
          where: { verified: true },
        },
        availabilities: {
          where: { isActive: true },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    return therapist;
  }

  async getAvailableSlots(therapistId: string, date: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
      include: {
        availabilities: { where: { isActive: true } },
        blockedSlots: true,
        appointments: {
          where: {
            scheduledAt: {
              gte: new Date(date),
              lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }

    // Calculate available slots based on availabilities, blocked slots, and existing appointments
    const dayOfWeek = new Date(date).getDay();
    const dayAvailability = therapist.availabilities.filter(
      (a) => a.dayOfWeek === dayOfWeek,
    );

    // Return available time slots
    return {
      date,
      slots: dayAvailability.map((a) => ({
        startTime: a.startTime,
        endTime: a.endTime,
      })),
      bookedSlots: therapist.appointments.map((a) => ({
        time: a.scheduledAt,
        duration: a.duration,
      })),
    };
  }

  async updateOnlineStatus(therapistId: string, isOnline: boolean) {
    return this.prisma.therapist.update({
      where: { id: therapistId },
      data: { isOnline },
    });
  }

  async getReviews(therapistId: string, page = 1, limit = 10) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { therapistId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where: { therapistId } }),
    ]);

    return {
      data: reviews.map((r) => ({
        ...r,
        user: r.isAnonymous ? null : r.user,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
