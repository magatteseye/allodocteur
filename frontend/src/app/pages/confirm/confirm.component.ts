import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppointmentDraftStore } from '../../stores/appointment-draft.store';

@Component({
  standalone: true,
  selector: 'app-confirm',
  imports: [CommonModule, RouterLink],
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss'],
})
export class ConfirmComponent {
  draft = this.store.draft;
  loading = signal(false);
  error = signal('');

  constructor(
    private store: AppointmentDraftStore,
    private http: HttpClient,
    private router: Router,
  ) {}

  private authHeaders() {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  confirm() {
    const d = this.draft();

    if (!d) {
      this.error.set("Choisis d’abord un médecin et une heure.");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.error.set("Connecte-toi d'abord en patient.");
      this.router.navigateByUrl('/login');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.http.post<{ ok: boolean; url: string }>(
      `${environment.apiUrl}/payments/checkout-session`,
      {
        doctorId: d.doctorId,
        dateTime: d.isoDateTime
      },
      { headers: this.authHeaders() }
    ).subscribe({
      next: (res) => {
        if (res?.url) {
          window.location.href = res.url; // ✅ redirection Stripe Checkout
          return;
        }
        this.loading.set(false);
        this.error.set("Impossible de démarrer le paiement.");
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message || "Erreur Stripe. Vérifie ta connexion et réessaie.");
      }
    });
  }

  goSearch() {
    this.router.navigateByUrl('/search');
  }

  goMyAppointments() {
    this.router.navigateByUrl('/rendezvous');
  }
}