import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface AuthNavState {
  mobile?: string;
  name?: string;
}

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css',
})
export class VerifyOtpComponent implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mobile = signal('');
  readonly name = signal('');
  readonly isVerifying = signal(false);
  readonly otpError = signal('');
  readonly countdown = signal(60);
  readonly otpComplete = signal(false);

  readonly maskedMobilePrefix = computed(() => {
    const m = this.mobile();
    return m.length >= 4 ? '+91 XXXXXX' : '';
  });

  readonly maskedMobileSuffix = computed(() => {
    const m = this.mobile();
    return m.length >= 4 ? m.slice(-4) : '';
  });

  readonly canResend = computed(() => this.countdown() === 0);

  readonly otpForm = this.fb.group({
    digits: this.fb.array(
      Array.from({ length: 6 }, () =>
        this.fb.nonNullable.control('', [
          Validators.required,
          Validators.pattern(/^\d$/),
        ])
      )
    ),
  });

  private countdownIntervalId: ReturnType<typeof setInterval> | null = null;

  get digits(): FormArray {
    return this.otpForm.get('digits') as FormArray;
  }

  ngOnInit(): void {
    const state = history.state as AuthNavState;

    if (!state?.mobile) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.mobile.set(state.mobile);
    this.name.set(state.name ?? '');
    this.startCountdown();

    this.otpForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const otp = this.digits.controls.map((c) => c.value).join('');
        this.otpComplete.set(otp.length === 6 && this.digits.valid);
        if (this.otpError()) {
          this.otpError.set('');
        }
      });

    this.destroyRef.onDestroy(() => this.clearCountdown());
  }

  onOtpInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    input.value = digit;
    this.digits.at(index).setValue(digit);

    if (digit && index < 5) {
      this.focusInput(index + 1);
    }
  }

  onOtpKeydown(index: number, event: KeyboardEvent): void {
    if (event.key !== 'Backspace') return;

    const current = this.digits.at(index).value;
    if (!current && index > 0) {
      this.focusInput(index - 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '')
      .slice(0, 6);

    pasted.split('').forEach((digit, i) => {
      this.digits.at(i).setValue(digit);
    });

    for (let i = pasted.length; i < 6; i++) {
      this.digits.at(i).setValue('');
    }

    this.focusInput(Math.min(pasted.length, 5));
  }

  onVerify(): void {
    if (!this.otpComplete() || this.isVerifying()) return;

    const otp = this.digits.controls.map((c) => c.value).join('');
    this.isVerifying.set(true);
    this.otpError.set('');

    this.authService
      .verifyOtp({ mobile: this.mobile(), otp })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ valid }) => {
          this.isVerifying.set(false);
          if (!valid) {
            this.otpError.set('Invalid OTP. Please try again.');
            return;
          }
        },
        error: () => {
          this.isVerifying.set(false);
          this.otpError.set('Something went wrong. Please try again.');
        },
      });
  }

  onResend(): void {
    if (!this.canResend()) return;

    this.authService
      .sendOtp({ name: this.name(), mobile: this.mobile() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.digits.controls.forEach((c) => c.setValue(''));
        this.otpComplete.set(false);
        this.otpError.set('');
        this.focusInput(0);
        this.startCountdown();
      });
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.countdown.set(60);

    this.countdownIntervalId = setInterval(() => {
      this.countdown.update((c) => {
        if (c <= 1) {
          this.clearCountdown();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownIntervalId !== null) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private focusInput(index: number): void {
    const el = this.otpInputs?.get(index)?.nativeElement;
    el?.focus();
    el?.select();
  }
}
