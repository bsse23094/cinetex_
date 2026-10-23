import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { ChatbotService, ChatMessage } from '../../../core/services/chatbot.service';
import { PosterUrlPipe } from '../../pipes/poster-url.pipe';

@Component({
  selector: 'app-chatbot', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PosterUrlPipe],
  templateUrl: './chatbot.component.html', styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatTrigger') chatTrigger?: ElementRef<HTMLButtonElement>;
  private chatbotService = inject(ChatbotService);
  private request?: Subscription;
  private picksRequest?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  isOpen = false;
  userMessage = '';
  isLoading = false;
  messages: ChatMessage[] = [];
  readonly quickActions = [
    { label: 'Something unexpected', note: 'A little off the beaten path', message: 'Recommend three lesser-known films with surprising stories. No spoilers.' },
    { label: 'A beautiful escape', note: 'Get lost in another world', message: 'Suggest three visually beautiful, immersive films for an escape tonight.' },
    { label: 'Keep me guessing', note: 'One more twist', message: 'Recommend three clever, suspenseful thrillers. Keep it spoiler-free.' }
  ];
  ngOnInit(): void { this.messages = this.chatbotService.getConversationHistory(); }
  toggleChat(): void {
    if (this.isOpen) { this.closeChat(); return; }
    this.isOpen = true;
    this.afterRender(() => { this.scrollToBottom(); this.messageInput?.nativeElement.focus(); });
  }
  closeChat(): void { this.isOpen = false; this.chatTrigger?.nativeElement.focus(); }
  sendMessage(): void {
    const message = this.userMessage.trim().slice(0, 1200);
    if (!message || this.isLoading) return;
    this.userMessage = '';
    this.isLoading = true;
    this.picksRequest?.unsubscribe();
    const response = this.chatbotService.sendMessage(message);
    this.messages = this.chatbotService.getConversationHistory();
    this.afterRender(() => this.scrollToBottom());
    this.request = response.subscribe({
      next: () => {
        this.messages = this.chatbotService.getConversationHistory();
        this.isLoading = false;
        const answer = this.messages[this.messages.length - 1];
        if (answer && !answer.failed) this.loadPicks(answer);
        this.afterRender(() => this.scrollToBottom());
      },
      error: () => { this.isLoading = false; }
    });
  }
  private loadPicks(answer: ChatMessage): void {
    const titles = [...answer.content.matchAll(/\*\*([^*\n]+)\*\*/g)]
      .map(match => match[1].replace(/\s*\(\d{4}\)\s*$/, '').trim()).filter(title => title.length < 100).slice(0, 3);
    if (!titles.length) return;
    this.picksRequest = forkJoin(titles.map(title => this.chatbotService.searchMovieFromChat(title))).subscribe(groups => {
      const seen = new Set<number>();
      answer.picks = groups.flatMap((results, index) => {
        const match = results.find(movie => movie.title.toLocaleLowerCase() === titles[index].toLocaleLowerCase());
        if (!match || seen.has(match.id)) return [];
        seen.add(match.id); return [match];
      });
      this.afterRender(() => this.scrollToBottom());
    });
  }
  sendQuickAction(message: string): void { this.userMessage = message; this.sendMessage(); }
  retry(): void {
    const message = this.chatbotService.prepareRetry();
    if (message) this.sendQuickAction(message);
  }
  clearChat(): void {
    this.request?.unsubscribe(); this.picksRequest?.unsubscribe();
    this.chatbotService.clearHistory(); this.messages = []; this.isLoading = false;
    this.messageInput?.nativeElement.focus();
  }
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); this.sendMessage(); }
  }
  private afterRender(callback: () => void): void { clearTimeout(this.timer); this.timer = setTimeout(callback, 40); }
  private scrollToBottom(): void {
    const element = this.messagesContainer?.nativeElement;
    if (element) element.scrollTop = element.scrollHeight;
  }
  formatMessage(content: string): string {
    return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  ngOnDestroy(): void { this.request?.unsubscribe(); this.picksRequest?.unsubscribe(); clearTimeout(this.timer); }
}
