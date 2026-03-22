import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isLoading: false,
    error: null as string | null,
    loginFailed: false,
  }),
  getters: {
    // ดึง Role ออกมาเป็นตัวพิมพ์เล็ก
    role: (state) => state.user?.system_role?.toLowerCase() || '',
    isAdmin: (state) => (state.user?.system_role?.toLowerCase() || '') === 'admin',
    isTeacher: (state) => (state.user?.system_role?.toLowerCase() || '') === 'teacher',
    isTA: (state) => (state.user?.system_role?.toLowerCase() || '') === 'ta',
    isStudent: (state) => (state.user?.system_role?.toLowerCase() || '') === 'student',
    canCreate: (state) => ['admin', 'teacher'].includes(state.user?.system_role?.toLowerCase() || ''),
    canGrade: (state) => ['admin', 'teacher', 'ta'].includes(state.user?.system_role?.toLowerCase() || ''),
  },
  actions: {
    async login(email: string, password: string) {
      this.isLoading = true; this.error = null; this.loginFailed = false;
      try {
        const res = await api.post('/api/auth/login', { email, password });
        this.user = res.data;
        localStorage.setItem('user', JSON.stringify(res.data));
        return true;
      } catch (err: any) {
        this.loginFailed = true;
        this.error = err.response?.data?.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        return false;
      } finally { this.isLoading = false; }
    },
    async resetPasswordSelfService(data: any) {
      this.isLoading = true; this.error = null;
      try {
        await api.post('/api/auth/reset-password-self-service', data);
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'ข้อมูลไม่ถูกต้อง';
        return false;
      } finally { this.isLoading = false; }
    },
    logout() { this.user = null; localStorage.removeItem('user'); }
  }
});