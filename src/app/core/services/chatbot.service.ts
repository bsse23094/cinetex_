import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, timeout } from 'rxjs';
import { TMDBService } from './tmdb.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  failed?: boolean;
  picks?: MovieRecommendation[];
}

export interface MovieRecommendation {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private tmdb = inject(TMDBService);

  // Cloudflare Worker endpoint - this proxies to Gemini API
  private readonly WORKER_URL = 'https://cinetex-chatbot.bsse23094.workers.dev';

  private conversationHistory: ChatMessage[] = [];

  private systemPrompt = `You are the Cinetex film concierge, a thoughtful movie and TV show assistant for Cinetex - a streaming companion app.
Your capabilities:
- Recommend movies and TV shows based on user preferences
- Provide details about movies, cast, directors, and plots
- Help users find content by genre, mood, or similar titles
- Answer questions about actors, filmographies, and movie trivia
- Suggest what to watch based on user's mood or occasion

Keep responses under 140 words, warm, specific, and spoiler-free. Suggest at most three titles, each with its release year and a one-sentence reason. Ask one useful follow-up question when preferences are unclear. Never invent availability on streaming services or claim live popularity data.
If users ask about non-movie topics, politely redirect to movie-related help.
Format movie titles in bold when mentioning them.`;

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  sendMessage(userMessage: string): Observable<string> {
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userChatMessage);

    // Build conversation context for the API
    const messages = this.conversationHistory.filter(msg => !msg.failed).slice(-16).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const requestBody = {
      systemPrompt: this.systemPrompt,
      messages: messages
    };

    return this.http.post<{ response: string }>(this.WORKER_URL, requestBody).pipe(
      timeout(20000),
      map(response => {
        if (!response.response?.trim()) throw new Error('Empty response');
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date()
        };
        this.conversationHistory.push(assistantMessage);
        return response.response;
      }),
      catchError(() => {
        const content = "The concierge couldn't connect. Try again in a moment, or keep exploring the film index.";
        this.conversationHistory.push({ role: 'assistant', content, timestamp: new Date(), failed: true });
        return of(content);
      })
    );
  }

  prepareRetry(): string | null {
    if (!this.conversationHistory.at(-1)?.failed) return null;
    this.conversationHistory.pop();
    const lastUser = this.conversationHistory.pop();
    return lastUser?.role === 'user' ? lastUser.content : null;
  }

  // Search for movies mentioned in chat
  searchMovieFromChat(title: string): Observable<MovieRecommendation[]> {
    return this.tmdb.searchMovies(title).pipe(
      timeout(8000),
      map((response: any) => {
        return response.results?.slice(0, 5).map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          release_date: movie.release_date
        })) || [];
      }),
      catchError(() => of([]))
    );
  }
}
