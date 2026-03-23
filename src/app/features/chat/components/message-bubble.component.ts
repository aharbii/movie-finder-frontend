import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../../core/models';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bubble-wrap" [class.user]="msg().role === 'user'">
      <div class="bubble" [class.assistant]="msg().role === 'assistant'">
        <p class="bubble-text">{{ msg().content }}</p>
        <span class="bubble-time">{{ msg().created_at | date:'shortTime' }}</span>
      </div>
    </div>
  `,
  styles: [`
    .bubble-wrap {
      display: flex;
      margin-bottom: 0.5rem;

      &.user { justify-content: flex-end; }
    }

    .bubble {
      max-width: 72%;
      padding: 0.6rem 1rem;
      border-radius: 12px;
      background: var(--accent);
      color: #fff;

      &.assistant {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
      }
    }

    .bubble-text {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .bubble-time {
      display: block;
      font-size: 0.7rem;
      opacity: 0.6;
      margin-top: 4px;
      text-align: right;
    }
  `],
})
export class MessageBubbleComponent {
  msg = input.required<Message>();
}
