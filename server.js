
import express from 'express';
import { GoogleGenAI } from '@google/genai';
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
const SENT_NOTIFICATIONS_FILE = path.join(DATA_DIR, 'sent-notifications.json');


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


// --- Hardcoded UAE Dates (Server-side) ---
const getApproximateIslamicDate = (baseYear, baseDate, targetYear) => {
  const yearDiff = targetYear - baseYear;
  const dayShift = Math.round(yearDiff * -10.875);
  const dateForTargetYear = new Date(baseDate);
  dateForTargetYear.setFullYear(targetYear);
  dateForTargetYear.setDate(dateForTargetYear.getDate() + dayShift);
  return dateForTargetYear;
};

const getSpecialDates = (year) => {
  const BASE_YEAR = 2024;
  const BASE_DATES = {
    RAMADAN_BEGINS: new Date(BASE_YEAR, 2, 11), EID_AL_FITR: new Date(BASE_YEAR, 3, 10),
    EID_AL_ADHA: new Date(BASE_YEAR, 5, 16), ISLAMIC_NEW_YEAR: new Date(BASE_YEAR, 6, 7),
    PROPHETS_BIRTHDAY: new Date(BASE_YEAR, 8, 15),
  };
  return [
    { date: new Date(year, 0, 1), name: "New Year's Day", category: 'Global Event' },
    { date: new Date(year, 1, 14), name: "Valentine's Day", category: 'Commercial' },
    { date: new Date(year, 2, 8), name: "International Women's Day", category: 'Global Event' },
    { date: new Date(year, 2, 21), name: "Mother's Day (UAE)", category: 'Commercial' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.RAMADAN_BEGINS, year), name: "Ramadan Begins (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.EID_AL_FITR, year), name: "Eid Al Fitr (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.EID_AL_ADHA, year), name: "Eid Al Adha (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.ISLAMIC_NEW_YEAR, year), name: "Islamic New Year (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.PROPHETS_BIRTHDAY, year), name: "Prophet's Birthday (approx.)", category: 'Religious' },
    { date: new Date(year, 4, 1), name: "Summer Heat Starts", category: 'Season' },
    { date: new Date(year, 5, 21), name: "Father's Day", category: 'Commercial' },
    { date: new Date(year, 6, 15), name: "Amazon Prime Day (approx.)", category: 'E-commerce Sale' },
    { date: new Date(year, 7, 28), name: "Emirati Women's Day", category: 'National Holiday' },
    { date: new Date(year, 7, 20), name: "Back to School Season", category: 'Commercial' },
    { date: new Date(year, 9, 31), name: "Diwali (Commercial)", category: 'Commercial' },
    { date: new Date(year, 10, 1), name: "Start of Cool Weather", category: 'Season' },
    { date: new Date(year, 10, 11), name: "Singles' Day Sale (11.11)", category: 'E-commerce Sale' },
    { date: new Date(year, 10, 29), name: "White/Yellow Friday Sale", category: 'E-commerce Sale' },
    { date: new Date(year, 11, 1), name: "Commemoration Day", category: 'National Holiday' },
    { date: new Date(year, 11, 1), name: "Winter Starts", category: 'Season' },
    { date: new Date(year, 11, 2), name: "UAE National Day", category: 'National Holiday' },
    { date: new Date(year, 11, 3), name: "UAE National Day Holiday", category: 'National Holiday' },
    { date: new Date(year, 11, 12), name: "12.12 Sale", category: 'E-commerce Sale' },
    { date: new Date(year, 11, 15), name: "Dubai Shopping Festival Starts", category: 'Commercial' },
  ];
};


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

const handleOpenAiRequest = async (apiKey, model, messages, isJson = false) => {
    const body = {
        model: model || 'gpt-4o',
        messages,
        ...(isJson && { response_format: { type: "json_object" } }),
    };
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenAI API Error:", errorBody);
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices[0].message.content;
    return isJson ? JSON.parse(content) : content;
};

