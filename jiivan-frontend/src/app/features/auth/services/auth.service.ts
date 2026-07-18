import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import {
  LoginRequest,
  VerifyOtpRequest,
} from '../../../core/interfaces/auth/auth.interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  sendOtp(_request: LoginRequest): Observable<{ success: boolean }> {
    return of({ success: true }).pipe(delay(1000));
  }

  verifyOtp(request: VerifyOtpRequest): Observable<{ valid: boolean }> {
    return of({ valid: request.otp === '123456' }).pipe(delay(1000));
  }
}
