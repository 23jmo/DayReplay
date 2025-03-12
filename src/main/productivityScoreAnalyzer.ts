import { DayEntry, AppUsageData } from '../shared/types';
import { openAIAPIKeyStore } from './store';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import log from 'electron-log';
import { app } from 'electron';
import { prompt } from '../shared/custom-prompt';
import type Store from 'electron-store';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

function validateApiKey(apiKey: string | null | undefined): string {
  if (!apiKey || typeof apiKey !== 'string') {
    log.error('API key is null or not a string');
    throw new Error('OpenAI API key is missing');
  }

  const trimmedKey = apiKey.trim();
  if (trimmedKey === '') {
    log.error('API key is empty string');
    throw new Error('OpenAI API key is empty');
  }

  // Validate API key format (should start with "sk-" and be 51 characters)
  if (!trimmedKey.startsWith('sk-')) {
    log.error('API key does not start with sk-');
    throw new Error('Invalid OpenAI API key format - should start with sk-');
  }

  return trimmedKey;
}

interface AppProductivityData {
  appName: string;
  screenshots: string[]; // Base64 encoded screenshots
  duration: number; // Time spent in milliseconds
  description: string; // Activity description
}

interface AnalysisResult {
  productivity: number;
  description: string;
}

interface OpenAIClient {
  client: OpenAI;
  apiKey: string;
}

// OpenAI Client Management
async function initializeOpenAIClient(): Promise<OpenAIClient> {
  const store = openAIAPIKeyStore;
  let apiKey: string;

  try {
    // @ts-ignore - electron-store methods exist but types are not properly recognized
    const storedKey = store.get('openaiApiKey');
    log.info(
      'Retrieved API key from store:',
      storedKey ? 'Present (hidden)' : 'Not found',
    );
    apiKey = validateApiKey(storedKey);
  } catch (error) {
    log.error('API key validation failed:', error);
    throw new Error(
      'Please set a valid OpenAI API key in settings. The key should start with sk- and be 51 characters long.',
    );
  }

  const client = new OpenAI({
    apiKey,
    timeout: 60000,
    maxRetries: 5,
    baseURL: 'https://api.openai.com/v1',
  });

  // Test connection
  await testOpenAIConnection(client);

  return { client, apiKey };
}

