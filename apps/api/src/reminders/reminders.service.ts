import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Runs every minute. Finds due reminders, sends notifications, marks as sent.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders() {
    const now = new Date();

    const dueReminders = await this.prisma.appointmentReminder.findMany({
      where: {
        sentAt: null,
        scheduledFor: { lte: now },
      },
      include: {
        appointment: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, timezone: true } },
            therapist: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (dueReminders.length === 0) return;

    this.logger.log(`Processing ${dueReminders.length} due reminder(s)`);

    for (const reminder of dueReminders) {
      const { appointment } = reminder;

      // Skip if appointment is no longer active
      if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
        await this.prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { sentAt: now },
        });
        continue;
      }

      const therapistName = `Dr. ${appointment.therapist.user.firstName} ${appointment.therapist.user.lastName}`.trim();
      const dateTime = this.formatDateTime(appointment.scheduledAt, appointment.timezone);

      try {
        await this.sendReminderNotification({
          userId: appointment.userId,
          therapistUserId: appointment.therapist.user.id,
          appointmentId: appointment.id,
          reminderType: reminder.reminderType as '24H' | '1H' | '15MIN',
          therapistName,
          patientName: `${appointment.user.firstName} ${appointment.user.lastName}`.trim(),
          dateTime,
          scheduledAt: appointment.scheduledAt,
        });

        await this.prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { sentAt: now },
        });
      } catch (err) {
        this.logger.error(`Failed to send reminder ${reminder.id}: ${err?.message}`);
      }
    }
  }

  private async sendReminderNotification(params: {
    userId: string;
    therapistUserId: string;
    appointmentId: string;
    reminderType: '24H' | '1H' | '15MIN';
    therapistName: string;
    patientName: string;
    dateTime: string;
    scheduledAt: Date;
  }) {
    const { userId, therapistUserId, appointmentId, reminderType, therapistName, patientName, dateTime } = params;

    switch (reminderType) {
      case '24H':
        await this.notificationsService.sendReminder24H(userId, appointmentId, therapistName, dateTime);
        await this.notificationsService.sendTherapistReminder24H(therapistUserId, appointmentId, patientName, dateTime);
        break;

      case '1H':
        await this.notificationsService.sendReminder1H(userId, appointmentId, therapistName);
        await this.notificationsService.sendTherapistReminder1H(therapistUserId, appointmentId, patientName);
        break;

      case '15MIN':
        await this.notificationsService.sendReminder15Min(userId, appointmentId, therapistName);
        await this.notificationsService.sendTherapistReminder15Min(therapistUserId, appointmentId, patientName);
        break;
    }
  }

  /**
   * Creates reminder records for a newly confirmed appointment.
   * Called from AppointmentsService when an appointment is confirmed.
   */
  async createRemindersForAppointment(appointmentId: string, scheduledAt: Date) {
    const now = new Date();

    const reminderOffsets: { type: string; minutesBefore: number }[] = [
      { type: '24H', minutesBefore: 24 * 60 },
      { type: '1H', minutesBefore: 60 },
      { type: '15MIN', minutesBefore: 15 },
    ];

    const records = reminderOffsets
      .map(({ type, minutesBefore }) => ({
        appointmentId,
        reminderType: type,
        scheduledFor: new Date(scheduledAt.getTime() - minutesBefore * 60 * 1000),
      }))
      .filter((r) => r.scheduledFor > now); // only future reminders

    if (records.length === 0) return;

    await this.prisma.appointmentReminder.createMany({
      data: records,
      skipDuplicates: true,
    });

    this.logger.log(`Created ${records.length} reminder(s) for appointment ${appointmentId}`);
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
}
