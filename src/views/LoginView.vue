<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

const router = useRouter();
const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const showPassword = ref(false);

const isResetModalOpen = ref(false);
const resetError = ref<string | null>(null);
const resetForm = ref({ email: '', old_password: '', new_password: '', confirm_new_password: '' });

const getBaseUrl = () => api.defaults.baseURL ? api.defaults.baseURL.replace(/\/$/, '') : '';
const settings = ref({ platform_name: 'SchoolLMS Pro', primary_color: '#2563eb', logo_url: '', bg_image_url: '' });

onMounted(async () => {
  try {
    const res = await api.get('/api/settings');
    if (res.data) settings.value = res.data;
  } catch (e) { console.error("Load settings failed"); }
});

const handleLogin = async () => {
  if (!email.value || !password.value) return;
  const success = await authStore.login(email.value, password.value);
  if (success) router.push('/');
};

const handleResetPassword = async () => {
  resetError.value = null;
  if (resetForm.value.new_password !== resetForm.value.confirm_new_password) {
    resetError.value = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'; return;
  }
  const success = await authStore.resetPasswordSelfService(resetForm.value);
  if (success) {
    isResetModalOpen.value = false;
    alert("เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสใหม่");
    resetForm.value = { email: '', old_password: '', new_password: '', confirm_new_password: '' };
  } else { resetError.value = authStore.error; }
};
</script>

