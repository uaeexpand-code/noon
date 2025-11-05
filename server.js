
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import cron from 'node-cron';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- File-based Storage ---
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const DISCOVERED_EVENTS_FILE = path.join(DATA_DIR, 'discovered-events.json');
const USER_EVENTS_FILE = path.join(DATA_DIR, 'user-events.json');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat-history.json');


const writeJSON = async (filePath, data) => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
};

const readJSON = async (filePath, defaultValue) => {
    try {
        await fs.access(filePath); // Check if file exists
        const data = await fs.readFile(filePath, 'utf-8');
        if (data.trim() === '') return defaultValue; // Handle empty file
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeJSON(filePath, defaultValue);
            return defaultValue;
        }
        console.error(`Error reading or parsing ${filePath}:`, error);
        return defaultValue; // Return default for corrupted or other errors
    }
};


// --- Gemini API Setup ---
const GEMINI_API_KEY = process.env.API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini features will be disabled unless another provider is configured.");
}
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;


// --- Discord Webhook Helper ---
const sendDiscordWebhook = async (webhookUrl, payload) => {
    if (!webhookUrl) return;
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


// --- API Call Handlers for Different Providers ---

const handleGeminiRequest = async (prompt, isJson = false) => {
    if (!ai) throw new Error("Gemini AI service not configured on the server.");
    const config = isJson ? { responseMimeType: "application/json" } : {};
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
    });
    const text = response.text.trim();
    return isJson ? JSON.parse(text) : text;
};

const handleOpenAiRequest = async (apiKey, messages, isJson = false) => {
    const body = {
        model: "gpt-3.5-turbo",
        messages,
        ...(isJson && { response_format: { type: "json_object" } }),
    };
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    return isJson ? JSON.parse(content) : content;
};

const handleOpenRouterRequest = async (apiKey, messages, isJson = false) => {
    const body = {
        model: "openai/gpt-3.5-turbo", // A default, cost-effective model
        messages,
        ...(isJson && { response_format: { type: "json_object" } }),
    };
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': `http://localhost:${port}`,
            'X-Title': `UAE Seller's Smart Calendar`,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`OpenRouter API error: ${response.statusText}`);
    const data = await response.json();
    const content = data.choices[0].message.content;
    return isJson ? JSON.parse(content) : content;
};


