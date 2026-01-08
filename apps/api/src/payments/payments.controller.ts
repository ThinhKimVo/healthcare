import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('methods')
  @ApiOperation({ summary: 'Get saved payment methods' })
  async getPaymentMethods(@Request() req: any) {
    return this.paymentsService.getPaymentMethods(req.user.id);
  }

  @Post('methods')
  @ApiOperation({ summary: 'Add a new payment method' })
  async addPaymentMethod(
    @Request() req: any,
    @Body()
    body: {
      stripePaymentMethodId: string;
      type: string;
      brand?: string;
      last4?: string;
      expiryMonth?: number;
      expiryYear?: number;
      isDefault?: boolean;
    },
  ) {
    return this.paymentsService.addPaymentMethod(req.user.id, body);
  }

  @Patch('methods/:id/default')
  @ApiOperation({ summary: 'Set payment method as default' })
  async setDefault(@Request() req: any, @Param('id') id: string) {
    return this.paymentsService.setDefaultPaymentMethod(req.user.id, id);
  }

  @Delete('methods/:id')
  @ApiOperation({ summary: 'Delete a payment method' })
  async deletePaymentMethod(@Request() req: any, @Param('id') id: string) {
    return this.paymentsService.deletePaymentMethod(req.user.id, id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history' })
  async getPaymentHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.getPaymentHistory(
      req.user.id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }
}
