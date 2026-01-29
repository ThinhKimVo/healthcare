import { Module } from '@nestjs/common';
import { TherapistsService } from './therapists.service';
import { TherapistsController } from './therapists.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TherapistsController],
  providers: [TherapistsService],
  exports: [TherapistsService],
})
export class TherapistsModule {}
