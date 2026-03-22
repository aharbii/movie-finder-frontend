import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html'
})
export default class LoginComponent {
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);

  isLoginMode = true;
  loading = false;
  error = '';

  authForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.error = '';
  }

  onSubmit() {
    if (this.authForm.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, password } = this.authForm.value;
    const req = this.isLoginMode 
      ? this.authService.login(email!, password!)
      : this.authService.register(email!, password!);

    req.subscribe({
      error: (err) => {
        this.error = err.error?.detail || 'Authentication failed';
        this.loading = false;
      }
    });
  }
}
