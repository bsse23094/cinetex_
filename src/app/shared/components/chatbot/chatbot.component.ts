import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatbotService, ChatMessage } from '../../../core/services/chatbot.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  private chatbotService = inject(ChatbotService);
  
  isOpen = false;
  isMinimized = false;
  userMessage = '';
  isLoading = false;
  messages: ChatMessage[] = [];
  
  readonly quickActions = [
    { label: 'Recommend a movie', message: 'Can you recommend a good movie to watch tonight?' },
    { label: 'Popular this week', message: 'What are the most popular movies this week?' },
    { label: 'Action movies', message: 'Suggest some exciting action movies' },
    { label: 'Help', message: 'What can you help me with?' }
  ];

  ngOnInit(): void {
    this.messages = this.chatbotService.getConversationHistory();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.isMinimized = false;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
      setTimeout(() => this.messageInput?.nativeElement?.focus(), 200);
    }
  }

  minimizeChat(): void {
    this.isMinimized = !this.isMinimized;
  }

  closeChat(): void {
    this.isOpen = false;
  }

  sendMessage(): void {
    const message = this.userMessage.trim();
    if (!message || this.isLoading) return;
    
    this.userMessage = '';
    this.isLoading = true;
    
    this.chatbotService.sendMessage(message).subscribe({
      next: () => {
        this.messages = this.chatbotService.getConversationHistory();
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: () => {
        this.messages = this.chatbotService.getConversationHistory();
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  sendQuickAction(message: string): void {
    this.userMessage = message;
    this.sendMessage();
  }

  clearChat(): void {
    this.chatbotService.clearHistory();
    this.messages = [];
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  formatMessage(content: string): string {
    // Convert **text** to <strong>text</strong>
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br>');
  }
}
