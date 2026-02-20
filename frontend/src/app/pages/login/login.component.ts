import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  err = signal('');

  form = this.fb.group({
    mode: ['PATIENT', Validators.required], // PATIENT | HOSPITAL
    email: ['patient@demo.com', [Validators.required]],
    password: ['Patient123!', [Validators.required]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  switchMode(mode: 'PATIENT' | 'HOSPITAL') {
    this.form.patchValue({
      mode,
      email: mode === 'HOSPITAL' ? 'hospital@demo.com' : 'patient@demo.com',
      password: mode === 'HOSPITAL' ? 'Hospital123!' : 'Patient123!',
    });
  }

  login() {
    this.err.set('');
    const v = this.form.value;

    this.auth.login(v.email || '', v.password || '').subscribe({
      next: (res) => {
        this.auth.setSession(res);
        // redirection selon rôle réel renvoyé par backend
        if (res.role === 'HOSPITAL') this.router.navigateByUrl('/admin');
        else this.router.navigateByUrl('/search');
      },
      error: () => this.err.set('Identifiants invalides'),
    });
  }
}
