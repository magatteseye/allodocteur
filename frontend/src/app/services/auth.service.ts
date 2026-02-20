import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

type LoginResponse = { token: string; role: string; fullName: string; email: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  userName = signal<string>(localStorage.getItem('fullName') || 'Utilisateur');
  role = signal<string>(localStorage.getItem('role') || '');
  token = signal<string>(localStorage.getItem('token') || '');

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password });
  }

  setSession(res: LoginResponse) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('fullName', res.fullName);
    localStorage.setItem('role', res.role);

    this.token.set(res.token);
    this.userName.set(res.fullName);
    this.role.set(res.role);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('fullName');
    localStorage.removeItem('role');
    this.token.set('');
    this.userName.set('Utilisateur');
    this.role.set('');
  }
}