<template>
  <div class="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden bg-cover bg-center"
       :style="{ backgroundImage: settings.bg_image_url ? `url(${getBaseUrl() + settings.bg_image_url})` : 'none' }">
    
    <div v-if="!settings.bg_image_url" class="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-50 animate-pulse" :style="{ backgroundColor: settings.primary_color }"></div>
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-0"></div>

    <div class="max-w-[400px] w-full relative z-10 flex flex-col items-center">
      
      <div class="text-center mb-8">
        <img v-if="settings.logo_url" :src="getBaseUrl() + settings.logo_url" class="h-20 mx-auto mb-4 object-contain drop-shadow-xl">
        <div v-else class="w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto mb-4" :style="{ backgroundColor: settings.primary_color }">
          <span class="text-white font-black text-2xl">{{ settings.platform_name.charAt(0) }}</span>
        </div>
        <h1 class="text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">{{ settings.platform_name }}</h1>
        <p class="font-bold mt-2 uppercase tracking-widest text-[9px] bg-white/20 text-white inline-block px-3 py-1 rounded-full shadow-sm backdrop-blur-md border border-white/20">Learning Management System</p>
      </div>

      <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-white/80 w-full">
        <h2 class="text-xl font-extrabold text-slate-800 mb-6 text-center">เข้าสู่ระบบ</h2>
        
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">อีเมลผู้ใช้งาน</label>
            <div class="relative">
              <input v-model="email" type="email" required placeholder="admin@school.com" :class="[authStore.loginFailed ? 'border-red-400 bg-red-50 ring-2 ring-red-100' : 'border-slate-100 bg-slate-50 focus:bg-white', 'w-full pl-11 pr-4 py-3.5 border-2 rounded-2xl transition-all font-bold text-sm text-slate-700 outline-none']" :style="!authStore.loginFailed ? { ':focus': `border-color: ${settings.primary_color}` } : {}" />
              <span class="absolute left-4 top-4 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg></span>
            </div>
          </div>

          <div>
            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">รหัสผ่าน</label>
            <div class="relative">
              <input v-model="password" :type="showPassword ? 'text' : 'password'" required placeholder="••••••••" :class="[authStore.loginFailed ? 'border-red-400 bg-red-50 ring-2 ring-red-100' : 'border-slate-100 bg-slate-50 focus:bg-white', 'w-full pl-11 pr-11 py-3.5 border-2 rounded-2xl transition-all font-bold text-sm text-slate-700 outline-none tracking-widest']" :style="!authStore.loginFailed ? { ':focus': `border-color: ${settings.primary_color}` } : {}" />
              <span class="absolute left-4 top-4 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span>
              <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L5.136 5.136m13.728 13.728L13.875 18.825M21 12c-1.274 4.057-5.064 7-9.542-7-1.447 0-2.812-.312-4.037-.875m11.156-4.562A9.97 9.97 0 0021 12c-1.274-4.057-5.064-7-9.542-7-1.447 0-2.812.312-4.037.875M3.707 3.707l16.586 16.586" /></svg>
              </button>
            </div>
          </div>

          <div v-if="authStore.error" class="bg-red-50 text-red-500 text-[10px] font-bold p-3 rounded-xl flex items-center gap-2 border border-red-100 animate-headShake">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {{ authStore.error }}
          </div>

          <button type="submit" :disabled="authStore.isLoading" class="w-full text-white font-extrabold py-3.5 rounded-2xl shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:shadow-none text-sm" :style="{ backgroundColor: settings.primary_color }">
            {{ authStore.isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </form>

        <div class="mt-6 pt-6 border-t border-slate-100/80 text-center">
          <button @click="isResetModalOpen = true" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition" :style="{ color: settings.primary_color }">
            ลืมรหัสผ่าน / เปลี่ยนรหัสผ่าน?
          </button>
        </div>
      </div>

      <div class="mt-10 text-center relative z-10 text-white/60">
         <p class="text-[9px] font-medium tracking-widest uppercase mb-1">Copyright © Mediacenter</p>
         <p class="text-[10px] font-bold tracking-wider">NTY MULTIMEDIA CO.,LTD</p>
      </div>

    </div>

    <Transition name="modal">
      <div v-if="isResetModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white">
          <div class="p-6 border-b flex justify-between items-center bg-slate-50">
            <h3 class="text-lg font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h3>
            <button @click="isResetModalOpen = false" class="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full p-1.5 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <form @submit.prevent="handleResetPassword" class="p-6 space-y-4">
            <div>
              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">อีเมลผู้ใช้งาน</label>
              <input v-model="resetForm.email" required type="email" placeholder="email@school.com" class="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white font-semibold text-xs outline-none transition-colors" :style="{ ':focus': `border-color: ${settings.primary_color}` }">
            </div>
            <div>
              <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">รหัสผ่านเดิม</label>
              <input v-model="resetForm.old_password" required type="password" placeholder="••••••••" class="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white font-semibold text-xs outline-none transition-colors tracking-widest" :style="{ ':focus': `border-color: ${settings.primary_color}` }">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">รหัสผ่านใหม่</label>
                <input v-model="resetForm.new_password" required type="password" :class="[resetError ? 'border-red-400 ring-2 ring-red-50' : 'border-transparent', 'w-full px-4 py-2.5 bg-slate-50 border-2 rounded-xl focus:bg-white font-semibold text-xs outline-none transition-colors tracking-widest']" :style="!resetError ? { ':focus': `border-color: ${settings.primary_color}` } : {}">
              </div>
              <div>
                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ยืนยันรหัสใหม่</label>
                <input v-model="resetForm.confirm_new_password" required type="password" :class="[resetError ? 'border-red-400 ring-2 ring-red-50' : 'border-transparent', 'w-full px-4 py-2.5 bg-slate-50 border-2 rounded-xl focus:bg-white font-semibold text-xs outline-none transition-colors tracking-widest']" :style="!resetError ? { ':focus': `border-color: ${settings.primary_color}` } : {}">
              </div>
            </div>

            <div v-if="resetError" class="bg-red-50 text-red-500 text-[10px] font-bold p-3 rounded-lg border border-red-100">{{ resetError }}</div>

            <div class="pt-4 flex gap-3">
              <button type="button" @click="isResetModalOpen = false" class="flex-1 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl text-xs transition">ยกเลิก</button>
              <button type="submit" class="flex-1 py-3 text-white rounded-xl font-bold shadow-md text-xs hover:-translate-y-px transition-transform" :style="{ backgroundColor: settings.primary_color }">ยืนยันเปลี่ยน</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;700;900&display=swap');
.font-prompt { font-family: 'Prompt', sans-serif; }
.animate-headShake { animation: headShake 0.5s ease-in-out; }
@keyframes headShake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}
.modal-enter-active, .modal-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }
</style>