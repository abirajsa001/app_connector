import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
  CreatePaymentRequestDTO,
} from '../dtos/mock-payment.dto';
import { MockPaymentService } from '../services/mock-payment.service';
import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';

type PaymentRoutesOptions = {
  paymentService: MockPaymentService;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
};

export const paymentRoutes = async (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & PaymentRoutesOptions
) => {
  // POST /payments (normal payment route)
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payments',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: {
          200: PaymentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayment({
        data: request.body,
      });
      return reply.status(200).send(resp);
    }
  );

  // POST /payment (alternate route)
  fastify.post<{ Body: PaymentRequestSchemaDTO; Reply: PaymentResponseSchemaDTO }>(
    '/payment',
    {
      preHandler: [opts.sessionHeaderAuthHook.authenticate()],
      schema: {
        body: PaymentRequestSchema,
        response: {
          200: PaymentResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resp = await opts.paymentService.createPayments({
        data: request.body,
      });
      return reply.status(200).send(resp);
    }
  );

  // GET /success (redirect callback)
  fastify.get('/success', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      tid?: string;
      status?: string;
      checksum?: string;
      txn_secret?: string;
    };

    const accessKey = 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=';

    if (query.tid && query.status && query.checksum && query.txn_secret) {
      const tokenString = `${query.tid}${query.txn_secret}${query.status}${accessKey}`;
      const generatedChecksum = crypto.createHash('sha256').update(tokenString).digest('hex');

      if (generatedChecksum !== query.checksum) {
        try {
          const result = await opts.paymentService.createPaymentt({
            data: {
              interfaceId: query.tid,
              status: query.status,
              source: 'redirect',
            },
          });
          return reply.code(200).send(result);
        } catch (error) {
          return reply.code(400).send({ error: 'Payment creation failed' });
        }
      } else {
        return reply.code(400).send({ error: 'Checksum verification failed' });
      }
    } else {
      return reply.code(400).send({ error: 'Missing required query parameters' });
    }
  });

  // Optional failure route
  fastify.get('/failure', async (request, reply) => {
    return reply.send('Payment failed.');
  });

  // Optional test route for manual Novalnet API testing
  fastify.post('/test', async (request, reply) => {
    // Optional mock call, no schema
    const novalnetPayload = {
      merchant: {
        signature: 'your-signature',
        tariff: '10004',
      },
      customer: {
        billing: {
          city: 'test',
          country_code: 'DE',
          house_no: 'test',
          street: 'test',
          zip: '68662',
        },
        first_name: 'Max',
        last_name: 'Mustermann',
        email: 'your@email.com',
      },
      transaction: {
        test_mode: '1',
        payment_type: 'PREPAYMENT',
        amount: 10,
        currency: 'EUR',
      },
    };

    const response = await fetch('https://payport.novalnet.de/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-NN-Access-Key': accessKey,
      },
      body: JSON.stringify(novalnetPayload),
    });

    const data = await response.json();
    return reply.send(data);
  });
};
