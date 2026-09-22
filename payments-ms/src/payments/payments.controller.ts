import { Controller, Post, Body, Get, Req, Headers, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-session')
  createPaymentSession(@Body() createPaymentSessionDto: CreatePaymentSessionDto) {
    return this.paymentsService.createPaymentSession(createPaymentSessionDto);
  }

  @Get('success')
  success() {
    return { ok: true, message: 'Payment successful' };
  }

  @Get('cancel')
  cancel() {
    return { ok: false, message: 'Payment cancelled' };
  }

  @Post('webhook')
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing rawBody or stripe-signature');
    }

    return this.paymentsService.stripeWebhook(rawBody, signature);
  }
}