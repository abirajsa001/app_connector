import { SessionHeaderAuthenticationHook } from '@commercetools/connect-payments-sdk';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest} from 'fastify';
import { getCartIdFromContext } from '../libs/fastify/context/context';
import crypto from 'crypto';
import * as Context from '../libs/fastify/context/context';

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
  	  billing : {
    		city          : 'test',
    		country_code  : 'DE',
    		house_no      : 'test',
    		street        : 'test',
    		zip           : '68662',
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
      const resp = await opts.paymentService.createPayments({
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
      const resp = await opts.paymentService.createPayment({
        data: request.body,
      });

      return reply.status(200).send(resp);

    },
  );
    fastify.get('/failure', async (request, reply) => {
    return reply.send('Payment was successful.');
  });

    fastify.post('/v13', async (request, reply) => {
	  const novalnetPayload = {
    merchant: {
      signature: '7ibc7ob5|tuJEH3gNbeWJfIHah||nbobljbnmdli0poys|doU3HJVoym7MQ44qf7cpn7pc',
      tariff: '10004',
    },
    customer: {
  	  billing : {
    		city          : 'test',
    		country_code  : 'DE',
    		house_no      : 'test',
    		street        : 'test',
    		zip           : '68662',
  	  },
      first_name: 'Max',
      last_name: 'Mustermann',
      email: 'abiraj_s@novalnetsolutions.com',
    },
    transaction: {
      test_mode: '1',
      amount: 10,
      currency: 'EUR',
    },
	hosted_page: {
		type:'PAYMENTFORM',
	},
  };

  const novalnetResponse = await fetch('https://payport.novalnet.de/v2/seamless/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-NN-Access-Key': 'YTg3ZmY2NzlhMmYzZTcxZDkxODFhNjdiNzU0MjEyMmM=',
    },
    body: JSON.stringify(novalnetPayload),
  });	
    return reply.send(novalnetResponse);
  });

  fastify.get('/success', async (request, reply) => {
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
            status: Context.getCartIdFromContext(),
            source: Context.getCartIdFromContext(),
          },
        });
	 const thirdPartyUrl = 'https://poc-novalnetpayments.frontend.site/en/thank-you/?orderId=c52dc5f2-f1ad-4e9c-9dc7-e60bf80d4a52';
	 // return reply.redirect(302, thirdPartyUrl);
	 return reply.code(302).redirect(thirdPartyUrl);

	 // return reply.code(400).send(result);
      } catch (error) {
    	 return reply.code(400).send('Catch error failed');
      }
    } else {
      return reply.code(400).send('Checksum verification failed.');
    }
  } else {
    return reply.code(400).send('Missing required query parameters.');
  }
});


fastify.get<{ 
  Querystring: PaymentRequestSchemaDTO; 
  Reply: PaymentResponseSchemaDTO 
}>(
  '/payments',
  {
    preHandler: [opts.sessionHeaderAuthHook.authenticate()],
    schema: {
      querystring: PaymentRequestSchema, 
      response: {
        200: PaymentResponseSchema,
      },
    },
  },
  async (request, reply) => {
    const resp = await opts.paymentService.createPayment({
      data: request.query,
    });
    const thirdPartyUrl = 'https://poc-novalnetpayments.frontend.site/en/thank-you/?orderId=c52dc5f2-f1ad-4e9c-9dc7-e60bf80d4a52';
    // return reply.redirect(302, thirdPartyUrl);
    return reply.code(302).redirect(thirdPartyUrl);
    // return reply.status(200).send(resp);
  }
);
	
};


