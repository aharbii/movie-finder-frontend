import { Routes } from '@angular/router';
import LoginComponent from './components/login/login';
import ChatComponent from './components/chat/chat';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

const authGuard = () => {
  const token = localStorage.getItem('access_token');
  if (token) return true;
  const router = inject(Router);
  return router.parseUrl('/login');
};

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];
