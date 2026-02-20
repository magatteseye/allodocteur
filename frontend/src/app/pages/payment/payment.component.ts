import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-payment',
  imports: [CommonModule, RouterLink],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit {
  ref = signal<string>('');
  loading = signal<boolean>(true);
  paying = signal<boolean>(false);
  error = signal<string>('');

  data = signal<any | null>(null);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const ref = this.route.snapshot.queryParamMap.get('ref') || '';
    if (!ref) {
      this.error.set("Référence de paiement introuvable.");
      this.loading.set(false);
      return;
    }

    this.ref.set(ref);
    this.refreshStatus();
  }

  private authHeaders() {
    const token = localStorage.getItem('token');
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  refreshStatus() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<any>(`${environment.apiUrl}/payments/status/${this.ref()}`, {
      headers: this.authHeaders()
    }).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);

        // déjà payé ? -> confirmed
        if (res?.paymentStatus === 'PAID') {
          this.router.navigate(['/confirmed'], { queryParams: { ref: this.ref() } });
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set("Impossible de charger le paiement. Connecte-toi en patient.");
      }
    });
  }

  payNow() {
    this.paying.set(true);
    this.error.set('');

    this.http.post<any>(`${environment.apiUrl}/payments/stripe/checkout/${this.ref()}`, {}, {
      headers: this.authHeaders()
    }).subscribe({
      next: (res) => {
        this.paying.set(false);

        if (res?.alreadyPaid && res?.redirectUrl) {
          this.router.navigate(['/confirmed'], { queryParams: { ref: this.ref() } });
          return;
        }

        if (res?.url) {
          // ✅ redirection vers Stripe Checkout (paiement réel)
          window.location.href = res.url;
          return;
        }

        this.error.set("Lien de paiement Stripe introuvable.");
      },
      error: () => {
        this.paying.set(false);
        this.error.set("Erreur Stripe: impossible d'initialiser le paiement.");
      }
    });
  }

  goSearch() {
    this.router.navigateByUrl('/search');
  }
}