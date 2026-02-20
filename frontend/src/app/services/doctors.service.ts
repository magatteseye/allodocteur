import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Availability {
  dayLabel: string;
  dayNumber: number;
  times: string[];
}

export interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
  clinic: string;
  city: string;
  priceCfa: number;
  about?: string[];
  availability?: Availability[];
}

@Injectable({ providedIn: 'root' })
export class DoctorsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.base}/doctors`);
  }

  getDoctor(id: string): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.base}/doctors/${id}`);
  }
}
