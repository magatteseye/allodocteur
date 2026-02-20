import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-confirmed',
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmed.component.html',
  styleUrls: ['./confirmed.component.scss'],
})
export class ConfirmedComponent {
  loading = signal(true);
  error = signal('');
  data = signal<any>(null);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!sessionId) {
      this.loading.set(false);
      this.error.set("Session Stripe introuvable.");
      return;
    }

    const token = localStorage.getItem('token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    this.http.get(`${environment.apiUrl}/payments/session/${sessionId}`, { headers })
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.error.set("Impossible de récupérer le statut du paiement.");
          this.loading.set(false);
        }
      });
  }
}