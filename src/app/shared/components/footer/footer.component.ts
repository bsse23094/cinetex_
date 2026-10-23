import { Component } from '@angular/core';
import { MagneticDirective } from '../../directives/cinema-hover.directive';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MagneticDirective]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
