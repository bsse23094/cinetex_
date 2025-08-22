


import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { User } from '../../../core/models/user.model';
import { StorageService } from '../../../core/services/storage.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [CommonModule],
  providers: [DatePipe]
})
export class ProfileComponent implements OnInit {
  user?: User;

  constructor(private storage: StorageService) {}

  ngOnInit() {
    this.user = this.storage.getCurrentUser();
  }
}
