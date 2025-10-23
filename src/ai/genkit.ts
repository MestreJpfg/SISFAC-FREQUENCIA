import {configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = configureGenkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
