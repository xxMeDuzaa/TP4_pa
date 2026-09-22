import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor() {
    const stripeSecret = process.env.STRIPE_SECRET;
    if (!stripeSecret) {
      this.logger.warn('STRIPE_SECRET no está configurado en las variables de entorno');
    }
    this.stripe = new Stripe(stripeSecret || 'sk_test_placeholder');
  }

  async createPaymentSession(dto: CreatePaymentSessionDto) {
    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      throw new BadRequestException('STRIPE_SUCCESS_URL o STRIPE_CANCEL_URL no están configurados');
    }

    // Mapear los ítems al formato que espera Stripe (precios en centavos)
    const line_items = dto.items.map((item) => ({
      price_data: {
        currency: dto.currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Conversión a centavos obligatoria
      },
      quantity: item.quantity,
    }));

    // Crear la Checkout Session en Stripe con metadata en el payment_intent_data
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        metadata: {
          orderId: dto.orderId,
        },
      },
    });

    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url,
      id: session.id,
    };
  }

  // Manejo del Webhook
  async stripeWebhook(rawBody: Buffer, sig: string) {
    const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
    if (!endpointSecret) {
      throw new BadRequestException('STRIPE_ENDPOINT_SECRET no está configurado');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Webhook Error: ${message}`);
    }

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      
      let orderId = charge.metadata?.orderId;
      if (!orderId && charge.payment_intent) {
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent.id;
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        orderId = paymentIntent.metadata?.orderId;
      }

      this.logger.log(`[Webhook] ¡Pago exitoso (charge.succeeded)! orderId: ${orderId ?? 'Sin orderId'}`);
    } else {
      this.logger.log(`[Webhook] Evento no manejado: ${event.type}`);
    }

    return { received: true };
  }
}