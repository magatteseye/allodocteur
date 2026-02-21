import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  err = signal('');
  loading = false;
  showPwd = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  login() {
    if (this.loading || this.form.invalid) return;

    this.err.set('');
    this.loading = true;

    const v = this.form.value;

    this.auth.login(v.email || '', v.password || '').subscribe({
      next: (res) => {
        this.auth.setSession(res);
        this.router.navigateByUrl('/search'); // Patient flow
      },
      error: () => {
        this.err.set('Email ou mot de passe incorrect');
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}