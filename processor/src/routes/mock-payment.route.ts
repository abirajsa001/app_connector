import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import {
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
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

    if (generatedChecksum === query.checksum) {
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
        return reply.code(400).send({ error: 'createPaymentt failed' });
      }
    } else {
      return reply.code(400).send({ error: 'Checksum verification failed' });
    }
  } else {
    return reply.code(400).send({ error: 'Missing required query parameters' });
  }
});

  fastify.get('/failure', async (request, reply) => {
    return reply.send('Payment failed.');
  });
};
