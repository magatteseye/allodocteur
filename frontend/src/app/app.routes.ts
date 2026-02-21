import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AppointmentsComponent } from './pages/appointments/appointments.component';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },

  { path: 'search', loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent) },
  { path: 'doctor/:id', loadComponent: () => import('./pages/doctor/doctor.component').then(m => m.DoctorComponent) },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent) },
  { path: 'confirm', loadComponent: () => import('./pages/confirm/confirm.component').then(m => m.ConfirmComponent) },
  { path: 'confirmed', loadComponent: () => import('./pages/confirmed/confirmed.component').then(m => m.ConfirmedComponent) },
  { path: 'rendez-vous',loadComponent: () =>import('./pages/rendez-vous/rendez-vous.component').then((m) => m.RendezvousComponent),},
  { path: 'payment', loadComponent: () => import('./pages/payment/payment.component').then(m => m.PaymentComponent), },
  { path: 'about', loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent) },
  { path: 'rendez-vous', component: AppointmentsComponent },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) },

  { path: '**', redirectTo: '' },

  
];

