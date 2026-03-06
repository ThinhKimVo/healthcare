import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [NotificationsModule, RemindersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
