import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, switchMap } from 'rxjs';
import { TMDBService } from './tmdb.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  
  private systemPrompt = `You are CineBot, a helpful movie and TV show assistant for Cinetex - a streaming companion app. 
Your capabilities:
- Recommend movies and TV shows based on user preferences
- Provide details about movies, cast, directors, and plots
- Help users find content by genre, mood, or similar titles
- Answer questions about actors, filmographies, and movie trivia
- Suggest what to watch based on user's mood or occasion

Keep responses concise and engaging. When recommending movies, include the title and a brief reason why.
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
    const messages = this.conversationHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const requestBody = {
      systemPrompt: this.systemPrompt,
      messages: messages
    };

    return this.http.post<{ response: string }>(this.WORKER_URL, requestBody).pipe(
      map(response => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date()
        };
        this.conversationHistory.push(assistantMessage);
        return response.response;
      }),
      catchError(error => {
        console.error('Chatbot error:', error);
        // Fallback response
        const fallbackResponse = this.getFallbackResponse(userMessage);
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date()
        };
        this.conversationHistory.push(assistantMessage);
        return of(fallbackResponse);
      })
    );
  }

  private getFallbackResponse(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest')) {
      return "I'd love to help you find something great to watch! Try searching for a genre like 'action movies' or 'romantic comedies' using the search bar above. You can also browse popular titles on the home page.";
    }
    
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      return "Hello! 👋 I'm CineBot, your movie companion. I can help you find movies, get info about actors, or suggest what to watch. What are you in the mood for today?";
    }
    
    if (lowerQuery.includes('help')) {
      return "I can help you with:\n• **Movie recommendations** - Tell me what genre or mood you're in\n• **Movie details** - Ask about any movie's plot, cast, or director\n• **Actor info** - Learn about your favorite actors\n• **What to watch** - Get suggestions based on your preferences\n\nJust ask away!";
    }
    
    return "I'm having trouble connecting right now. In the meantime, you can use the search bar to find movies or browse the popular titles on the home page!";
  }

  // Search for movies mentioned in chat
  searchMovieFromChat(title: string): Observable<MovieRecommendation[]> {
    return this.tmdb.searchMovies(title).pipe(
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
