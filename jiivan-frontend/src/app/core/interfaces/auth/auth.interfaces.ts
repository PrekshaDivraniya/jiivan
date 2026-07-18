export interface LoginRequest {
  name: string;
  mobile: string;
}

export interface VerifyOtpRequest {
  mobile: string;
  otp: string;
}
