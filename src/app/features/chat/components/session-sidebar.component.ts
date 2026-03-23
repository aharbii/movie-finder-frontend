import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatSession } from '../../../core/models';

@Component({
  selector: 'app-session-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-brand">Movie Finder</span>
        <button class="btn-new" (click)="newChat()" title="New conversation">+</button>
      </div>

      <nav class="session-list">
        @for (session of chat.sessions(); track session.session_id) {
          <div
            class="session-item"
            [class.active]="session.session_id === chat.activeSessionId()"
            (click)="selectSession(session.session_id)"
          >
            <span class="session-title">{{ session.title }}</span>
            <span class="session-phase phase-{{ session.phase }}">
              {{ session.phase }}
            </span>
            <button
              class="btn-delete"
              title="Delete conversation"
              (click)="deleteSession($event, session.session_id)"
            >✕</button>
          </div>
        } @empty {
          <p class="no-sessions">No conversations yet.</p>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="btn-logout" (click)="auth.logout()">Sign out</button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 260px;
      min-width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      height: 100vh;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-brand {
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--accent);
    }

    .btn-new {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      font-size: 1.3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover { background: var(--bg); }
    }

    .session-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      font-size: 0.88rem;

      &:hover { background: var(--bg); }
      &:hover .btn-delete { opacity: 1; }
      &.active { background: rgba(99, 102, 241, 0.15); }
    }

    .btn-delete {
      flex-shrink: 0;
      margin-left: auto;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.7rem;
      border-radius: 4px;
      cursor: pointer;
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.1s, color 0.1s;

      &:hover { color: var(--error); background: rgba(239,68,68,0.1); }
    }

    .session-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-phase {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 999px;
      margin-left: 6px;
      flex-shrink: 0;

      &.phase-discovery  { background: #1d4ed8; color: #bfdbfe; }
      &.phase-confirmation { background: #92400e; color: #fde68a; }
      &.phase-qa          { background: #065f46; color: #a7f3d0; }
    }

    .no-sessions {
      color: var(--text-muted);
      font-size: 0.85rem;
      padding: 1rem 0.75rem;
    }

    .sidebar-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border);
    }

    .btn-logout {
      width: 100%;
      padding: 0.5rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.88rem;
      cursor: pointer;

      &:hover { color: var(--error); border-color: var(--error); }
    }
  `],
})
export class SessionSidebarComponent {
  constructor(
    public chat: ChatService,
    public auth: AuthService,
  ) {}

  newChat(): void {
    this.chat.newSession();
  }

  selectSession(session_id: string): void {
    this.chat.selectSession(session_id);
  }

  deleteSession(event: MouseEvent, session_id: string): void {
    event.stopPropagation();
    this.chat.deleteSession(session_id);
  }
}
