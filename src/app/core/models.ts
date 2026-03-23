// ── Auth ─────────────────────────────────────────────────────────────────────

export interface UserCreate {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type Phase = 'discovery' | 'confirmation' | 'qa';

export interface ChatRequest {
  session_id: string;
  message: string;
}

export interface SseTokenEvent {
  type: 'token';
  content: string;
}

export interface MovieCandidate {
  rag_title: string;
  imdb_id: string;
  confidence: number;
  imdb_poster_url?: string;
}

export interface ConfirmedMovie {
  imdb_id: string;
  title: string;
  year?: number;
  genres?: string[];
  plot?: string;
  rating?: number;
  poster_url?: string;
  directors?: string[];
  stars?: string[];
  [key: string]: unknown;
}

export interface SseDoneEvent {
  type: 'done';
  session_id: string;
  reply: string;
  phase: Phase;
  candidates?: MovieCandidate[];
  confirmed_movie?: ConfirmedMovie;
}

export type SseEvent = SseTokenEvent | SseDoneEvent;

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SessionSummary {
  session_id: string;
  phase: Phase;
  updated_at: string;
  first_message?: string | null;
  confirmed_movie?: ConfirmedMovie | null;
}

export interface SessionHistory {
  session_id: string;
  phase: Phase;
  messages: Message[];
  confirmed_movie?: ConfirmedMovie | null;
}

// ── UI session state ─────────────────────────────────────────────────────────

export interface ChatSession {
  session_id: string;
  /** First user message used as display label */
  title: string;
  phase: Phase;
  messages: Message[];
  candidates?: MovieCandidate[];
  confirmed_movie?: ConfirmedMovie;
  /** True while waiting for the SSE stream to complete */
  streaming: boolean;
}
