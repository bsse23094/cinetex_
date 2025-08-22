import { Component, OnInit  } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-movie-player',
  templateUrl: './movie-player.component.html',
    imports: [CommonModule , FormsModule],
  styleUrls: ['./movie-player.component.css']
})
export class MoviePlayerComponent implements OnInit {
  movieId: string | null = null;
  provider: string = 'vidcloud'; // default provider
  trustedVideoUrl: SafeResourceUrl | null = null;
  providers = [
    { key: 'upcloud', label: 'UpCloud' },
    { key: 'vidcloud', label: 'VidCloud' },
    { key: 'mixstream', label: 'MixStream' }
  ];

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.movieId = params.get('id');
      this.provider = params.get('provider') || 'vidcloud';
      this.setVideoUrl();
    });
  }

  setProvider(provider: string) {
    this.provider = provider;
    this.setVideoUrl();
  }

  setVideoUrl() {
    if (!this.movieId) return;
    let url = '';
    switch (this.provider) {
      case 'upcloud':
        url = `https://upcloud.example/embed/${this.movieId}`;
        break;
      case 'vidcloud':
        url = `https://vidcloud.example/embed/${this.movieId}`;
        break;
      case 'mixstream':
        url = `https://mixstream.example/embed/${this.movieId}`;
        break;
      default:
        url = `https://vidcloud.example/embed/${this.movieId}`;
    }
    this.trustedVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
