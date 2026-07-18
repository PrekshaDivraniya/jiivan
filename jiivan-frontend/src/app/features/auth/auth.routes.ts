import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./pages/verify-otp/verify-otp.component').then(
        (m) => m.VerifyOtpComponent
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