const handleOpenRouterRequest = async (apiKey, model, messages, isJson = false) => {
    const body = {
        model: model || 'anthropic/claude-3-haiku',
        messages,
        ...(isJson && { response_format: { type: "json_object" } }),
    };
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': `http://localhost:${port}`, 'X-Title': `UAE Seller's Smart Calendar`,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenRouter API Error:", errorBody);
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices[0].message.content;
    return isJson ? JSON.parse(content) : content;
};


// --- Core Discovery & Notification Logic ---

const getMarketingTip = async () => {
    try {
        const prompt = "Give me one short, insightful, and actionable marketing tip for an e-commerce seller in the UAE. Make it specific and creative. Don't add any intro or outro text, just the tip itself.";
        const settings = await readJSON(SETTINGS_FILE, {});
        const { aiProvider, openaiApiKey, openrouterApiKey, openaiModel, openrouterModel } = settings;
        if (aiProvider === 'openai' && openaiApiKey) {
            return await handleOpenAiRequest(openaiApiKey, openaiModel, [{ role: 'user', content: prompt }]);
        } else if (aiProvider === 'openrouter' && openrouterApiKey) {
            return await handleOpenRouterRequest(openrouterApiKey, openrouterModel, [{ role: 'user', content: prompt }]);
        } else {
            return await handleGeminiRequest(prompt);
        }
    } catch (e) {
        console.error("Failed to get marketing tip:", e);
        return "Focus on providing excellent customer service today. A happy customer is a repeat customer!";
    }
}

const runDiscoveryTask = async () => {
    console.log('Running automated discovery task...');
    const settings = await readJSON(SETTINGS_FILE, {});
    const { aiProvider, openaiApiKey, openrouterApiKey, isAutoDiscoverEnabled, lastAutoDiscoverRun, autoDiscoverFrequency, webhookUrl, openaiModel, openrouterModel } = settings;

    if (!isAutoDiscoverEnabled) return console.log('Automated discovery is disabled.');

    const now = new Date().getTime();
    const frequencyInMs = (autoDiscoverFrequency || 2) * 24 * 60 * 60 * 1000;
    if (now - (lastAutoDiscoverRun || 0) < frequencyInMs) return console.log('Not time to run discovery yet.');
    
    if ((aiProvider === 'gemini' && !ai) || (aiProvider === 'openai' && !openaiApiKey) || (aiProvider === 'openrouter' && !openrouterApiKey)) {
      return console.warn(`Automated discovery skipped: ${aiProvider} API key not configured.`);
    }

    console.log(`Discovering new events using ${aiProvider}...`);
    const today = new Date();
    const monthName = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const prompt = `Using Google Search, find key commercial, cultural, sporting, or trending events relevant to e-commerce sellers in the UAE for ${monthName} ${year}. Return the result as a JSON array of objects. Each object must have 'date' (YYYY-MM-DD string), 'name' (string), and 'category' (string). Categories can be: 'E-commerce Sale', 'Global Event', 'Cultural', 'Sporting', 'Trending'. Do not include well-known holidays like New Year's or National Day unless there is a specific new event associated with them this year. Focus on discoverable, potentially less-obvious events.`;

    try {
        let newEventsRaw = [];
        let sources = [];
        if (aiProvider === 'openai') {
            newEventsRaw = await handleOpenAiRequest(openaiApiKey, openaiModel, [{ role: 'user', content: prompt }], true);
        } else if (aiProvider === 'openrouter') {
            newEventsRaw = await handleOpenRouterRequest(openrouterApiKey, openrouterModel, [{ role: 'user', content: prompt }], true);
        } else {
            if (!ai) throw new Error("Gemini AI service not configured on the server.");
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { tools: [{googleSearch: {}}] },
            });

            const text = response.text.trim();
            try {
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
                newEventsRaw = JSON.parse(jsonMatch ? jsonMatch[1] : text);
            } catch (e) {
                console.error("Failed to parse JSON from automated discovery:", text);
                newEventsRaw = [];
            }
            
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            sources = groundingChunks
                .map(chunk => chunk.web && { uri: chunk.web.uri, title: chunk.web.title })
                .filter(Boolean)
                .filter((source, index, self) => index === self.findIndex(s => s.uri === source.uri));
        }

        const discoveredEvents = await readJSON(DISCOVERED_EVENTS_FILE, []);
        const existingEventKeys = new Set(discoveredEvents.map(e => `${e.name}_${e.date}`));
        
        const uniqueNewEvents = Array.isArray(newEventsRaw) ? newEventsRaw.filter(e => e.date && e.name && e.category && !existingEventKeys.has(`${e.name}_${e.date}`)) : [];

        if (uniqueNewEvents.length > 0) {
            console.log(`Found ${uniqueNewEvents.length} new events!`);
            await writeJSON(DISCOVERED_EVENTS_FILE, [...discoveredEvents, ...uniqueNewEvents]);
            const description = uniqueNewEvents.map(e => `**\`${e.date}\`**: ${e.name} *(${e.category})*`).join('\n');
            const sourceText = sources.length > 0 ? `\n\n**Sources:**\n${sources.map((s,i) => `${i+1}. [${s.title || s.uri}](${s.uri})`).join('\n')}` : '';
            await sendDiscordWebhook(webhookUrl, { embeds: [{ title: `🤖 New Events Discovered!`, description: description + sourceText, color: 0x2ECC71 }] });
        } else {
            console.log('No new events found.');
        }

        await writeJSON(SETTINGS_FILE, { ...settings, lastAutoDiscoverRun: now });
    } catch (error) {
        console.error('Error during automated discovery task:', error.message);
        if (webhookUrl) {
            await sendDiscordWebhook(webhookUrl, { embeds: [{ title: `🤖 Event Discovery Failed`, description: `The automated task failed to run. Please check the server logs.\nError: \`${error.message}\``, color: 0xE74C3C }] });
        }
    }
};

