import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Conversation, ChatMessage } from '../../services/api';
import { AuthService } from '../../services/auth';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MovieCard } from '../movie-card/movie-card';

export interface ParsedMovieCard {
  title: string;
  year: number | null;
  poster: string;
  plot: string;
  rating: number | null;
  director: string;
  actors: string[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MovieCard],
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

  onMovieCardSelected(title: string) {
    this.query = `Yes, it's "${title}"`;
    this.sendMessage();
  }

  submitFeedback(msgId: number, isPositive: boolean) {
    this.api.submitFeedback(msgId, 'General Response', isPositive).subscribe(() => {
      alert('Feedback recorded. Thank you!');
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Detects whether an AI message is a Phase-1 movie grid response.
  // Looks for at least 2 of the "### Title (Year)" heading pattern.
  // ────────────────────────────────────────────────────────────────────────────
  hasMovieCards(content: string): boolean {
    const matches = content.match(/^###\s+.+\s+\(\d{4}\)/gm);
    return !!matches && matches.length >= 2;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Parses the agent's markdown movie blocks into structured card objects.
  // Expected format per movie:
  //   ### Title (Year)
  //   ![Poster](url)
  //   **Director**: ... **Rating**: ... **Actors**: ...
  //   **Plot**: ...
  // ────────────────────────────────────────────────────────────────────────────
  parseMovieCards(content: string): ParsedMovieCard[] {
    // Split on ### headings to isolate each movie block
    const blocks = content.split(/\n(?=###\s)/);
    const cards: ParsedMovieCard[] = [];

    for (const block of blocks) {
      const headingMatch = block.match(/^###\s+(.+?)\s+\((\d{4})\)/m);
      if (!headingMatch) continue;

      const title = headingMatch[1].trim();
      const year = parseInt(headingMatch[2], 10);

      const posterMatch = block.match(/!\[[^\]]*\]\(([^)]+)\)/);
      const poster = posterMatch ? posterMatch[1].trim() : '';

      const directorMatch = block.match(/\*\*Director\*\*[:\s]+([^\n*]+)/i);
      const director = directorMatch ? directorMatch[1].trim().replace(/\s+\*\*.*/, '') : '';

      const ratingMatch = block.match(/\*\*Rating\*\*[:\s]+([\d.]+)/i);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

      const actorsMatch = block.match(/\*\*Actors?\*\*[:\s]+([^\n]+)/i);
      const actors = actorsMatch
        ? actorsMatch[1].split(/[,，]/).map(a => a.trim()).filter(a => a)
        : [];

      const plotMatch = block.match(/\*\*Plot\*\*[:\s]+([^\n]+(?:\n(?!###|\*\*)[^\n]*)*)/i);
      const plot = plotMatch ? plotMatch[1].trim() : '';

      cards.push({ title, year, poster, plot, rating, director, actors });
    }

    return cards;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Parses the final trailing text after the last movie block (the feedback ask).
  // ────────────────────────────────────────────────────────────────────────────
  parsePostCardsText(content: string): SafeHtml {
    // Find everything after the last movie block's plot line
    const lastMovieSplit = content.lastIndexOf('---');
    const trailingText = lastMovieSplit >= 0
      ? content.substring(lastMovieSplit + 3).trim()
      : '';
    return this.parseMarkdownToHtml(trailingText || content);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Full markdown to HTML parser for Phase 2/3 conversational responses.
  // ────────────────────────────────────────────────────────────────────────────
  parseMarkdownToHtml(text: string): SafeHtml {
    let html = text;

    // Images
    html = html.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" referrerpolicy="no-referrer" class="w-48 rounded-xl shadow-lg my-4 border border-white/10" />'
    );
    // H3 headings
    html = html.replace(
      /^###\s+(.+)$/gm,
      '<h3 class="text-base font-bold text-white mt-4 mb-1">$1</h3>'
    );
    // H2 headings
    html = html.replace(
      /^##\s+(.+)$/gm,
      '<h2 class="text-lg font-bold text-accent mt-5 mb-2">$1</h2>'
    );
    // Bold
    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="text-white font-semibold">$1</strong>'
    );
    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr class="border-white/10 my-4" />');
    // Unordered list items
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4 list-disc text-zinc-300 mb-1">$1</li>');
    // Ordered list items
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-zinc-300 mb-1">$1</li>');
    // Newlines to <br>
    html = html.replace(/\n{2,}/g, '<br /><br />');
    html = html.replace(/\n/g, '<br />');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get loadingLabel(): string {
    const lastMsg = this.activeConversation?.messages.slice().reverse().find(m => m.role === 'user');
    const content = lastMsg?.content?.toLowerCase() ?? '';
    if (content.includes('yes') || content.includes('it\'s') || content.includes('that\'s')) {
      return 'Fetching movie details...';
    }
    if (content.includes('family') || content.includes('kid') || content.includes('actor') || content.includes('who')) {
      return 'Consulting IMDB...';
    }
    return 'Searching RAG & IMDB...';
  }

  logout() {
    this.auth.logout();
  }
}
