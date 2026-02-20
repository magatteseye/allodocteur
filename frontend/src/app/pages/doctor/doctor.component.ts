import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppointmentDraftStore } from '../../stores/appointment-draft.store';

type Availability = { dayLabel: string; dayNumber: number; times: string[] };
type Doctor = {
  id: string;
  fullName: string;
  specialty: string;
  clinic: string;
  city: string;
  priceCfa: number;
  about?: string[];
  availability?: Availability[];
};

@Component({
  standalone: true,
  selector: 'app-doctor',
  imports: [CommonModule, RouterLink],
  templateUrl: './doctor.component.html',
  styleUrls: ['./doctor.component.scss'],
})
export class DoctorComponent implements OnInit {
  doctor = signal<Doctor | null>(null);

  dayIndex = signal<number>(0);
  time = signal<string>('');

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private draft: AppointmentDraftStore,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<Doctor[]>(`${environment.apiUrl}/doctors`).subscribe(docs => {
      const found = (docs || []).find(d => d.id === id) || null;
      this.doctor.set(found);
    });
  }

  selectDay(i: number) {
    this.dayIndex.set(i);
    this.time.set('');
  }

  selectTime(t: string) {
    this.time.set(t);
  }

  private computeIso(dayNumber: number, t: string) {
    const now = new Date();
    let d = new Date(now.getFullYear(), now.getMonth(), dayNumber);
    if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, dayNumber);
    const [h, m] = t.split(':');
    d.setHours(Number(h), Number(m), 0, 0);
    return d;
  }

  goConfirm() {
    const d = this.doctor();
    if (!d) return;

    const av = d.availability?.[this.dayIndex()]!;
    if (!av || !this.time()) return;

    const dateObj = this.computeIso(av.dayNumber, this.time());
    const dateLabel = `${av.dayLabel} ${av.dayNumber} ${dateObj.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`;

    this.draft.setDraft({
      doctorId: d.id,
      doctorName: d.fullName,
      specialty: d.specialty,
      clinic: d.clinic,
      city: d.city,
      priceCfa: d.priceCfa,
      dateLabel,
      time: this.time(),
      isoDateTime: dateObj.toISOString(),
    });

    this.router.navigateByUrl('/confirm');
  }
}