const checkAndSendNotifications = async () => {
    console.log('Running automated notification task...');
    const settings = await readJSON(SETTINGS_FILE, {});
    const { webhookUrl, isAutoNotifyEnabled, notifyDaysBefore, isDailyBriefingEnabled } = settings;

    if (!webhookUrl || (!isAutoNotifyEnabled && !isDailyBriefingEnabled)) {
        return console.log('Automated notifications disabled or webhook not set.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userEventsData = await readJSON(USER_EVENTS_FILE, []);
    const discoveredEventsData = await readJSON(DISCOVERED_EVENTS_FILE, []);
    const specialEvents = getSpecialDates(today.getFullYear());
    
    const allEvents = [
        ...userEventsData.map(e => ({ ...e, date: new Date(e.date) })),
        ...discoveredEventsData.map(e => ({ ...e, date: new Date(e.date) })),
        ...specialEvents,
    ];

    // --- Daily Briefing ---
    if (isDailyBriefingEnabled) {
        const todaysEvents = allEvents.filter(e => {
            const eventDate = new Date(e.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === today.getTime();
        });

        if (todaysEvents.length > 0) {
            const description = todaysEvents.map(e => `• ${e.title || e.name}`).join('\n');
            const tip = await getMarketingTip();
            const payload = {
                embeds: [{
                    title: "☀️ Good Morning! Here's your daily briefing:",
                    description, color: 0x3498DB,
                    fields: [{ name: "💡 AI Marketing Tip", value: tip }],
                    footer: { text: "Sent from UAE Seller's Smart Calendar" },
                }]
            };
            await sendDiscordWebhook(webhookUrl, payload);
        } else {
          console.log("No events for today's briefing.");
        }
    }

    // --- Upcoming Event Reminders ---
    if (isAutoNotifyEnabled && notifyDaysBefore > 0) {
        const sentNotifications = await readJSON(SENT_NOTIFICATIONS_FILE, []);
        const sentSet = new Set(sentNotifications);
        
        const notificationDate = new Date(today);
        notificationDate.setDate(today.getDate() + notifyDaysBefore);

        const eventsToNotify = allEvents.filter(e => {
            const eventDate = new Date(e.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === notificationDate.getTime();
        });

        for (const event of eventsToNotify) {
            const eventId = event.id || `${event.name}_${new Date(event.date).toISOString().split('T')[0]}`;
            if (!sentSet.has(eventId)) {
                const payload = {
                    embeds: [{
                        title: `🔔 Upcoming Event Reminder`,
                        description: `**${event.title || event.name}** is happening in **${notifyDaysBefore} days** on ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
                        color: 0xF1C40F, // Yellow
                        footer: { text: "Sent from UAE Seller's Smart Calendar" },
                    }]
                };
                await sendDiscordWebhook(webhookUrl, payload);
                sentSet.add(eventId);
            }
        }
        await writeJSON(SENT_NOTIFICATIONS_FILE, Array.from(sentSet));
    }
};

// --- Cron Job Management ---
let notificationTask = null;
let discoveryTask = null;

const rescheduleNotificationTask = async () => {
    if (notificationTask) {
        notificationTask.stop();
    }

    const settings = await readJSON(SETTINGS_FILE, {});
    const { dailyBriefingTime = '08:00', isDailyBriefingEnabled, isAutoNotifyEnabled } = settings;
    
    // Only schedule the job if at least one feature is enabled.
    if (isDailyBriefingEnabled || isAutoNotifyEnabled) {
        const [hour, minute] = dailyBriefingTime.split(':');
        
        if (isNaN(parseInt(hour, 10)) || isNaN(parseInt(minute, 10))) {
            console.error(`Invalid dailyBriefingTime format: ${dailyBriefingTime}. Defaulting to 08:00.`);
            notificationTask = cron.schedule('0 8 * * *', checkAndSendNotifications, { timezone: "Asia/Dubai" });
        } else {
            const cronString = `${minute} ${hour} * * *`;
            notificationTask = cron.schedule(cronString, checkAndSendNotifications, { timezone: "Asia/Dubai" });
            console.log(`Scheduled automated notifications to run daily at ${dailyBriefingTime} (Asia/Dubai).`);
        }
    } else {
        console.log('Automated notifications are disabled, task not scheduled.');
    }
};


// --- API Endpoints ---
app.post('/api/settings', async (req, res) => {
    const currentSettings = await readJSON(SETTINGS_FILE, {});
    const newSettings = { ...currentSettings, ...req.body };
    await writeJSON(SETTINGS_FILE, newSettings);
    // Reschedule notifications based on potentially new settings
    await rescheduleNotificationTask();
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
        openaiModel: 'gpt-4o',
        openrouterModel: 'anthropic/claude-3-haiku',
        isAutoNotifyEnabled: false,
        notifyDaysBefore: 7,
        isDailyBriefingEnabled: false,
        dailyBriefingTime: '08:00',
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
            // Use a common, reliable model for testing the key
            await handleOpenAiRequest(apiKey, 'gpt-3.5-turbo', [{ role: 'user', content: 'test' }]);
        } else if (provider === 'openrouter') {
            if (!apiKey) throw new Error("API Key is required.");
            // Use a free model for testing the key
            await handleOpenRouterRequest(apiKey, 'mistralai/mistral-7b-instruct-free', [{ role: 'user', content: 'test' }]);
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
  const { aiProvider, openaiApiKey, openrouterApiKey, openaiModel, openrouterModel } = settings;

  try {
    let result;
    if (action === 'generateMarketingIdeas') {
        const prompt = `You are an expert marketing consultant for e-commerce sellers in the UAE. For the upcoming event '${payload.event.name}' (${payload.event.category}), generate 3 short, actionable, creative marketing ideas. Ensure the output is a valid JSON array of strings.`;
        if (aiProvider === 'openai') {
            result = await handleOpenAiRequest(openaiApiKey, openaiModel, [{ role: 'user', content: prompt }], true);
        } else if (aiProvider === 'openrouter') {
            result = await handleOpenRouterRequest(openrouterApiKey, openrouterModel, [{ role: 'user', content: prompt }], true);
        } else {
            result = await handleGeminiRequest(prompt, true);
        }
    } else if (action === 'discoverEvents') {
        const { year, month } = payload;
        const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
        const prompt = `Using Google Search, find key commercial, cultural, sporting, or trending events relevant to e-commerce sellers in the UAE for ${monthName} ${year}. Return the result as a JSON array of objects. Each object must have 'date' (YYYY-MM-DD string), 'name' (string), and 'category' (string). Categories can be: 'E-commerce Sale', 'Global Event', 'Cultural', 'Sporting', 'Trending'. Do not include well-known holidays like New Year's or National Day unless there is a specific new event associated with them this year. Focus on discoverable, potentially less-obvious events.`;
        
        if (aiProvider === 'openai') {
            const events = await handleOpenAiRequest(openaiApiKey, openaiModel, [{ role: 'user', content: prompt }], true);
            result = { events, sources: [] };
        } else if (aiProvider === 'openrouter') {
            const events = await handleOpenRouterRequest(openrouterApiKey, openrouterModel, [{ role: 'user', content: prompt }], true);
            result = { events, sources: [] };
        } else {
            if (!ai) throw new Error("Gemini AI service not configured on the server.");
    
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { tools: [{googleSearch: {}}] },
            });
            
            const text = response.text.trim();
            let eventsResult = [];
            try {
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
                eventsResult = JSON.parse(jsonMatch ? jsonMatch[1] : text);
            } catch (e) {
                console.error("Failed to parse JSON from Gemini response:", text);
                throw new Error("AI returned a non-JSON response.");
            }

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const sources = groundingChunks
                .map(chunk => chunk.web && { uri: chunk.web.uri, title: chunk.web.title })
                .filter(Boolean)
                .filter((source, index, self) => index === self.findIndex(s => s.uri === source.uri)); // Deduplicate sources

            result = { events: eventsResult, sources: sources };
        }
    } else if (action === 'chat') {
        const { message, history, events } = payload;
        const eventSummaries = events.map(e => ` - ${e.date.substring(0, 10)}: ${e.type === 'user' ? e.title : e.name}`).join('\n');
        const systemPrompt = `You are a helpful and clever calendar assistant for an e-commerce seller in the UAE. Your tone is encouraging and proactive. Use the provided calendar events to answer questions. Current events:\n${eventSummaries}`;
        
        let messages = history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content }));
        messages.push({ role: 'user', content: message });
        
        const chatMessages = aiProvider === 'gemini' 
            ? [{ role: 'user', content: `${systemPrompt}\n\nUser: ${message}`}]
            : [{ role: 'system', content: systemPrompt }, ...messages];

        if (aiProvider === 'openai') {
            result = await handleOpenAiRequest(openaiApiKey, openaiModel, chatMessages);
        } else if (aiProvider === 'openrouter') {
            result = await handleOpenRouterRequest(openrouterApiKey, openrouterModel, chatMessages);
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

app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  
  // Schedule background tasks
  discoveryTask = cron.schedule('0 3 * * *', runDiscoveryTask, { timezone: "Asia/Dubai" });
  console.log('Scheduled automated event discovery to run daily at 3:00 AM (Asia/Dubai).');
  
  await rescheduleNotificationTask();

  // Run tasks on startup after a short delay
  setTimeout(() => {
    runDiscoveryTask().catch(err => console.error("Error during initial discovery task:", err));
    checkAndSendNotifications().catch(err => console.error("Error during initial notification task:", err));
  }, 5000); 
});
