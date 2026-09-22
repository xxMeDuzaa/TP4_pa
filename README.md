# Microservicio de Pagos (NestJS + Stripe)

Trabajo Práctico: Sesiones de pago y webhook Stripe  
Programación Avanzada - 2026 - FCyT
Alumna: Mas Duarte Melina

Microservicio HTTP para crear sesiones de pago con Stripe Checkout y recibir notificaciones de cobro exitoso mediante webhooks.

---

## 1. Configuración del entorno

Dentro del directorio `payments-ms`, copiar la plantilla de variables de entorno y completar los valores:

```bash
cd payments-ms
cp .env.template .env
```

Variables requeridas en `.env`:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de escucha | `3003` |
| `STRIPE_SECRET` | Clave secreta de Stripe (modo test) | `sk_test_...` |
| `STRIPE_SUCCESS_URL` | Redirección en pago exitoso | `http://localhost:3003/payments/success` |
| `STRIPE_CANCEL_URL` | Redirección en pago cancelado | `http://localhost:3003/payments/cancel` |
| `STRIPE_ENDPOINT_SECRET` | Secreto de firma del webhook (`whsec_...`) | Obtenido con Stripe CLI |

El servicio valida estas variables al iniciar (fail-fast). Si alguna falta, el proceso se interrumpe con un mensaje explicativo.

---

## 2. Instalación y ejecución

```bash
cd payments-ms

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run start:dev

# Compilar para producción
npm run build

# Ejecutar tests
npm run test
```

---

## 3. Rutas del microservicio

### A. Crear sesión de pago (`POST /payments/create-payment-session`)
Crea una Checkout Session en Stripe (`mode: payment`) e inyecta `orderId` en la metadata del PaymentIntent.

- **Request Body (JSON)**:
```json
{
  "orderId": "ord-1",
  "currency": "usd",
  "items": [
    { "name": "Producto de prueba", "price": 20, "quantity": 1 }
  ]
}
```

- **Validaciones**:
  - `orderId`: String obligatorio.
  - `currency`: String obligatorio (ej. `usd`).
  - `items`: Arreglo con al menos 1 ítem.
  - `items[].price`: Número positivo (se convierte a centavos con `Math.round(price * 100)`).
  - Campos extra no permitidos (`forbidNonWhitelisted: true`).

- **Respuesta (`201 Created`)**:
```json
{
  "cancelUrl": "http://localhost:3003/payments/cancel",
  "successUrl": "http://localhost:3003/payments/success",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "id": "cs_test_..."
}
```

### B. Rutas de redirección de soporte
- `GET /payments/success`: `{ "ok": true, "message": "Payment successful" }`
- `GET /payments/cancel`: `{ "ok": false, "message": "Payment cancelled" }`

### C. Webhook de Stripe (`POST /payments/webhook`)
Recibe eventos de Stripe, valida la firma criptográfica usando `rawBody` y registra los pagos.

- **Header obligatorio**: `stripe-signature`
- **Comportamiento**:
  - Firma no válida: Responde `400 Bad Request`.
  - Evento `charge.succeeded`: Extrae el `orderId` de `metadata` del PaymentIntent y lo registra en consola. Responde `200 OK`.
  - Otros eventos: Log de "no manejado" y responde `200 OK` para evitar reintentos de Stripe.

---

## 4. Pruebas en local con Stripe CLI

1. Iniciar sesión en Stripe CLI:
```bash
stripe login
```

2. Reenviar eventos al endpoint local:
```bash
stripe listen --forward-to localhost:3003/payments/webhook --all-snapshot
```

3. Copiar el secreto impreso en consola (`whsec_...`) en la variable `STRIPE_ENDPOINT_SECRET` de `.env`.

4. Realizar una petición a `POST /payments/create-payment-session`, ingresar a la `url` generada y completar el pago con una tarjeta de prueba de Stripe.

5. Verificar en la consola del microservicio el log de `charge.succeeded` con el `orderId`.
