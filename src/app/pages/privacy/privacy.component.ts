import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css']
})

export class PrivacyComponent {
  openSupport(): void {
    try { window.open('https://github.com/bsse23094/cinetex_', '_blank'); } catch (e) { console.error(e); }
  }
}
