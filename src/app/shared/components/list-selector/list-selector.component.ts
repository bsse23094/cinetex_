import { Component, Input } from '@angular/core';
import { PosterUrlPipe } from '../../pipes/poster-url.pipe';
import { Movie } from '../../../core/models/movie.model';

@Component({
  selector: 'app-list-selector',
  standalone: true,
  imports: [PosterUrlPipe],
  templateUrl: './list-selector.component.html',
  styleUrl: './list-selector.component.css'
})
export class ListSelectorComponent {
  @Input() movie!: Movie;
}
