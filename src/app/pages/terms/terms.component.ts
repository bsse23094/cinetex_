import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.css']
})
export class TermsComponent {
  openRepo(): void {
    try { window.open('https://github.com/bsse23094/cinetex_', '_blank'); } catch (e) { console.error(e); }
  }
}