// --- Core Discovery Logic ---
const runDiscoveryTask = async () => {
    console.log('Running automated discovery task...');
    const settings = await readJSON(SETTINGS_FILE, {});
    const { aiProvider, openaiApiKey, openrouterApiKey, isAutoDiscoverEnabled, lastAutoDiscoverRun, autoDiscoverFrequency, webhookUrl } = settings;

    if (!isAutoDiscoverEnabled) {
        console.log('Automated discovery is disabled.');
        return;
    }

    const now = new Date().getTime();
    const frequencyInMs = (autoDiscoverFrequency || 2) * 24 * 60 * 60 * 1000;
    if (now - (lastAutoDiscoverRun || 0) < frequencyInMs) {
        console.log('Not time to run discovery yet.');
        return;
    }

    console.log(`Discovering new events using ${aiProvider}...`);
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const prompt = `As an expert market researcher for UAE e-commerce, identify key events in the UAE for ${monthName} ${year}. I need a JSON array of objects. Each object must have 'date' (string in YYYY-MM-DD format), 'name' (string), and 'category' (string). Include: 'E-commerce Sale', 'Global Event', 'Cultural', 'Sporting', 'Trending'.`;

    try {
        let newEventsRaw = []; // Initialize as an empty array to prevent crashes
        
        if (aiProvider === 'openai') {
            if (!openaiApiKey) throw new Error("OpenAI API key not set for discovery task.");
            newEventsRaw = await handleOpenAiRequest(openaiApiKey, [{ role: 'user', content: prompt }], true);
        } else if (aiProvider === 'openrouter') {
            if (!openrouterApiKey) throw new Error("OpenRouter API key not set for discovery task.");
            newEventsRaw = await handleOpenRouterRequest(openrouterApiKey, [{ role: 'user', content: prompt }], true);
        } else if (aiProvider === 'gemini') {
            newEventsRaw = await handleGeminiRequest(prompt, true);
        } else {
            console.log(`Automated discovery skipped: No valid AI provider configured (found: "${aiProvider}").`);
        }

        const discoveredEvents = await readJSON(DISCOVERED_EVENTS_FILE, []);
        const existingEventKeys = new Set(discoveredEvents.map(e => `${e.name}_${e.date}`));
        
        // Ensure newEventsRaw is an array before filtering to prevent crashes if the AI returns malformed data
        const uniqueNewEvents = Array.isArray(newEventsRaw)
            ? newEventsRaw.filter(e => e.date && e.name && e.category && !existingEventKeys.has(`${e.name}_${e.date}`))
            : [];

        if (uniqueNewEvents.length > 0) {
            console.log(`Found ${uniqueNewEvents.length} new events!`);
            await writeJSON(DISCOVERED_EVENTS_FILE, [...discoveredEvents, ...uniqueNewEvents]);
            
            const description = uniqueNewEvents.map(e => `**\`${e.date}\`**: ${e.name} *(${e.category})*`).join('\n');
            await sendDiscordWebhook(webhookUrl, { embeds: [{ title: `🤖 New Events Discovered!`, description, color: 0x2ECC71 }] });
        } else {
            console.log('No new events found.');
        }

        settings.lastAutoDiscoverRun = now;
        await writeJSON(SETTINGS_FILE, settings);
    } catch (error) {
        console.error('Error during automated discovery task:', error.message);
        if (webhookUrl) {
            await sendDiscordWebhook(webhookUrl, { embeds: [{ title: `🤖 Event Discovery Failed`, description: `The automated task failed to run. Please check the server logs.\nError: \`${error.message}\``, color: 0xE74C3C }] });
        }
    }
};

// --- API Endpoints ---
app.post('/api/settings', async (req, res) => {
    const currentSettings = await readJSON(SETTINGS_FILE, {});
    const newSettings = { ...currentSettings, ...req.body };
    await writeJSON(SETTINGS_FILE, newSettings);
    res.status(200).json({ message: 'Settings saved.' });
});

app.get('/api/settings', async (req, res) => {
    const settings = await readJSON(SETTINGS_FILE, {
        webhookUrl: '',
        isAutoDiscoverEnabled: false,
        autoDiscoverFrequency: 2,
        lastAutoDiscoverRun: 0,
        aiProvider: 'gemini',
        openaiApiKey: '',
        openrouterApiKey: '',
    });
    res.json(settings);
});

app.get('/api/discovered-events', async (req, res) => {
    const events = await readJSON(DISCOVERED_EVENTS_FILE, []);
    res.json(events);
});

app.post('/api/discovered-events', async (req, res) => {
    await writeJSON(DISCOVERED_EVENTS_FILE, req.body);
    res.status(200).json({ message: 'Discovered events saved.' });
});

app.get('/api/user-events', async (req, res) => {
    const events = await readJSON(USER_EVENTS_FILE, []);
    res.json(events);
});

app.post('/api/user-events', async (req, res) => {
    await writeJSON(USER_EVENTS_FILE, req.body);
    res.status(200).json({ message: 'User events saved.' });
});

app.get('/api/chat-history', async (req, res) => {
    const history = await readJSON(CHAT_HISTORY_FILE, []);
    res.json(history);
});

app.post('/api/chat-history', async (req, res) => {
    await writeJSON(CHAT_HISTORY_FILE, req.body);
    res.status(200).json({ message: 'Chat history saved.' });
});


