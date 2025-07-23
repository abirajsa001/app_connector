import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest} from 'fastify';
import crypto from 'crypto';

import {
  PaymentRequestSchema,
  PaymentRequestSchemaDTO,
  PaymentResponseSchema,
  PaymentResponseSchemaDTO,
} from '../dtos/mock-payment.dto';
import { MockPaymentService } from '../services/mock-payment.service';
import { log } from '../libs/logger';
type PaymentRoutesOptions = {
  paymentService: MockPaymentService;
  sessionHeaderAuthHook: SessionHeaderAuthenticationHook;
};
console.log('before-payment-routes');
log.info('before-payment-routes');
export const paymentRoutes = async (fastify: FastifyInstance, opts: FastifyPluginOptions & PaymentRoutesOptions) => {

fastify.post('/test', async (request, reply) => {
  console.log("Received payment request in processor");
    // Call Novalnet API server-side (no CORS issue)
  const novalnetPayload = {
    merchant: {
      signature: '7ibc7ob5|tuJEH3gNbeWJfIHah||nbobljbnmdli0poys|doU3HJVoym7MQ44qf7cpn7pc',
      tariff: '10004',
    },
    customer: {
  	  billing: {
    		city         : 'test',
    		country_code : 'DE',
    		house_no     : 'test',
    		street       : 'test',
    		zip          : '68662',
  	  },
      first_name: 'Max',
      last_name: 'Mustermann',
      email: 'abiraj_s@novalnetsolutions.com',
    },
    transaction: {
      test_mode: '1',
      payment_type: 'PREPAYMENT',
      amount: 10,
      currency: 'EUR',
    },
    custom: {
	    input1: 'request',
	    inputval1: String(request ?? 'empty'),
	    input2: 'reply',
	    inputval2: String(reply ?? 'empty'),
	  }
  };

  const novalnetResponse = await fetch('https://payport.novalnet.de/v2/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
    },
    body: JSON.stringify(novalnetPayload),
  });
console.log('handle-novalnetResponse');
    console.log(novalnetResponse);

});

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

    },
  );

fastify.get<{Querystring: { paymentId: string }; Reply: PaymentResponseSchemaDTO }>(
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

    },
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

    },
  );
    fastify.get('/failure', async (request, reply) => {
    return reply.send('Payment was successful.');
  });

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
	return reply.code(400).send('redirect-verifed');
    } else {
      return reply.code(400).send('Checksum-verification-failed.');
    }
  } else {
    return reply.code(400).send('Missing required query parameters.');
  }
});

};


