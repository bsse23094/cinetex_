# Cinetex Chatbot - Cloudflare Worker

This folder contains the Cloudflare Worker that proxies requests to the Gemini API for the CineBot movie assistant.

## Deployment Instructions

### Option 1: Cloudflare Dashboard (Recommended for quick setup)

1. Go to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/)
2. Sign up or log in to your account
3. Click "Workers & Pages" → "Create Worker"
4. Name your worker: `cinetex-chatbot`
5. Copy the contents of `worker.js` and paste it into the editor
6. Click "Save and Deploy"
7. Your endpoint will be: `https://cinetex-chatbot.<your-subdomain>.workers.dev`

### Option 2: Using Wrangler CLI

1. Install Wrangler:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate:
   ```bash
   wrangler login
   ```

3. Create wrangler.toml:
   ```toml
   name = "cinetex-chatbot"
   main = "worker.js"
   compatibility_date = "2024-01-01"
   ```

4. Deploy:
   ```bash
   wrangler deploy
   ```

## Configuration

After deploying, update the `WORKER_URL` in `src/app/core/services/chatbot.service.ts` to match your worker URL:

```typescript
private readonly WORKER_URL = 'https://cinetex-chatbot.<your-subdomain>.workers.dev';
```

## Security Notes

- The API key is stored in the worker, not exposed to the client
- CORS is configured to allow requests from any origin (adjust as needed)
- Rate limiting can be added through Cloudflare's dashboard

## API Reference

**POST /**

Request body:
```json
{
  "systemPrompt": "You are CineBot...",
  "messages": [
    { "role": "user", "parts": [{ "text": "Recommend a movie" }] }
  ]
}
```

Response:
```json
{
  "response": "I'd recommend **The Shawshank Redemption**..."
}
```
