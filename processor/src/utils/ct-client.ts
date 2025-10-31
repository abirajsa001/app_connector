import { ClientBuilder } from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

// //~ const projectKey = process.env.CTP_PROJECT_KEY!;
// //~ const clientId = process.env.CTP_CLIENT_ID!;
// //~ const clientSecret = process.env.CTP_CLIENT_SECRET!;
// //~ const authUrl = process.env.CTP_AUTH_URL!;
// //~ const apiUrl = process.env.CTP_API_URL!;


const projectKey = 'newprojectkey';
const authUrl = 'https://auth.europe-west1.gcp.commercetools.com';
const apiUrl = 'https://api.europe-west1.gcp.commercetools.com';
const clientId = 'PvpIwckG4tM69ATbESCg362e';
const clientSecret = 'hLSoCgHZu7er7zNVhnqTWgFsTuJllBXL';

export function getApiRoot() {
  const client = new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: authUrl,
      projectKey,
      credentials: { clientId, clientSecret },
      fetch, // global fetch in Node 18+
    })
    .withHttpMiddleware({ host: apiUrl, fetch })
    .build();

  // Must scope API to project key to access resources like orders()
  return createApiBuilderFromCtpClient(client).withProjectKey({ projectKey });
}







// export function getApiRoot() {
//   return {
//     orders: () => ({
//       withOrderNumber: ({ orderNumber }: { orderNumber: string }) => ({
//         get: () => ({
//           execute: async () => {
//             console.log(`Mock fetching order for orderNumber: ${orderNumber}`);
//             // Simulate an API response
//             return {
//               body: {
//                 id: 'mock-order-id-123',
//                 orderNumber,
//                 status: 'Mocked',
//               },
//             };
//           },
//         }),
//       }),
//     }),
//   };
// }

