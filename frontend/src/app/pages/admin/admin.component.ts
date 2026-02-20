import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgClass } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

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

type Appointment = {
  id: string;
  dateTime: string;
  status: 'PENDING' | 'CONFIRMED';
  paymentMethod?: string;
  patient?: { fullName: string; email: string };
  doctor?: { fullName: string; specialty: string; clinic: string; city: string };
};

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NgClass,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  loading = signal<boolean>(true);
  showForm = signal<boolean>(false);
  mode = signal<'ADD' | 'EDIT'>('ADD');
  editingId = signal<string>('');

  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  doctors = signal<Doctor[]>([]);
  appointments = signal<Appointment[]>([]);

  doctorsCount = computed(() => this.doctors().length);
  appointmentsCount = computed(() => this.appointments().length);
  pendingCount = computed(() => this.appointments().filter(a => a.status === 'PENDING').length);

  doctorColumns: string[] = ['name', 'specialty', 'clinic', 'city', 'price', 'actions'];
  appointmentColumns: string[] = ['when', 'doctor', 'patient', 'status', 'payment'];

  specialties: string[] = [
    'Généraliste','Dentiste','Gynécologue','Pédiatre','Cardiologue','Dermatologue',
    'Ophtalmologue','ORL','Neurologue','Urologue','Psychologue','Sage-femme',
    'Orthopédiste','Radiologue'
  ];

  timeSlots: string[] = this.generateTimeSlots('08:00', '18:00', 30);

  doctorForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    specialty: ['Généraliste', [Validators.required]],
    clinic: ['Clinique', [Validators.required]],
    city: ['Dakar', [Validators.required]],
    priceCfa: [10000, [Validators.required]],
  });

  // About
  aboutInput = signal<string>('');
  aboutPoints = signal<string[]>(['Consultation générale', 'Suivi patients']);

  // ✅ Calendrier
  selectedDate = signal<Date | null>(new Date());

  // ✅ Heures sélectionnées
  currentTimes = signal<string[]>(['10:00', '10:30']);

  // Disponibilités (format backend existant)
  availability = signal<Availability[]>([]);

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  async refreshAll() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    try {
      const docs = await firstValueFrom(this.http.get<Doctor[]>(`${environment.apiUrl}/hospital/doctors`));
      const appts = await firstValueFrom(this.http.get<Appointment[]>(`${environment.apiUrl}/appointments/hospital`));
      this.doctors.set(docs || []);
      this.appointments.set(appts || []);
    } catch (e) {
      this.handleError(e, "Accès refusé. Connecte-toi en HÔPITAL puis reviens sur /admin.");
      this.doctors.set([]);
      this.appointments.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openAdd() {
    this.mode.set('ADD');
    this.editingId.set('');
    this.showForm.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.doctorForm.reset({
      fullName: '',
      specialty: 'Généraliste',
      clinic: 'Clinique',
      city: 'Dakar',
      priceCfa: 10000
    });

    this.aboutPoints.set(['Consultation générale', 'Suivi patients']);
    this.selectedDate.set(new Date());
    this.currentTimes.set(['10:00', '10:30']);
    this.availability.set([]);
    this.syncAvailability(); // auto
  }

  openEdit(d: Doctor) {
    this.mode.set('EDIT');
    this.editingId.set(d.id);
    this.showForm.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.doctorForm.setValue({
      fullName: d.fullName,
      specialty: d.specialty,
      clinic: d.clinic,
      city: d.city,
      priceCfa: d.priceCfa,
    });

    this.aboutPoints.set(d.about || []);
    this.availability.set(d.availability || []);

    // valeur par défaut pour éditer
    this.selectedDate.set(new Date());
    this.currentTimes.set(['10:00', '10:30']);
    this.syncAvailability(); // auto
  }

  closeForm() {
    this.showForm.set(false);
  }

  // ----- About
  addAbout() {
    const v = this.aboutInput().trim();
    if (!v) return;
    if (this.aboutPoints().includes(v)) return;
    this.aboutPoints.set([...this.aboutPoints(), v]);
    this.aboutInput.set('');
  }

  removeAbout(item: string) {
    this.aboutPoints.set(this.aboutPoints().filter(x => x !== item));
  }

  // ✅ Calendrier: quand la date change
  onDateSelected(date: Date | null) {
    if (!date) return;
    this.selectedDate.set(date);
    this.syncAvailability();
  }

  // ✅ Quand les heures changent (mat-select multiple)
  onTimesChange(times: string[]) {
    this.currentTimes.set(times || []);
    this.syncAvailability();
  }

  removeTime(t: string) {
    this.currentTimes.set(this.currentTimes().filter(x => x !== t));
    this.syncAvailability();
  }

  // ✅ Synchronise automatiquement disponibilité (sans bouton “Ajouter ce jour”)
  private syncAvailability() {
    const date = this.selectedDate();
    if (!date) return;

    const times = [...this.currentTimes()].filter(Boolean).sort();
    const dayLabel = this.frenchDayLabel(date);
    const dayNumber = date.getDate();

    const next = [...this.availability()];
    const idx = next.findIndex(a => a.dayLabel === dayLabel && a.dayNumber === dayNumber);

    // si aucune heure, on supprime le bloc du jour (si existant)
    if (times.length === 0) {
      if (idx >= 0) next.splice(idx, 1);
      this.availability.set(next);
      return;
    }

    const block: Availability = { dayLabel, dayNumber, times };
    if (idx >= 0) next[idx] = block;
    else next.push(block);

    this.availability.set(next.sort((a, b) => a.dayNumber - b.dayNumber));
  }

  removeDayBlock(block: Availability) {
    this.availability.set(
      this.availability().filter(a => !(a.dayLabel === block.dayLabel && a.dayNumber === block.dayNumber))
    );
    this.successMsg.set("✅ Disponibilité supprimée");
  }

  async saveDoctor() {
    this.errorMsg.set('');
    this.successMsg.set('');

    if (this.doctorForm.invalid) {
      this.errorMsg.set("Remplis au minimum le Nom, Spécialité, Clinique, Ville et Prix.");
      return;
    }

    const v = this.doctorForm.value;
    const payload = {
      fullName: String(v.fullName || '').trim(),
      specialty: String(v.specialty || '').trim(),
      clinic: String(v.clinic || '').trim(),
      city: String(v.city || '').trim(),
      priceCfa: Number(v.priceCfa || 0),
      about: this.aboutPoints(),
      availability: this.availability(),
    };

    try {
      if (this.mode() === 'ADD') {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/hospital/doctors`, payload));
        this.successMsg.set("✅ Médecin ajouté !");
      } else {
        const id = this.editingId();
        await firstValueFrom(this.http.put(`${environment.apiUrl}/hospital/doctors/${id}`, payload));
        this.successMsg.set("✅ Médecin modifié !");
      }

      await this.refreshAll();
      this.showForm.set(false);
    } catch (e) {
      this.handleError(e, "Impossible d’enregistrer le médecin (token manquant ou rôle incorrect).");
    }
  }

  async deleteDoctor(d: Doctor) {
    const ok = confirm(`Supprimer ${d.fullName} ?`);
    if (!ok) return;

    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/hospital/doctors/${d.id}`));
      this.successMsg.set("✅ Médecin supprimé !");
      await this.refreshAll();
    } catch (e) {
      this.handleError(e, "Impossible de supprimer le médecin.");
    }
  }

  fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  badgeClass(status: string) {
    return status === 'CONFIRMED' ? 'ok' : 'pending';
  }

  private handleError(err: unknown, fallback: string) {
    if (err instanceof HttpErrorResponse) {
      const msg = (err.error && err.error.message) ? String(err.error.message) : fallback;
      this.errorMsg.set(msg);
      return;
    }
    this.errorMsg.set(fallback);
  }

  private generateTimeSlots(start: string, end: string, stepMinutes: number): string[] {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const pad = (n: number) => String(n).padStart(2, '0');

    const out: string[] = [];
    for (let min = toMin(start); min <= toMin(end); min += stepMinutes) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      out.push(`${pad(h)}:${pad(m)}`);
    }
    return out;
  }

  private frenchDayLabel(d: Date): string {
    const labels = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    return labels[d.getDay()];
  }
}
