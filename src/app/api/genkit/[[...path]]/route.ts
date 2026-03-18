// src/app/api/genkit/[[...path]]/route.ts
import { genkitDevServer } from '@genkit-ai/next/dev';
import '@/ai/dev';

export const GET = genkitDevServer;
export const POST = genkitDevServer;
