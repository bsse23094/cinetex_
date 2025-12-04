/**
 * Cinetex Chatbot - Cloudflare Worker
 * Proxies requests to Gemini API for movie recommendations
 * 
 * IMPORTANT: The API key should be set as a secret in Cloudflare:
 * wrangler secret put GEMINI_API_KEY
 * Then enter your new API key when prompted
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const { systemPrompt, messages } = await request.json();

      // Build the Gemini request - simplified format
      const geminiRequest = {
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nUser conversation:\n" + messages.map(m => `${m.role}: ${m.parts[0].text}`).join('\n') }]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Gemini API error:', JSON.stringify(data));
        return new Response(JSON.stringify({ 
          error: 'API error',
          details: data.error?.message || 'Unknown error',
          response: "I'm having trouble connecting right now. Try searching for movies using the search bar above!"
        }), {
          status: 200,
          headers: corsHeaders
        });
      }

      // Extract the response text
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I couldn't generate a response. Please try again!";

      return new Response(JSON.stringify({ response: responseText }), {
        status: 200,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Server error',
        details: error.message,
        response: "Something went wrong. Please try again later!"
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
  }
};
