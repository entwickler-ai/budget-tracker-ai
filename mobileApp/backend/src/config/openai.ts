// backend/src/config/openai.ts
import { OpenAI } from 'openai';

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in the environment variables');
}new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});