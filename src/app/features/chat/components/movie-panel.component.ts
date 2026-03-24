import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmedMovie } from '../../../core/models';

@Component({
  selector: 'app-movie-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="movie-panel">
      @if (movie().poster_url) {
        <a
          [href]="
            movie().imdb_id ? 'https://www.imdb.com/title/' + movie().imdb_id : movie().poster_url
          "
          target="_blank"
          rel="noopener"
        >
          <img class="poster" [src]="movie().poster_url" [alt]="movie().title + ' poster'" />
        </a>
      }
      <div class="movie-info">
        <h2 class="movie-title">{{ movie().title }}</h2>
        @if (movie().year) {
          <span class="movie-year">{{ movie().year }}</span>
        }
        @if (movie().rating) {
          <div class="movie-rating">★ {{ movie().rating?.toFixed(1) }}</div>
        }
        @if (movie().genres?.length) {
          <div class="genre-chips">
            @for (g of movie().genres; track g) {
              <span class="chip">{{ g }}</span>
            }
          </div>
        }
        @if (movie().directors?.length) {
          <div class="movie-meta">
            <span class="meta-label">Director</span>
            {{ movie().directors!.join(', ') }}
          </div>
        }
        @if (movie().stars?.length) {
          <div class="movie-meta">
            <span class="meta-label">Stars</span>
            {{ movie().stars!.join(', ') }}
          </div>
        }
        @if (movie().plot) {
          <p class="movie-plot">{{ movie().plot }}</p>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      .movie-panel {
        width: 300px;
        min-width: 300px;
        background: var(--surface);
        border-left: 1px solid var(--border);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .poster {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
      }

      .movie-info {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .movie-title {
        font-size: 1.2rem;
        font-weight: 700;
        margin: 0;
      }

      .movie-year {
        font-size: 0.9rem;
        color: var(--text-muted);
      }

      .movie-rating {
        font-size: 1rem;
        font-weight: 600;
        color: #f59e0b;
      }

      .genre-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .chip {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.15);
        color: var(--accent);
      }

      .movie-meta {
        font-size: 0.82rem;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .meta-label {
        display: block;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        opacity: 0.6;
        margin-bottom: 1px;
      }

      .movie-plot {
        font-size: 0.88rem;
        line-height: 1.55;
        color: var(--text-muted);
        margin: 0;
      }

      a {
        display: block;
        line-height: 0;
      }

      .poster:hover {
        opacity: 0.88;
        transition: opacity 0.15s;
      }
    `,
  ],
})
export class MoviePanelComponent {
  movie = input.required<ConfirmedMovie>();
}
