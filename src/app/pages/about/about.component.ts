import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})

export class AboutComponent {
  // Scroll to bottom helper used by the template
  scrollToBottom(): void {
    try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } catch (e) { console.error(e); }
  }
}
