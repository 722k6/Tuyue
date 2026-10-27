import 'reflect-metadata';
import { DEFAULT_API_PORT } from '@tuyue/config';
import { createApplication } from './app.js';

const app = await createApplication();
const port = Number(process.env.API_PORT ?? DEFAULT_API_PORT);
await app.listen(port);
console.log(`Tuyue Mock API: http://localhost:${port}/api`);
console.log(`Swagger: http://localhost:${port}/api/docs`);
