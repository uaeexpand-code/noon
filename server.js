
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import cron from 'node-cron';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- File-based Storage ---
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const DISCOVERED_EVENTS_FILE = path.join(__dirname, 'discovered-events.json');

const writeJSON = async (filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
};

const readJSON = async (filePath, defaultValue) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        // JSON.parse will throw on an empty string, which is what we want.
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist, so create it with the default value.
            console.log(`File not found: ${filePath}. Creating with default value.`);
            await writeJSON(filePath, defaultValue);
            return defaultValue;
        }
        // Covers empty files (JSON.parse error), corrupted JSON, and other read errors.
        console.error(`Error processing ${filePath}: ${error.message}. Returning default value.`);
        return defaultValue;
    }
};


// --- Gemini API Setup ---
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;


// --- Discord Webhook Helper on Server ---
const sendDiscordWebhook = async (webhookUrl, payload) => {
    if (!webhookUrl) {
        console.error("Discord webhook URL is not configured for the server.");
        return;
    }
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            console.error("Server-side Discord webhook error:", await response.text());
        }
    } catch (error) {
        console.error("Failed to send from server to Discord:", error);
    }
};

// --- Core Discovery Logic ---
const runDiscoveryTask = async () => {
    console.log('Running automated discovery task...');
    if (!ai) {
        console.log('AI service not configured. Skipping discovery.');
        return;
    }

    const settings = await readJSON(SETTINGS_FILE, {});
    if (!settings.isAutoDiscoverEnabled) {
        console.log('Automated discovery is disabled in settings.');
        return;
    }

    const now = new Date().getTime();
    const lastRun = settings.lastAutoDiscoverRun || 0;
    const frequencyInMs = (settings.autoDiscoverFrequency || 2) * 24 * 60 * 60 * 1000;

    if (now - lastRun < frequencyInMs) {
        console.log('Not time to run discovery yet. Skipping.');
        return;
    }
    
    console.log('Discovering new events for the current month...');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    try {
        // This is the same logic from the client, now running on the server
        const monthName = today.toLocaleString('default', { month: 'long' });
        const prompt = `As an expert market researcher for UAE e-commerce, identify key events in the UAE for ${monthName} ${year}. I need a JSON array of objects. Each object must have 'date' (string in YYYY-MM-DD format), 'name' (string), and 'category' (string). Include: 'E-commerce Sale', 'Global Event', 'Cultural', 'Sporting', 'Trending'.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" },
        });

        const newEventsRaw = JSON.parse(response.text.trim());
        const discoveredEvents = await readJSON(DISCOVERED_EVENTS_FILE, []);
        
        const existingEventKeys = new Set(discoveredEvents.map(e => `${e.name}_${e.date}`));
        const uniqueNewEvents = newEventsRaw.filter(newEvent => !existingEventKeys.has(`${newEvent.name}_${newEvent.date}`));

        if (uniqueNewEvents.length > 0) {
            console.log(`Found ${uniqueNewEvents.length} new events!`);
            // Add new events to our store
            await writeJSON(DISCOVERED_EVENTS_FILE, [...discoveredEvents, ...uniqueNewEvents]);

            // Notify via Discord
            if (settings.webhookUrl) {
                const description = uniqueNewEvents
                    .map(event => `**\`${event.date}\`**: ${event.name} *(${event.category})*`)
                    .join('\n');

                const payload = {
                    embeds: [{
                        title: `🤖 New Events Discovered!`,
                        description,
                        color: 0x2ECC71, // Green
                        footer: { text: "From UAE Seller's Smart Calendar - Automated Discovery" },
                    }]
                };
                await sendDiscordWebhook(settings.webhookUrl, payload);
            }
        } else {
            console.log('No new events found this time.');
        }

        // Update last run time
        settings.lastAutoDiscoverRun = now;
        await writeJSON(SETTINGS_FILE, settings);

    } catch (error) {
        console.error('Error during automated discovery task:', error);
    }
};

// --- API Endpoints ---
app.post('/api/settings', async (req, res) => {
    await writeJSON(SETTINGS_FILE, req.body);
    res.status(200).json({ message: 'Settings saved.' });
});

app.get('/api/settings', async (req, res) => {
    const settings = await readJSON(SETTINGS_FILE, {
        webhookUrl: '',
        isAutoDiscoverEnabled: false,
        autoDiscoverFrequency: 2,
        theme: 'dark',
        lastAutoDiscoverRun: 0,
    });
    res.json(settings);
});

app.get('/api/discovered-events', async (req, res) => {
    const events = await readJSON(DISCOVERED_EVENTS_FILE, []);
    res.json(events);
});

app.post('/api/gemini/:action', async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: "AI service is not configured on the server." });
  }
  // This remains for client-side actions like Idea Generation and Chat
  // ... (rest of the original proxy logic)
  const { action } = req.params;
  const payload = req.body;

  try {
    let result;
    if (action === 'generateMarketingIdeas') {
      const prompt = `You are an expert marketing consultant for e-commerce sellers in the UAE. For the upcoming event '${payload.event.name}', which is a ${payload.event.category}, generate 3 short, actionable, and creative marketing ideas. The ideas should be suitable for a small to medium-sized online business. Ensure the output is a valid JSON array of strings.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: payload.schema,
        },
      });
      result = JSON.parse(response.text.trim());

    } else if (action === 'discoverEvents') {
      // This endpoint is now primarily for the MANUAL discovery button
      const { year, month } = payload;
      const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
      const prompt = `As an expert market researcher for UAE e-commerce, identify key events in the UAE for ${monthName} ${year}. I need a JSON array of objects. Each object must have 'date' (string in YYYY-MM-DD format), 'name' (string), and 'category' (string). Include the following categories where relevant:
- 'E-commerce Sale': Major online sales like White/Yellow Friday, Singles Day, Amazon/Noon specific sales.
- 'Global Event': Significant global events that affect UAE consumer behavior (e.g., Olympics, World Cup, major film releases).
- 'Cultural': Local festivals and cultural happenings.
- 'Sporting': Important local or international sports events held in UAE.
- 'Trending': Any other viral or trending event creating buzz.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: payload.schema,
        },
      });
      result = JSON.parse(response.text.trim());
    } else if (action === 'chat') {
        const { message, history, events } = payload;
        
        const eventSummaries = events.map(e => ` - ${e.date.substring(0, 10)}: ${e.type === 'user' ? e.title : e.name} (${e.type})`).join('\n');
    
        const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n\n');
    
        const prompt = `You are a helpful and clever calendar assistant for an e-commerce seller in the UAE. Your tone should be encouraging and proactive.
Use the provided calendar events to answer the user's questions.

Here are the events for the current period:
${eventSummaries}

Here is the conversation history so far:
${historyText}

User's new message:
${message}

Provide a helpful and concise response. Do not repeat the events list unless asked. Address the user directly.`;
    
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        result = response.text;
    } else {
      return res.status(404).json({ error: "Unknown API action." });
    }
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/gemini/${action}:`, error);
    res.status(500).json({ error: "An error occurred while communicating with the AI service." });
  }
});


// --- Static File Serving & Server Start ---
app.use(express.static(__dirname));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  // Schedule the task to run once every day at 3:00 AM server time.
  cron.schedule('0 3 * * *', runDiscoveryTask);
  console.log('Scheduled automated event discovery to run daily at 3:00 AM.');
  // Also run once on startup after a short delay
  setTimeout(runDiscoveryTask, 5000); 
});
