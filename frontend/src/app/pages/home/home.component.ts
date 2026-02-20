import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

// ✅ Swiper (web components)
import { register } from 'swiper/element/bundle';
register();

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // ✅ important pour swiper-container
})
export class HomeComponent {}