async function testOpenAIConnection(client: OpenAI): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      log.info(`Testing OpenAI API connection (attempt ${attempt}/3)...`);
      await client.models.list();
      log.info('OpenAI API connection successful');
      return;
    } catch (error: any) {
      lastError = error;
      log.error(`OpenAI API connection attempt ${attempt} failed:`, {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      if (error.status === 401) {
        throw new Error(
          'Invalid OpenAI API key. Please check your API key in settings.',
        );
      }

      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        log.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (lastError) {
    throw new Error(
      `Failed to connect to OpenAI API: ${lastError.message}. Please check your internet connection and try again.`,
    );
  }
}

// Data Processing
async function extractAppScreenshots(
  dayEntry: DayEntry,
): Promise<AppProductivityData[]> {
  const appDataMap = new Map<string, AppProductivityData>();
  const tempDir = path.join(app.getPath('temp'), 'DayReplay');

  if (!dayEntry.appUsage) return [];

  // Group app usage data
  dayEntry.appUsage.forEach((app) => {
    if (!appDataMap.has(app.appName)) {
      appDataMap.set(app.appName, {
        appName: app.appName,
        screenshots: [],
        duration: 0,
        description: `${app.title} ${app.url ? `(${app.url})` : ''}`,
      });
    }
    const data = appDataMap.get(app.appName)!;
    data.duration += app.endTime - app.startTime;
  });

  // Collect screenshots for each app
  for (const [appName, data] of appDataMap.entries()) {
    const appUsage = dayEntry.appUsage.filter((app) => app.appName === appName);
    const screenshotNumbers = getScreenshotNumbers(
      appUsage,
      dayEntry.startDate,
      dayEntry.interval,
    );
    await collectScreenshots(data, screenshotNumbers, tempDir);
  }

  return Array.from(appDataMap.values());
}

function getScreenshotNumbers(
  appUsage: AppUsageData[],
  startDate: string,
  interval: number,
): number[] {
  const numbers = appUsage.map((app) => {
    const timeInVideo = (app.startTime - parseInt(startDate)) / 1000;
    return Math.floor(timeInVideo / interval) + 1;
  });

  // Take one screenshot every 5 occurrences, minimum 1
  const selectedNumbers = numbers.filter((_, index) => index % 5 === 0);
  if (selectedNumbers.length === 0 && numbers.length > 0) {
    selectedNumbers.push(numbers[0]);
  }

  return selectedNumbers;
}

async function collectScreenshots(
  data: AppProductivityData,
  screenshotNumbers: number[],
  tempDir: string,
): Promise<void> {
  for (const number of screenshotNumbers) {
    const screenshotPath = path.join(tempDir, `${number}.jpg`);
    try {
      const base64Image = await fs.promises.readFile(screenshotPath, {
        encoding: 'base64',
      });
      data.screenshots.push(base64Image);
    } catch (error) {
      log.error(`Error reading screenshot ${screenshotPath}:`, error);
    }
  }
}

// Productivity Analysis
async function analyzeAppProductivity(
  appData: AppProductivityData[],
  openai: OpenAI,
): Promise<Map<string, number>> {
  const appsPrompt = appData
    .map((app) => {
      const screenshotsDesc = `${app.screenshots.length} screenshots of the application`;
      return `App: ${app.appName}
Description: ${app.description}
Time spent: ${Math.round(app.duration / 1000 / 60)} minutes
Context: ${screenshotsDesc}`;
    })
    .join('\n\n');

  const promptText = `Analyze the productivity of the following applications based on their usage and screenshots.
For each app, provide a score from 0-100 where:
0 = completely unproductive/distracting
50 = neutral
100 = highly productive
Consider factors like:
- The nature of the application
- Time spent
- Context of usage
- Visual evidence from screenshots

Applications to analyze:

${appsPrompt}

Respond with ONLY a JSON object mapping app names to scores, like:
{"AppName1": 85, "AppName2": 30}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          ...appData.flatMap((app) =>
            app.screenshots.map((screenshot) => ({
              type: 'image_url' as const,
              image_url: { url: `data:image/jpeg;base64,${screenshot}` },
            })),
          ),
        ],
      },
    ],
    max_tokens: 1000,
  });

  const scores = new Map<string, number>();
  try {
    const scoreJson = JSON.parse(response.choices[0].message.content || '{}');
    for (const [appName, score] of Object.entries(scoreJson)) {
      scores.set(appName, score as number);
    }
  } catch (error) {
    log.error('Error parsing productivity scores:', error);
    throw error;
  }

  return scores;
}

function calculateWeightedScore(
  scores: Map<string, number>,
  appData: AppProductivityData[],
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const app of appData) {
    const score = scores.get(app.appName) || 50;
    const weight = app.duration;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

// Description Generation
async function generateSessionDescription(
  appData: AppProductivityData[],
  openai: OpenAI,
): Promise<string> {
  try {
    const sortedApps = [...appData].sort((a, b) => b.duration - a.duration);
    const promptText = `Generate a concise, engaging one-paragraph description of this computer usage session based on the following data and screenshots:

Apps used (sorted by time spent):
${sortedApps
  .map(
    (app) => `- ${app.appName}: ${Math.round(app.duration / 1000 / 60)} minutes
  Context: ${app.description}`,
  )
  .join('\n')}

Focus on:
1. The main activities and accomplishments
2. The workflow and transitions between apps
3. The overall purpose or theme of the session
4. Keep it natural and engaging, under 100 words

Respond with ONLY the description paragraph, no additional formatting or explanation.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            ...sortedApps.flatMap((app) =>
              app.screenshots.map((screenshot) => ({
                type: 'image_url' as const,
                image_url: { url: `data:image/jpeg;base64,${screenshot}` },
              })),
            ),
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const description =
      response.choices[0]?.message?.content?.trim() ||
      'A productive computer session with various applications.';

    log.info('Generated session description:', description);
    return description;
  } catch (error) {
    log.error('Error generating session description:', error);
    return 'A recorded session of computer activity.';
  }
}

// Main Export Function
export async function analyzeProductivity(
  dayEntry: DayEntry,
): Promise<AnalysisResult> {
  try {
    // Initialize OpenAI client
    const { client } = await initializeOpenAIClient();

    // Extract and process app data
    const appData = await extractAppScreenshots(dayEntry);
    if (appData.length === 0) {
      throw new Error('No app data found to analyze');
    }

    // Run productivity analysis and description generation in parallel
    const [scores, description] = await Promise.all([
      analyzeAppProductivity(appData, client),
      generateSessionDescription(appData, client),
    ]);

    // Calculate final productivity score
    const productivityScore = calculateWeightedScore(scores, appData);

    return {
      productivity: productivityScore,
      description: description,
    };
  } catch (error) {
    log.error('Error in productivity analysis:', error);
    throw error;
  }
}
