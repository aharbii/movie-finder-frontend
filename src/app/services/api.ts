import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id?: number;
  role: 'user' | 'ai' | 'tool';
  content: string;
}

export interface Conversation {
  id: number;
  title: string;
  messages: ChatMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${environment.apiUrl}/chat/conversations`);
  }

  sendMessage(message: string, conversationId?: number): Observable<ChatMessage> {
    const payload = { message, conversation_id: conversationId };
    return this.http.post<ChatMessage>(`${environment.apiUrl}/chat/`, payload);
  }

  submitFeedback(messageId: number, movieTitle: string, isPositive: boolean): Observable<any> {
    return this.http.post(`${environment.apiUrl}/feedback/`, {
      message_id: messageId,
      movie_title: movieTitle,
      is_positive: isPositive
    });
  }
}
