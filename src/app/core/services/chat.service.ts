import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatSession,
  ConfirmedMovie,
  Message,
  Phase,
  SessionHistory,
  SessionSummary,
  SseDoneEvent,
  SseEvent,
} from '../models';
import { AuthService } from './auth.service';

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * ChatService manages all sessions.
 *
 * SSE streaming note
 * ------------------
 * We use `fetch()` with a `ReadableStream` decoder instead of `EventSource`
 * because `EventSource` is GET-only and cannot carry a JSON request body.
 * We parse the `data: ` prefix manually, JSON-decode each payload, accumulate
 * `token` events into a live buffer, and finalise on the `done` event.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly base = environment.apiUrl;

  /** All known sessions, newest first */
  readonly sessions = signal<ChatSession[]>([]);
  readonly activeSessionId = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  get activeSession(): ChatSession | undefined {
    const id = this.activeSessionId();
    return this.sessions().find((s) => s.session_id === id);
  }

  // ── Session management ────────────────────────────────────────────────────

  newSession(): string {
    const session_id = uuid();
    const session: ChatSession = {
      session_id,
      title: 'New conversation',
      phase: 'discovery',
      messages: [],
      streaming: false,
    };
    this.sessions.update((list) => [session, ...list]);
    this.activeSessionId.set(session_id);
    return session_id;
  }

  /** Called once after login or on page reload to populate the sidebar. */
  async restoreSessions(): Promise<void> {
    try {
      const summaries = await firstValueFrom(
        this.http.get<SessionSummary[]>(`${this.base}/chat/sessions`),
      );
      const restored: ChatSession[] = summaries.map((s) => {
        const movie = s.confirmed_movie ? this.normalizeMovie(s.confirmed_movie) : undefined;
        return {
          session_id: s.session_id,
          title: this.sessionTitle(s.phase, movie, s.first_message),
          phase: s.phase,
          messages: [],
          confirmed_movie: movie,
          streaming: false,
        };
      });
      this.sessions.set(restored);
      if (restored.length) {
        await this.loadHistory(restored[0].session_id);
      }
    } catch {
      // Endpoint not yet available or network error — start with empty state
    }
  }

  async loadHistory(session_id: string): Promise<void> {
    const history = await firstValueFrom(
      this.http.get<SessionHistory>(
        `${this.base}/chat/${session_id}/history`,
      ),
    );
    const movie = history.confirmed_movie
      ? this.normalizeMovie(history.confirmed_movie)
      : undefined;
    this.upsertSession({
      session_id: history.session_id,
      title: this.sessionTitle(history.phase, movie, this.deriveTitle(history.messages)),
      phase: history.phase,
      messages: history.messages,
      confirmed_movie: movie,
      streaming: false,
    });
    this.activeSessionId.set(session_id);
  }

  selectSession(session_id: string): void {
    this.activeSessionId.set(session_id);
  }

  async deleteSession(session_id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.base}/chat/${session_id}`, { observe: 'response' }),
    );
    this.sessions.update((list) => list.filter((s) => s.session_id !== session_id));
    if (this.activeSessionId() === session_id) {
      const remaining = this.sessions();
      this.activeSessionId.set(remaining.length ? remaining[0].session_id : null);
    }
  }

  // ── Sending a message via SSE ─────────────────────────────────────────────

  async sendMessage(session_id: string, text: string): Promise<void> {
    // Optimistically append user message
    const userMsg: Message = {
      id: uuid(),
      session_id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    this.appendMessage(session_id, userMsg);
    this.setStreaming(session_id, true);

    // Placeholder assistant message updated token-by-token
    const assistantMsgId = uuid();
    const assistantMsg: Message = {
      id: assistantMsgId,
      session_id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    this.appendMessage(session_id, assistantMsg);

    try {
      await this.streamSse(session_id, text, assistantMsgId);
    } catch (err) {
      this.updateMessageContent(session_id, assistantMsgId, '[Error — please retry]');
    } finally {
      this.setStreaming(session_id, false);
    }
  }

  // ── Private SSE implementation ────────────────────────────────────────────

  private async streamSse(
    session_id: string,
    message: string,
    assistantMsgId: string,
  ): Promise<void> {
    const token = this.auth.getAccessToken();
    const response = await fetch(`${this.base}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ session_id, message }),
    });

    if (response.status === 401) {
      const refreshed = await this.auth.refresh();
      if (!refreshed) throw new Error('Unauthorized');
      // Retry once after refresh
      return this.streamSse(session_id, message, assistantMsgId);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) chunk in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        let event: SseEvent;
        try {
          event = JSON.parse(payload) as SseEvent;
        } catch {
          continue;
        }

        if (event.type === 'token') {
          this.appendToMessage(session_id, assistantMsgId, event.content);
        } else if (event.type === 'done') {
          const done = event as SseDoneEvent;
          // qa_agent uses ainvoke (no streaming), so no token events are
          // emitted. Fall back to the reply field from the done event.
          const session = this.sessions().find((s) => s.session_id === session_id);
          const placeholder = session?.messages.find((m) => m.id === assistantMsgId);
          if (!placeholder?.content && done.reply) {
            this.updateMessageContent(session_id, assistantMsgId, done.reply);
          }
          this.applyDoneEvent(session_id, done);
        }
      }
    }
  }

  // ── Signal mutation helpers ───────────────────────────────────────────────

  private upsertSession(session: ChatSession): void {
    this.sessions.update((list) => {
      const idx = list.findIndex((s) => s.session_id === session.session_id);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = session;
        return next;
      }
      return [session, ...list];
    });
  }

  private updateSession(
    session_id: string,
    updater: (s: ChatSession) => ChatSession,
  ): void {
    this.sessions.update((list) =>
      list.map((s) => (s.session_id === session_id ? updater(s) : s)),
    );
  }

  private appendMessage(session_id: string, msg: Message): void {
    this.updateSession(session_id, (s) => ({
      ...s,
      messages: [...s.messages, msg],
      title: s.title === 'New conversation' && msg.role === 'user'
        ? this.truncate(msg.content)
        : s.title,
    }));
  }

  private appendToMessage(
    session_id: string,
    msgId: string,
    chunk: string,
  ): void {
    this.sessions.update((list) =>
      list.map((s) => {
        if (s.session_id !== session_id) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === msgId ? { ...m, content: m.content + chunk } : m,
          ),
        };
      }),
    );
  }

  private updateMessageContent(
    session_id: string,
    msgId: string,
    content: string,
  ): void {
    this.sessions.update((list) =>
      list.map((s) => {
        if (s.session_id !== session_id) return s;
        return {
          ...s,
          messages: s.messages.map((m) =>
            m.id === msgId ? { ...m, content } : m,
          ),
        };
      }),
    );
  }

  private applyDoneEvent(session_id: string, event: SseDoneEvent): void {
    const confirmed = event.confirmed_movie
      ? this.normalizeMovie(event.confirmed_movie)
      : undefined;

    this.updateSession(session_id, (s) => ({
      ...s,
      phase: event.phase,
      candidates: event.candidates,
      confirmed_movie: confirmed,
      title: this.sessionTitle(event.phase, confirmed, s.title),
    }));
  }

  private setStreaming(session_id: string, streaming: boolean): void {
    this.updateSession(session_id, (s) => ({ ...s, streaming }));
  }

  /** Normalise whatever shape the backend sends into a clean ConfirmedMovie. */
  normalizeMovie(raw: ConfirmedMovie | Record<string, unknown>): ConfirmedMovie {
    const r = raw as Record<string, unknown>;
    return {
      imdb_id: (r['imdb_id'] ?? '') as string,
      title: (r['title'] ?? r['imdb_title'] ?? r['rag_title'] ?? '') as string,
      year: (r['year'] ?? r['imdb_year'] ?? r['rag_year']) as number | undefined,
      rating: (r['rating'] ?? r['imdb_rating']) as number | undefined,
      plot: (r['plot'] ?? r['imdb_plot'] ?? r['rag_plot']) as string | undefined,
      genres: (r['genres'] ?? r['imdb_genres'] ?? r['rag_genre'] ?? []) as string[],
      poster_url: (r['poster_url'] ?? r['imdb_poster_url']) as string | undefined,
      directors: (r['directors'] ?? r['imdb_directors'] ?? []) as string[],
      stars: (r['stars'] ?? r['imdb_stars'] ?? []) as string[],
    };
  }

  /** Derive the session display title — movie name for qa, first message otherwise. */
  private sessionTitle(
    phase: Phase,
    movie: ConfirmedMovie | undefined,
    fallback: string | null | undefined,
  ): string {
    if (phase === 'qa' && movie?.title) {
      return `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
    }
    return fallback ? this.truncate(fallback) : 'Conversation';
  }

  private deriveTitle(messages: Message[]): string {
    const first = messages.find((m) => m.role === 'user');
    return first ? this.truncate(first.content) : 'Conversation';
  }

  private truncate(s: string, max = 40): string {
    return s.length > max ? s.slice(0, max) + '…' : s;
  }
}
