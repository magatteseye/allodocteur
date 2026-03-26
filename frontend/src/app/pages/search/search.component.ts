import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';

type Doctor = {
  id: string;
  fullName: string;
  specialty: string;
  clinic: string;
  city: string;
  priceCfa: number;
};

@Component({
  standalone: true,
  selector: 'app-search',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
  ],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit {
  loading = signal(true);
  doctors = signal<Doctor[]>([]);

  specialties = [
    'Pédiatre',
    'Généraliste',
    'Cardiologue',
    'Neurologie',
    'Sage Femme',
    'Dentiste',
    'Gynécologue'
  ];

  form = this.fb.group({
    specialty: [''],
    city: ['Dakar'],
  });

  fullName = localStorage.getItem('fullName') || 'Invité';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Prendre rendez-vous médical en ligne au Sénégal | AlloDocteur');

    this.meta.updateTag({
      name: 'description',
      content: 'Trouvez un médecin disponible et prenez rendez-vous médical en ligne au Sénégal avec AlloDocteur.'
    });

    this.route.queryParams.subscribe(q => {
      this.form.patchValue(
        {
          specialty: q['specialty'] || '',
          city: q['city'] || 'Dakar',
        },
        { emitEvent: false }
      );

      this.fetchDoctors();
    });

    this.form.valueChanges.subscribe(() => this.applyToUrl());
  }

  applyToUrl() {
    const v = this.form.value;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        specialty: (v.specialty || '').trim() || null,
        city: (v.city || '').trim() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  fetchDoctors() {
    this.loading.set(true);

    this.http.get<Doctor[]>(`${environment.apiUrl}/doctors`).subscribe({
      next: (data) => {
        const v = this.form.value;
        const spec = (v.specialty || '').toLowerCase();
        const city = (v.city || '').toLowerCase();

        const filtered = (data || []).filter(d => {
          const okSpec = !spec || d.specialty.toLowerCase().includes(spec);
          const okCity = !city || d.city.toLowerCase().includes(city);
          return okSpec && okCity;
        });

        this.doctors.set(filtered);
        this.loading.set(false);
      },
      error: () => {
        this.doctors.set([]);
        this.loading.set(false);
      }
    });
  }

  setSpecialty(s: string) {
    this.form.patchValue({ specialty: s });
    this.fetchDoctors();
  }

  submit() {
    this.fetchDoctors();
  }
}