import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { SafeHtml } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import type { Message } from '../../../core/models';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bubble-wrap" [class.user]="msg().role === 'user'">
      <div class="bubble" [class.assistant]="msg().role === 'assistant'">
        @if (msg().role === 'assistant') {
          <div class="bubble-text markdown" [innerHTML]="html()"></div>
        } @else {
          <p class="bubble-text">{{ msg().content }}</p>
        }
        <span class="bubble-time">{{ msg().created_at | date: 'shortTime' }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .bubble-wrap {
        display: flex;
        margin-bottom: 0.5rem;

        &.user {
          justify-content: flex-end;
        }
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

      .markdown {
        white-space: normal;

        p {
          margin: 0 0 0.4em;
        }
        p:last-child {
          margin-bottom: 0;
        }
        strong {
          font-weight: 700;
        }
        em {
          font-style: italic;
        }
        ul,
        ol {
          margin: 0.3em 0 0.4em 1.2em;
          padding: 0;
        }
        li {
          margin-bottom: 0.15em;
        }
        code {
          font-family: monospace;
          font-size: 0.88em;
          background: rgba(0, 0, 0, 0.15);
          padding: 1px 4px;
          border-radius: 3px;
        }
      }

      .bubble-time {
        display: block;
        font-size: 0.7rem;
        opacity: 0.6;
        margin-top: 4px;
        text-align: right;
      }
    `,
  ],
})
export class MessageBubbleComponent {
  msg = input.required<Message>();

  private sanitizer = inject(DomSanitizer);

  html = computed<SafeHtml>(() => {
    const raw = marked.parse(this.msg().content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });
}
