import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async getPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addPaymentMethod(
    userId: string,
    data: {
      stripePaymentMethodId: string;
      type: string;
      brand?: string;
      last4?: string;
      expiryMonth?: number;
      expiryYear?: number;
      isDefault?: boolean;
    },
  ) {
    // Check max cards limit
    const existingCount = await this.prisma.paymentMethod.count({
      where: { userId },
    });

    if (existingCount >= 5) {
      throw new BadRequestException('Maximum 5 payment methods allowed');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // If first card, make it default
    const isDefault = existingCount === 0 || data.isDefault;

    return this.prisma.paymentMethod.create({
      data: {
        userId,
        stripePaymentMethodId: data.stripePaymentMethodId,
        type: data.type,
        brand: data.brand,
        last4: data.last4,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        isDefault,
      },
    });
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset all defaults
    await this.prisma.paymentMethod.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });
  }

  async deletePaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });

    // If deleted was default, set another as default
    if (paymentMethod.isDefault) {
      const remaining = await this.prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (remaining) {
        await this.prisma.paymentMethod.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  async getPaymentHistory(userId: string, page = 1, limit = 20) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          appointment: {
            include: {
              therapist: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createPayment(data: {
    userId: string;
    appointmentId: string;
    amount: number;
    platformFee: number;
    therapistAmount: number;
    stripePaymentIntentId?: string;
  }) {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        appointmentId: data.appointmentId,
        amount: data.amount,
        platformFee: data.platformFee,
        therapistAmount: data.therapistAmount,
        stripePaymentIntentId: data.stripePaymentIntentId,
        status: 'PENDING',
      },
    });
  }

  async confirmPayment(paymentId: string, stripeChargeId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        stripeChargeId,
        paidAt: new Date(),
      },
    });
  }
}
