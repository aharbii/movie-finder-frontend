import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieCandidate } from '../../../core/models';

@Component({
  selector: 'app-candidate-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="candidates-panel">
      <p class="panel-label">I found some matches — tell me which one you mean!</p>
      <div class="cards-grid">
        @for (c of candidates(); track c.imdb_id) {
          <div class="card">
            @if (c.imdb_poster_url) {
              <a [href]="'https://www.imdb.com/title/' + c.imdb_id" target="_blank" rel="noopener">
                <img
                  class="card-poster"
                  [src]="c.imdb_poster_url"
                  [alt]="c.rag_title + ' poster'"
                />
              </a>
            } @else {
              <div class="card-poster-placeholder">🎬</div>
            }
            <div class="card-body">
              <span class="card-title">{{ c.rag_title }}</span>
              <div class="confidence-bar">
                <div
                  class="confidence-fill"
                  [style.width.%]="c.confidence * 100"
                  [class.high]="c.confidence >= 0.75"
                  [class.medium]="c.confidence >= 0.5 && c.confidence < 0.75"
                  [class.low]="c.confidence < 0.5"
                ></div>
              </div>
              <span class="confidence-label"> {{ (c.confidence * 100).toFixed(0) }}% match </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .candidates-panel {
        padding: 1rem;
        background: var(--surface);
        border-top: 1px solid var(--border);
      }

      .panel-label {
        font-size: 0.85rem;
        color: var(--text-muted);
        margin: 0 0 0.75rem;
      }

      .cards-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .card {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        min-width: 150px;
        max-width: 180px;
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      a {
        display: block;
        line-height: 0;
      }

      .card-poster {
        width: 100%;
        aspect-ratio: 2/3;
        object-fit: cover;
        display: block;

        &:hover {
          opacity: 0.85;
          transition: opacity 0.15s;
        }
      }

      .card-poster-placeholder {
        width: 100%;
        aspect-ratio: 2/3;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        background: var(--surface);
      }

      .card-body {
        padding: 0.6rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .card-title {
        font-weight: 600;
        font-size: 0.88rem;
        line-height: 1.3;
      }

      .confidence-bar {
        height: 4px;
        background: var(--border);
        border-radius: 2px;
        margin-top: 4px;
      }

      .confidence-fill {
        height: 100%;
        border-radius: 2px;

        &.high {
          background: #10b981;
        }
        &.medium {
          background: #f59e0b;
        }
        &.low {
          background: #ef4444;
        }
      }

      .confidence-label {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class CandidateCardsComponent {
  candidates = input.required<MovieCandidate[]>();
}
