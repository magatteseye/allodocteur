import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Material (si tu utilises déjà Angular Material dans le projet)
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent {
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  items = signal<any[]>([]);
  fullName = signal<string>(''); // pour afficher Bonjour ...

  ngOnInit() {
    this.fullName.set(localStorage.getItem('fullName') || '');
    this.loadMine();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  loadMine() {
    if (!this.isLoggedIn()) {
      this.items.set([]);
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    this.http.get<any[]>(`${environment.apiUrl}/appointments/me`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.items.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Impossible de charger vos rendez-vous');
      }
    });
  }

  cancel(id: string) {
    if (!confirm('Annuler ce rendez-vous ?')) return;

    this.loading.set(true);
    this.http.delete(`${environment.apiUrl}/appointments/${id}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => this.loadMine(),
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Impossible d’annuler le rendez-vous');
      }
    });
  }

  fmt(dt: string) {
    try {
      return new Date(dt).toLocaleString('fr-FR', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dt;
    }
  }

  badgeClass(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'CONFIRMED') return 'ok';
    if (s === 'PENDING') return 'pending';
    return '';
  }

  constructor(private http: HttpClient) {}
}
