import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  console.log('API Key present:', !!apiKey);

  try {
    const { text, toolCalls, toolResults } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Here is my CV — please find the best matching jobs for me: I am a software engineer in Nairobi.',
      tools: {
        searchJobs: {
          description: 'Search for active job openings in East Africa.',
          parameters: {
            type: 'object',
            properties: {
              keyword: { type: 'string' }
            },
            required: ['keyword']
          },
          execute: async (args: any) => {
            console.log('Executing searchJobs with args:', args);
            return '["Job 1"]';
          }
        }
      } as any
    });

    console.log('First call finished.');
    console.log('toolCalls:', toolCalls);
    console.log('toolResults:', toolResults);

    if (toolCalls && toolCalls.length > 0 && toolResults) {
      console.log('Making second call...');
      const toolResultsText = JSON.stringify(toolResults);
      const followup = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: `System: Results: ${toolResultsText}\nPlease summarize.`
      });
      console.log('Followup text:', followup.text);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
