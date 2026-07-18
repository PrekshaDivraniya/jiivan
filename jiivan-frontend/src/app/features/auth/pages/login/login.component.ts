import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function mobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) return null;
    return /^\d{10}$/.test(value) ? null : { mobileInvalid: true };
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isSubmitting = signal(false);
  readonly showErrors = signal(false);

  readonly loginForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    mobile: ['', [Validators.required, mobileValidator()]],
  });

  constructor() {
    this.loginForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.showErrors()) {
          this.showErrors.set(true);
        }
      });
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digits;
    this.loginForm.controls.mobile.setValue(digits);
  }

  onSubmit(): void {
    this.showErrors.set(true);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { name, mobile } = this.loginForm.getRawValue();
    this.isSubmitting.set(true);

    this.authService
      .sendOtp({ name, mobile })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/auth/verify-otp'], {
            state: { mobile, name },
          });
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  isInvalid(controlName: 'name' | 'mobile'): boolean {
    const control = this.loginForm.controls[controlName];
    return (control.touched || this.showErrors()) && control.invalid;
  }
}
