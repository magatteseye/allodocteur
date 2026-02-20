import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-rendezvous',
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './rendez-vous.component.html',
  styleUrls: ['./rendez-vous.component.scss']
})
export class RendezvousComponent implements OnInit {
  loading = signal<boolean>(true);
  error = signal<string>('');
  items = signal<any[]>([]);

  upcoming = computed(() =>
    this.items().filter(a => new Date(a.dateTime).getTime() >= Date.now())
  );

  history = computed(() =>
    this.items().filter(a => new Date(a.dateTime).getTime() < Date.now())
  );

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  private authHeaders() {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  load() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.loading.set(false);
      this.error.set("Connecte-toi pour voir tes rendez-vous.");
      return;
    }

    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/appointments/me`, {
      headers: this.authHeaders()
    }).subscribe({
      next: (res) => {
        this.items.set(res || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set("Impossible de charger tes rendez-vous.");
      }
    });
  }

  canCancel(a: any) {
    const inFuture = new Date(a.dateTime).getTime() > Date.now();
    return inFuture && a.status !== 'CANCELLED';
  }

  cancel(apptId: string) {
    this.http.patch<any>(`${environment.apiUrl}/appointments/${apptId}/cancel`, {}, {
      headers: this.authHeaders()
    }).subscribe({
      next: () => this.load(),
      error: () => this.error.set("Impossible d'annuler ce rendez-vous.")
    });
  }

  goSearch() {
    this.router.navigateByUrl('/search');
  }

  badgeClass(status: string) {
    if (status === 'CONFIRMED') return 'ok';
    if (status === 'PENDING') return 'pending';
    if (status === 'CANCELLED') return 'cancel';
    return '';
  }
}