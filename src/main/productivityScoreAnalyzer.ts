import { DayEntry, AppUsageData } from '../shared/types';
import { openAIAPIKeyStore } from './store';
import { OpenAI, APIError, type ClientOptions } from 'openai';
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
  screenshots: string[];  // Base64 encoded screenshots
  duration: number;      // Time spent in milliseconds
  description: string;   // Activity description
}

export async function analyzeProductivity(dayEntry: DayEntry): Promise<number> {
  try {
    // Get and validate API key
    const store = openAIAPIKeyStore;
    let apiKey: string;

    try {
      // @ts-ignore - electron-store methods exist but types are not properly recognized
      const storedKey = store.get('openaiApiKey');
      log.info('Retrieved API key from store:', storedKey ? 'Present (hidden)' : 'Not found');
      apiKey = validateApiKey(storedKey);
    } catch (error) {
      log.error('API key validation failed:', error);
      throw new Error('Please set a valid OpenAI API key in settings. The key should start with sk- and be 51 characters long.');
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
      timeout: 60000, // 60 second timeout
      maxRetries: 5,
      baseURL: 'https://api.openai.com/v1'
    });

    // Test API connection with retries
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log.info(`Testing OpenAI API connection (attempt ${attempt}/3)...`);
        const models = await openai.models.list();
        log.info('OpenAI API connection successful');
        lastError = null;
        break;
      } catch (error: any) {
        lastError = error;
        log.error(`OpenAI API connection attempt ${attempt} failed:`, {
          message: error.message,
          status: error.status,
          code: error.code
        });

        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in settings.');
        }

        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000;
          log.info(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw new Error(`Failed to connect to OpenAI API: ${lastError.message}. Please check your internet connection and try again.`);
    }

    // Extract screenshots for each app
    const appData = await extractAppScreenshots(dayEntry);
    if (appData.length === 0) {
      throw new Error('No app data found to analyze');
    }

    // Get productivity scores for each app
    const scores = await getProductivityScores(appData, openai);

    // Calculate weighted average
    return calculateWeightedScore(scores, appData);
  } catch (error) {
    log.error('Error analyzing productivity:', error);
    throw error;
  }
}

async function extractAppScreenshots(dayEntry: DayEntry): Promise<AppProductivityData[]> {
  const appDataMap = new Map<string, AppProductivityData>();
  const tempDir = path.join(app.getPath('temp'), 'DayReplay');

  // Group app usage data by app name
  if (!dayEntry.appUsage) {
    return [];
  }

  dayEntry.appUsage.forEach(app => {
    if (!appDataMap.has(app.appName)) {
      appDataMap.set(app.appName, {
        appName: app.appName,
        screenshots: [],
        duration: 0,
        description: `${app.title} ${app.url ? `(${app.url})` : ''}`
      });
    }
    const data = appDataMap.get(app.appName)!;
    data.duration += (app.endTime - app.startTime);
  });

  // Map timestamps to screenshot numbers
  for (const [appName, data] of appDataMap.entries()) {
    const appUsage = dayEntry.appUsage.filter(app => app.appName === appName);
    const screenshotNumbers = appUsage.map(app => {
      const timeInVideo = (app.startTime - parseInt(dayEntry.startDate)) / 1000;
      const screenshotNumber = Math.floor(timeInVideo / dayEntry.interval) + 1;
      return screenshotNumber;
    });

    // Take one screenshot every 5 occurrences, minimum 1
    const selectedNumbers = screenshotNumbers.filter((_, index) => index % 5 === 0);
    if (selectedNumbers.length === 0 && screenshotNumbers.length > 0) {
      selectedNumbers.push(screenshotNumbers[0]);
    }

    // Read existing screenshots
    for (const number of selectedNumbers) {
      const screenshotPath = path.join(tempDir, `${number}.jpg`);
      try {
        const base64Image = await fs.promises.readFile(screenshotPath, { encoding: 'base64' });
        data.screenshots.push(base64Image);
      } catch (error) {
        log.error(`Error reading screenshot ${screenshotPath}:`, error);
        // Continue with other screenshots if one fails
      }
    }
  }

  return Array.from(appDataMap.values());
}

async function getProductivityScores(
  appData: AppProductivityData[],
  openai: OpenAI
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // Prepare one big prompt for all apps
  const appsPrompt = appData.map(app => {
    const screenshotsDesc = `${app.screenshots.length} screenshots of the application`;
    return `App: ${app.appName}
Description: ${app.description}
Time spent: ${Math.round(app.duration / 1000 / 60)} minutes
Context: ${screenshotsDesc}`;
  }).join('\n\n');

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

  // Make the API call with proper types
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          ...appData.flatMap(app =>
            app.screenshots.map(screenshot => ({
              type: "image_url" as const,
              image_url: {
                url: `data:image/jpeg;base64,${screenshot}`
              }
            }))
          )
        ],
      },
    ],
    max_tokens: 1000,
  });

  // Parse the response
  try {
    const scoreJson = JSON.parse(response.choices[0].message.content || '{}');
    for (const [appName, score] of Object.entries(scoreJson)) {
      scores.set(appName, score as number);
    }
  } catch (error) {
    log.error('Error parsing OpenAI response:', error);
    throw error;
  }

  return scores;
}

function calculateWeightedScore(
  scores: Map<string, number>,
  appData: AppProductivityData[]
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const app of appData) {
    const score = scores.get(app.appName) || 50; // Default to neutral if no score
    const weight = app.duration;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}
