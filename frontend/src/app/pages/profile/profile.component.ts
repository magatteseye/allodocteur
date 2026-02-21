import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

type PatientProfile = {
  fullName: string;
  email: string;
  phone: string;
  city: 'Dakar';
  address?: string;
  birthYear?: number;
  sex?: 'F' | 'M' | '—';
  emergencyName?: string;
  emergencyPhone?: string;
  prefs: {
    language: 'FR' | 'WO';
    smsReminders: boolean;
    emailReminders: boolean;
  };
};

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  // UI state
  loading = signal(false);
  saving = signal(false);
  changingPwd = signal(false);

  toast = signal<string>('');
  error = signal<string>('');

  // Fake profile (à remplacer par ton AuthService / API)
  profile = signal<PatientProfile>({
    fullName: 'Awa Ndiaye',
    email: 'awa@exemple.com',
    phone: '+221 77 123 45 67',
    city: 'Dakar',
    address: 'Sacré-Cœur, Dakar',
    birthYear: 1998,
    sex: 'F',
    emergencyName: 'Mamadou Ndiaye',
    emergencyPhone: '+221 78 000 00 00',
    prefs: {
      language: 'FR',
      smsReminders: true,
      emailReminders: false,
    },
  });

  // Forms
  infoForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    city: [{ value: 'Dakar', disabled: true }, [Validators.required]], // Dakar only pour le moment
    address: [''],
    birthYear: [null as number | null],
    sex: ['—' as 'F' | 'M' | '—'],
  });

  emergencyForm = this.fb.group({
    emergencyName: [''],
    emergencyPhone: [''],
  });

  prefsForm = this.fb.group({
    language: ['FR' as 'FR' | 'WO', Validators.required],
    smsReminders: [true],
    emailReminders: [false],
  });

  pwdForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  // Derived states
  isInfoDirty = computed(() => this.infoForm.dirty);
  isEmergencyDirty = computed(() => this.emergencyForm.dirty);
  isPrefsDirty = computed(() => this.prefsForm.dirty);

  canSaveInfo = computed(() => this.infoForm.valid && this.isInfoDirty() && !this.saving());
  canSaveEmergency = computed(() => this.emergencyForm.valid && this.isEmergencyDirty() && !this.saving());
  canSavePrefs = computed(() => this.prefsForm.valid && this.isPrefsDirty() && !this.saving());

  showPwd = signal(false);

  constructor(private fb: FormBuilder, private router: Router) {
    this.loadProfile();
  }

  private setToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2600);
  }

  loadProfile() {
    this.loading.set(true);
    this.error.set('');

    // TODO: remplacer par API (PatientService.getMe())
    const p = this.profile();

    this.infoForm.patchValue({
      fullName: p.fullName,
      phone: p.phone,
      city: p.city,
      address: p.address || '',
      birthYear: p.birthYear ?? null,
      sex: p.sex ?? '—',
    });
    this.infoForm.markAsPristine();

    this.emergencyForm.patchValue({
      emergencyName: p.emergencyName || '',
      emergencyPhone: p.emergencyPhone || '',
    });
    this.emergencyForm.markAsPristine();

    this.prefsForm.patchValue({
      language: p.prefs.language,
      smsReminders: p.prefs.smsReminders,
      emailReminders: p.prefs.emailReminders,
    });
    this.prefsForm.markAsPristine();

    this.loading.set(false);
  }

  saveInfo() {
    if (!this.canSaveInfo()) return;
    this.saving.set(true);
    this.error.set('');

    const v = this.infoForm.getRawValue();

    // TODO: API updateProfile
    this.profile.set({
      ...this.profile(),
      fullName: v.fullName || '',
      phone: v.phone || '',
      city: 'Dakar',
      address: v.address || '',
      birthYear: v.birthYear ?? undefined,
      sex: (v.sex as any) ?? '—',
    });

    this.infoForm.markAsPristine();
    this.saving.set(false);
    this.setToast('Informations mises à jour ✅');
  }

  saveEmergency() {
    if (!this.canSaveEmergency()) return;
    this.saving.set(true);
    this.error.set('');

    const v = this.emergencyForm.value;

    // TODO: API updateEmergency
    this.profile.set({
      ...this.profile(),
      emergencyName: v.emergencyName || '',
      emergencyPhone: v.emergencyPhone || '',
    });

    this.emergencyForm.markAsPristine();
    this.saving.set(false);
    this.setToast('Contact d’urgence mis à jour ✅');
  }

  savePrefs() {
    if (!this.canSavePrefs()) return;
    this.saving.set(true);
    this.error.set('');

    const v = this.prefsForm.value;

    // TODO: API updatePreferences
    this.profile.set({
      ...this.profile(),
      prefs: {
        language: (v.language || 'FR') as any,
        smsReminders: !!v.smsReminders,
        emailReminders: !!v.emailReminders,
      },
    });

    this.prefsForm.markAsPristine();
    this.saving.set(false);
    this.setToast('Préférences enregistrées ✅');
  }

  changePassword() {
    if (this.changingPwd() || this.pwdForm.invalid) return;

    const v = this.pwdForm.value;
    if ((v.newPassword || '') !== (v.confirmPassword || '')) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.changingPwd.set(true);
    this.error.set('');

    // TODO: API changePassword(current, new)
    setTimeout(() => {
      this.pwdForm.reset();
      this.changingPwd.set(false);
      this.setToast('Mot de passe modifié ✅');
    }, 600);
  }

  logout() {
    // TODO: AuthService.logout()
    this.router.navigateByUrl('/login');
  }

  deleteAccount() {
    // TODO: API deleteAccount + confirmation modal (plus tard)
    this.setToast('Suppression de compte: à brancher sur le backend');
  }

  get initials() {
    const name = (this.profile().fullName || 'P').trim();
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase()).join('');
  }
}