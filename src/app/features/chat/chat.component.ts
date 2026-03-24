import { OnInit, ElementRef } from '@angular/core';
import { Component, computed, afterNextRender, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { SessionSidebarComponent } from './components/session-sidebar.component';
import { MessageBubbleComponent } from './components/message-bubble.component';
import { CandidateCardsComponent } from './components/candidate-cards.component';
import { MoviePanelComponent } from './components/movie-panel.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SessionSidebarComponent,
    MessageBubbleComponent,
    CandidateCardsComponent,
    MoviePanelComponent,
  ],
  template: `
    <div class="chat-layout">
      <!-- Sidebar -->
      <app-session-sidebar />

      <!-- Main area -->
      <div class="chat-main">
        @if (session(); as s) {
          <!-- Message list -->
          <div class="messages-area" #scrollAnchor>
            @for (msg of s.messages; track msg.id) {
              @if (msg.content) {
                <app-message-bubble [msg]="msg" />
              }
            }

            @if (s.streaming) {
              <div class="typing-indicator"><span></span><span></span><span></span></div>
            }
          </div>

          <!-- Phase panels -->
          @if (s.phase === 'confirmation' && s.candidates?.length) {
            <app-candidate-cards [candidates]="s.candidates!" />
          }

          <!-- Input bar -->
          <div class="input-bar">
            <textarea
              class="message-input"
              [(ngModel)]="inputText"
              placeholder="Ask about a movie…"
              rows="1"
              (keydown.enter)="onEnter($event)"
              [disabled]="s.streaming"
            ></textarea>
            <button class="btn-send" (click)="send()" [disabled]="s.streaming || !inputText.trim()">
              {{ s.streaming ? '…' : '→' }}
            </button>
          </div>
        } @else {
          <!-- Empty state -->
          <div class="empty-state">
            <p class="empty-icon">🎬</p>
            <h2>Welcome to Movie Finder</h2>
            <p>Start a new conversation from the sidebar to discover your next film.</p>
            <button class="btn-primary" (click)="newChat()">New conversation</button>
          </div>
        }
      </div>

      <!-- QA movie panel (right sidebar) -->
      @if (session()?.phase === 'qa' && session()?.confirmed_movie) {
        <app-movie-panel [movie]="session()!.confirmed_movie!" />
      }
    </div>
  `,
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  inputText = '';
  private scrollRef = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  constructor(public chat: ChatService) {
    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  ngOnInit(): void {
    this.chat.restoreSessions();
  }

  session = computed(() => this.chat.activeSession);

  newChat(): void {
    this.chat.newSession();
  }

  async send(): Promise<void> {
    const text = this.inputText.trim();
    if (!text) return;
    const session = this.session();
    if (!session) {
      // Auto-create a session if none active
      const id = this.chat.newSession();
      this.inputText = '';
      await this.chat.sendMessage(id, text);
    } else {
      this.inputText = '';
      await this.chat.sendMessage(session.session_id, text);
    }
    this.scrollToBottom();
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.send();
    }
  }

  private scrollToBottom(): void {
    const el = this.scrollRef()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
