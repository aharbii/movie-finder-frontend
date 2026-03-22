import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Conversation, ChatMessage } from '../../services/api';
import { AuthService } from '../../services/auth';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html'
})
export default class ChatComponent implements OnInit, AfterViewChecked {
  api = inject(ApiService);
  auth = inject(AuthService);
  sanitizer = inject(DomSanitizer);

  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  
  query = '';
  loading = false;
  
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  ngOnInit() {
    this.api.getConversations().subscribe(data => {
      this.conversations = data;
      if (data.length > 0) {
        this.activeConversation = data[data.length - 1];
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  selectConversation(conv: Conversation) {
    this.activeConversation = conv;
  }

  startNewConversation() {
    this.activeConversation = null;
  }

  sendMessage() {
    if (!this.query.trim() || this.loading) return;
    
    const userMessage: ChatMessage = { role: 'user', content: this.query };
    
    if (!this.activeConversation) {
      this.activeConversation = { id: 0, title: 'New Chat', messages: [userMessage] };
    } else {
      this.activeConversation.messages.push(userMessage);
    }
    
    const sendQuery = this.query;
    this.query = '';
    this.loading = true;

    this.api.sendMessage(sendQuery, this.activeConversation.id === 0 ? undefined : this.activeConversation.id).subscribe({
      next: (aiMessage) => {
        if (this.activeConversation?.id === 0) {
           this.api.getConversations().subscribe(data => {
               this.conversations = data;
               this.activeConversation = data[data.length - 1];
           });
        } else {
           this.activeConversation?.messages.push(aiMessage);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  submitFeedback(msgId: number, isPositive: boolean) {
    this.api.submitFeedback(msgId, 'General Response', isPositive).subscribe(() => {
        alert('Feedback recorded. Thank you!');
    });
  }

  parseMarkdownToHtml(text: string): SafeHtml {
    let html = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-48 rounded-xl shadow-lg my-4 border border-white/10" />');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  logout() {
    this.auth.logout();
  }
}
