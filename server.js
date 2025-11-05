
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Gemini API Proxy ---
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

// Initialize the GoogleGenAI instance only if the API key is available
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

app.post('/api/gemini/:action', async (req, res) => {
  if (!ai) {
    return res.status(503).json({ error: "AI service is not configured on the server." });
  }

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


// --- Static File Serving ---
// Serve static files from the project's root directory
app.use(express.static(__dirname));

// For any other request, serve the index.html file from the root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