app.post('/api/ai/test', async (req, res) => {
    const { provider, apiKey } = req.body;
    try {
        if (provider === 'gemini') {
            await handleGeminiRequest("test");
        } else if (provider === 'openai') {
            if (!apiKey) throw new Error("API Key is required.");
            await handleOpenAiRequest(apiKey, [{ role: 'user', content: 'test' }]);
        } else if (provider === 'openrouter') {
            if (!apiKey) throw new Error("API Key is required.");
            await handleOpenRouterRequest(apiKey, [{ role: 'user', content: 'test' }]);
        } else {
            throw new Error("Invalid provider.");
        }
        res.json({ success: true });
    } catch (error) {
        console.error(`Test failed for ${provider}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


app.post('/api/ai/:action', async (req, res) => {
  const { action } = req.params;
  const payload = req.body;
  const settings = await readJSON(SETTINGS_FILE, {});
  const { aiProvider, openaiApiKey, openrouterApiKey } = settings;

  try {
    let result;
    if (action === 'generateMarketingIdeas') {
        const prompt = `You are an expert marketing consultant for e-commerce sellers in the UAE. For the upcoming event '${payload.event.name}' (${payload.event.category}), generate 3 short, actionable, creative marketing ideas. Ensure the output is a valid JSON array of strings.`;
        if (aiProvider === 'openai') {
            result = await handleOpenAiRequest(openaiApiKey, [{ role: 'user', content: prompt }], true);
        } else if (aiProvider === 'openrouter') {
            result = await handleOpenRouterRequest(openrouterApiKey, [{ role: 'user', content: prompt }], true);
        } else {
            result = await handleGeminiRequest(prompt, true);
        }
    } else if (action === 'discoverEvents') {
        const { year, month } = payload;
        const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
        const prompt = `As an expert market researcher for UAE e-commerce, identify key events in the UAE for ${monthName} ${year}. I need a JSON array of objects. Each object must have 'date' (string in YYYY-MM-DD format), 'name' (string), and 'category' (string). Include 'E-commerce Sale', 'Global Event', 'Cultural', 'Sporting', 'Trending'.`;
        if (aiProvider === 'openai') {
            result = await handleOpenAiRequest(openaiApiKey, [{ role: 'user', content: prompt }], true);
        } else if (aiProvider === 'openrouter') {
            result = await handleOpenRouterRequest(openrouterApiKey, [{ role: 'user', content: prompt }], true);
        } else {
            result = await handleGeminiRequest(prompt, true);
        }
    } else if (action === 'chat') {
        const { message, history, events } = payload;
        const eventSummaries = events.map(e => ` - ${e.date.substring(0, 10)}: ${e.type === 'user' ? e.title : e.name}`).join('\n');
        const systemPrompt = `You are a helpful and clever calendar assistant for an e-commerce seller in the UAE. Your tone is encouraging and proactive. Use the provided calendar events to answer questions. Current events:\n${eventSummaries}`;
        
        let messages = history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content }));
        messages.push({ role: 'user', content: message });
        
        // For OpenAI/OpenRouter, it's better to have a system prompt
        const chatMessages = aiProvider === 'gemini' 
            ? [{ role: 'user', content: `${systemPrompt}\n\nUser: ${message}`}] // Simplified history for Gemini
            : [{ role: 'system', content: systemPrompt }, ...messages];

        if (aiProvider === 'openai') {
            result = await handleOpenAiRequest(openaiApiKey, chatMessages);
        } else if (aiProvider === 'openrouter') {
            result = await handleOpenRouterRequest(openrouterApiKey, chatMessages);
        } else {
             const fullPrompt = `${systemPrompt}\n\nConversation History:\n${history.map(h=>`${h.role}: ${h.content}`).join('\n')}\n\nUser: ${message}`;
            result = await handleGeminiRequest(fullPrompt);
        }
    } else {
      return res.status(404).json({ error: "Unknown API action." });
    }
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/ai/${action}:`, error);
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
  cron.schedule('0 3 * * *', runDiscoveryTask);
  console.log('Scheduled automated event discovery to run daily at 3:00 AM.');
  // Run once on startup after a short delay to allow the server to initialize
  setTimeout(runDiscoveryTask, 5000); 
});