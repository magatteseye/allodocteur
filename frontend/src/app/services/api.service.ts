import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';




@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;


  private headers() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Doctors (hospital)
  getHospitalDoctors() {
    return this.http.get<any[]>(`${this.base}/doctors/hospital`, this.headers());
  }

  createDoctor(payload: any) {
    return this.http.post(`${this.base}/doctors`, payload, this.headers());
  }

  updateDoctor(id: string, payload: any) {
    return this.http.put(`${this.base}/doctors/${id}`, payload, this.headers());
  }

  deleteDoctor(id: string) {
    return this.http.delete(`${this.base}/doctors/${id}`, this.headers());
  }

  // Appointments (hospital)
  getHospitalAppointments() {
    return this.http.get<any[]>(`${this.base}/appointments/hospital`, this.headers());
  }

  getDoctors() {
    return this.http.get<any[]>(`${this.base}/doctors`);
  }
}
