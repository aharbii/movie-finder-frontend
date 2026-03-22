import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.scss',
})
export class MovieCard {
  @Input() title: string = '';
  @Input() year: number | null = null;
  @Input() poster: string = '';
  @Input() plot: string = '';
  @Input() rating: number | null = null;
  @Input() director: string = '';
  @Input() actors: string[] = [];

  @Output() selected = new EventEmitter<string>();

  posterError = false;

  onPosterError() {
    this.posterError = true;
  }

  get shortPlot(): string {
    return this.plot?.length > 160 ? this.plot.substring(0, 157) + '...' : this.plot;
  }

  get ratingStars(): string {
    if (!this.rating) return '';
    const filled = Math.round(this.rating / 2);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  select() {
    this.selected.emit(this.title);
  }
}
