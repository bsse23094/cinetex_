import { Component , EventEmitter , Input , Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rating-stars.component.html',
  styleUrl: './rating-stars.component.css'
})
export class RatingStarsComponent {
  @Input() currentRating: number = 0;
  @Input() readonly: boolean = false;
  @Output() ratingChange = new EventEmitter<number>();

  hoverRating: number | null = null;

  setRating(rating: number) {
    if (this.readonly) return;
    this.currentRating = rating;
    this.ratingChange.emit(rating);
  }

  setHover(rating: number | null) {
    if (this.readonly) return;
    this.hoverRating = rating;
  }

  getDisplayRating(star: number) {
    return this.hoverRating != null ? star <= this.hoverRating : star <= this.currentRating;
  }
}
