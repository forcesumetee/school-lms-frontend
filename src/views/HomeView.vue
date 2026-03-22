<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const authStore = useAuthStore();
const router = useRouter();

const getBaseUrl = () => api.defaults.baseURL ? api.defaults.baseURL.replace(/\/$/, '') : '';

const systemSettings = ref({ platform_name: 'SchoolLMS Pro', primary_color: '#161D2D', logo_url: '', bg_image_url: '' });

const settingsFormFiles = ref({ logoFile: null as File | null, bgFile: null as File | null, delete_logo: false, delete_bg: false });
const previewLogo = ref('');
const previewBg = ref('');

const activeView = ref('courses'); 
const courses = ref<any[]>([]);
const categories = ref<any[]>([]);
const users = ref<any[]>([]);
const isLoading = ref(false);

const selectedCategory = ref<number | null>(null);
const privacyFilter = ref('all');

const isRoleDropdownOpen = ref(false);
const roleFilter = ref('all');
const searchQuery = ref('');

const joinCodeInput = ref(''); // State สำหรับกรอกโค้ดเข้าห้อง

const roleOptions = [
  { value: 'all', label: 'ทุกสิทธิ์' }, { value: 'admin', label: 'Admin' }, { value: 'teacher', label: 'อาจารย์' }, { value: 'ta', label: 'TA' }, { value: 'student', label: 'นักเรียน' }
];

const selectedRoleLabel = computed(() => roleOptions.find(r => r.value === roleFilter.value)?.label || 'ทุกสิทธิ์');

const isCourseModalOpen = ref(false);
const isBulkOpen = ref(false);
const isManualAddUserOpen = ref(false);
const isCategoryModalOpen = ref(false); 
const isSubmitting = ref(false);
const isProfileModalOpen = ref(false);
const isUserDetailsModalOpen = ref(false);
const isSystemSettingsModalOpen = ref(false);
const selectedUser = ref<any>(null); 

const profileForm = ref({ dob: '', avatarFile: null as File | null, delete_image: false });
const previewAvatar = ref('');

const newCourse = ref({ course_code: '', title: '', description: '', category_id: '', is_public: true });
const selectedFile = ref<File | null>(null);
const bulkFile = ref<any>(null); 
const bulkMsg = ref('');

const manualUserForm = ref({ full_name: '', email: '', password: '', student_id: '', role: 'student' });
const newCategoryForm = ref({ name: '', parent_id: '' });

const isAlertModalOpen = ref(false);
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
const isConfirmModalOpen = ref(false);
const confirmMessage = ref('');
let confirmActionCallback: (() => void) | null = null;

const showAlert = (msg: string, type: 'success' | 'error' = 'success') => { alertMessage.value = msg; alertType.value = type; isAlertModalOpen.value = true; };
const showConfirm = (msg: string, callback: () => void) => { confirmMessage.value = msg; confirmActionCallback = callback; isConfirmModalOpen.value = true; };
const executeConfirm = () => { if (confirmActionCallback) confirmActionCallback(); isConfirmModalOpen.value = false; };

const categoryTree = computed(() => {
  const mains = categories.value.filter(c => !c.parent_id);
  return mains.map(m => ({ ...m, children: categories.value.filter(c => c.parent_id === m.id) }));
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    const [catRes, courseRes, setRes] = await Promise.all([ api.get('/api/categories'), api.get('/api/courses', { params: { user_id: authStore.user?.id } }), api.get('/api/settings') ]);
    categories.value = catRes.data; courses.value = courseRes.data;
    if (setRes.data) { systemSettings.value = setRes.data; previewLogo.value = setRes.data.logo_url || ''; previewBg.value = setRes.data.bg_image_url || ''; }
  } catch (e) { console.error(e); } finally { isLoading.value = false; }
};

const fetchUsers = async () => {
  if (!authStore.isAdmin || activeView.value !== 'users') return;
  isLoading.value = true;
  try { const res = await api.get('/api/users', { params: { role: roleFilter.value === 'all' ? null : roleFilter.value, search: searchQuery.value || undefined } }); users.value = res.data; } 
  catch (e) { console.error(e); } finally { isLoading.value = false; }
};

onMounted(async () => {
  if (!authStore.user) return router.push('/login');
  await fetchData();
  if (authStore.isAdmin) fetchUsers();
  profileForm.value.dob = authStore.user?.date_of_birth || '';
  previewAvatar.value = authStore.user?.profile_img_url || '';
});

watch([activeView, roleFilter, searchQuery], () => { if (activeView.value === 'users') fetchUsers(); });

const filteredCourses = computed(() => {
  let res = courses.value;
  if (selectedCategory.value !== null) res = res.filter(c => c.category_id === selectedCategory.value);
  if (privacyFilter.value === 'public') res = res.filter(c => c.is_public);
  if (privacyFilter.value === 'private') res = res.filter(c => !c.is_public);
  return res;
});

const openUserDetails = (user: any) => { selectedUser.value = { ...user }; isUserDetailsModalOpen.value = true; };

const handleJoinCourse = async () => {
    if(!joinCodeInput.value) return showAlert("กรุณากรอกรหัส 5 หลัก", "error");
    try {
        const res = await api.post(`/api/courses/join?user_id=${authStore.user?.id}`, { join_code: joinCodeInput.value });
        joinCodeInput.value = '';
        showAlert("เข้าร่วมคลาสสำเร็จ!", "success");
        await fetchData();
    } catch(e:any) {
        showAlert(e.response?.data?.detail || "รหัสไม่ถูกต้อง หรือคุณอยู่ในคลาสนี้แล้ว", "error");
    }
};

const handleCreateCategory = async () => {
  if (!newCategoryForm.value.name) return showAlert("กรุณากรอกชื่อหมวดหมู่", "error");
  isSubmitting.value = true;
  const payload = { name: newCategoryForm.value.name, parent_id: newCategoryForm.value.parent_id ? parseInt(newCategoryForm.value.parent_id) : null };
  try { await api.post('/api/categories', payload); await fetchData(); newCategoryForm.value = { name: '', parent_id: '' }; showAlert("สร้างหมวดหมู่สำเร็จ", "success"); } 
  catch (e) { showAlert("สร้างหมวดหมู่ล้มเหลว", "error"); } finally { isSubmitting.value = false; }
};

const promptDeleteCategory = (id: number, name: string) => {
  showConfirm(`ลบหมวดหมู่ "${name}" ?`, async () => {
    try { await api.delete(`/api/categories/${id}`); await fetchData(); showAlert("ลบสำเร็จ", "success"); } catch (e) { showAlert("ลบล้มเหลว", "error"); }
  });
};

const changeUserRole = async (newRole: string) => {
  if (!selectedUser.value) return;
  try { await api.put(`/api/admin/update-role/${selectedUser.value.id}?role=${newRole}`); selectedUser.value.system_role = newRole; fetchUsers(); showAlert("อัปเดตสิทธิ์เรียบร้อย", "success"); } 
  catch (e) { showAlert("เปลี่ยนสิทธิ์ล้มเหลว", "error"); }
};

const promptDeleteUser = () => {
  if (!selectedUser.value) return;
  showConfirm(`ลบผู้ใช้นี้ (${selectedUser.value?.full_name}) ถาวร?`, async () => {
    try { await api.delete(`/api/admin/users/${selectedUser.value.id}`); isUserDetailsModalOpen.value = false; fetchUsers(); showAlert("ลบสำเร็จ", "success"); } 
    catch (e) { showAlert("ลบล้มเหลว", "error"); }
  });
};

const handleManualAddUser = async () => {
  if (!manualUserForm.value.email || !manualUserForm.value.password || !manualUserForm.value.full_name) { showAlert("กรอกข้อมูลให้ครบ", "error"); return; }
  isSubmitting.value = true;
  const payload = { full_name: manualUserForm.value.full_name, email: manualUserForm.value.email, password: manualUserForm.value.password, role: manualUserForm.value.role, student_id: manualUserForm.value.student_id || null };
  try { await api.post('/api/admin/users', payload); fetchUsers(); isManualAddUserOpen.value = false; manualUserForm.value = { full_name: '', email: '', password: '', student_id: '', role: 'student' }; showAlert("เพิ่มผู้ใช้งานสำเร็จ", "success"); } 
  catch (e:any) { showAlert("ล้มเหลว: " + (e.response?.data?.detail || "เกิดข้อผิดพลาด"), "error"); } finally { isSubmitting.value = false; }
};

const handleBulkFileChange = (e: Event) => { const target = e.target as HTMLInputElement; if (target.files && target.files.length > 0) { bulkFile.value = target.files[0]; } };
const handleImport = async () => {
  if (!bulkFile.value) { showAlert("กรุณาเลือกไฟล์ก่อนอัปโหลด", "error"); return; }
  isSubmitting.value = true; const fd = new FormData(); fd.append('file', bulkFile.value);
  try { const res = await api.post(`/api/admin/bulk-import-users`, fd, { headers: { 'Content-Type': 'multipart/form-data' }}); bulkMsg.value = res.data.message; fetchUsers(); setTimeout(() => { isBulkOpen.value = false; bulkMsg.value = ''; bulkFile.value = null; }, 2000); } 
  catch (e: any) { bulkMsg.value = "Error: " + (e.response?.data?.detail || "รูปแบบไฟล์ไม่ถูกต้อง"); } finally { isSubmitting.value = false; }
};

const handleLogoChange = (e: any) => { const file = e.target.files[0]; if (file) { settingsFormFiles.value.logoFile = file; previewLogo.value = URL.createObjectURL(file); settingsFormFiles.value.delete_logo = false; } };
const handleBgChange = (e: any) => { const file = e.target.files[0]; if (file) { settingsFormFiles.value.bgFile = file; previewBg.value = URL.createObjectURL(file); settingsFormFiles.value.delete_bg = false; } };
const removeLogo = () => { settingsFormFiles.value.logoFile = null; settingsFormFiles.value.delete_logo = true; previewLogo.value = ''; };
const removeBg = () => { settingsFormFiles.value.bgFile = null; settingsFormFiles.value.delete_bg = true; previewBg.value = ''; };

const saveSystemSettings = async () => {
  isSubmitting.value = true; const fd = new FormData(); fd.append('platform_name', systemSettings.value.platform_name); fd.append('primary_color', systemSettings.value.primary_color); if (settingsFormFiles.value.logoFile) fd.append('logo_file', settingsFormFiles.value.logoFile); if (settingsFormFiles.value.bgFile) fd.append('bg_file', settingsFormFiles.value.bgFile); if (settingsFormFiles.value.delete_logo) fd.append('delete_logo', 'true'); if (settingsFormFiles.value.delete_bg) fd.append('delete_bg', 'true');
  try { const res = await api.put(`/api/admin/settings`, fd, { headers: { 'Content-Type': 'multipart/form-data' }}); systemSettings.value = res.data; isSystemSettingsModalOpen.value = false; showAlert("อัปเดตตั้งค่าสำเร็จ", "success"); } 
  catch (e:any) { showAlert(e.response?.data?.detail || "บันทึกตั้งค่าล้มเหลว", "error"); } finally { isSubmitting.value = false; }
};

const handleAvatarChange = (e: any) => { const file = e.target.files[0]; if (file) { profileForm.value.avatarFile = file; previewAvatar.value = URL.createObjectURL(file); profileForm.value.delete_image = false; } };
const removeAvatar = () => { profileForm.value.avatarFile = null; profileForm.value.delete_image = true; previewAvatar.value = ''; };

const saveProfile = async () => {
  if (!authStore.user) return;
  isSubmitting.value = true; const fd = new FormData(); if (profileForm.value.dob) fd.append('date_of_birth', profileForm.value.dob); if (profileForm.value.avatarFile) fd.append('profile_img', profileForm.value.avatarFile); if (profileForm.value.delete_image) fd.append('delete_image', 'true');
  try { const res = await api.put(`/api/users/${authStore.user.id}/profile`, fd, { headers: { 'Content-Type': 'multipart/form-data' }}); authStore.user = { ...res.data }; localStorage.setItem('user', JSON.stringify(res.data)); isProfileModalOpen.value = false; if (activeView.value === 'users') fetchUsers(); if (selectedUser.value && selectedUser.value.id === authStore.user.id) { selectedUser.value = { ...res.data }; } showAlert("อัปเดตโปรไฟล์สำเร็จ", "success"); } 
  catch (e:any) { showAlert(e.response?.data?.detail || "บันทึกโปรไฟล์ล้มเหลว", "error"); } finally { isSubmitting.value = false; }
};

const handleCourseCoverChange = (e: any) => { if (e.target.files && e.target.files.length > 0) { selectedFile.value = e.target.files[0]; } };
const handleCreateCourse = async () => {
  isSubmitting.value = true; const fd = new FormData(); fd.append('course_code', newCourse.value.course_code); fd.append('title', newCourse.value.title); if (newCourse.value.description) fd.append('description', newCourse.value.description); if (newCourse.value.category_id && newCourse.value.category_id !== "") { fd.append('category_id', String(newCourse.value.category_id)); } fd.append('is_public', String(newCourse.value.is_public)); if (authStore.user) fd.append('creator_id', String(authStore.user.id)); if (selectedFile.value) fd.append('cover_image', selectedFile.value);
  try { const res = await api.post(`/api/courses`, fd, { headers: { 'Content-Type': 'multipart/form-data' }}); await fetchData(); isCourseModalOpen.value = false; newCourse.value = { course_code: '', title: '', description: '', category_id: '', is_public: true }; selectedFile.value = null; showAlert("สร้างรายวิชาสำเร็จ", "success"); } 
  catch (e:any) { showAlert(e.response?.data?.detail || "สร้างรายวิชาล้มเหลว", "error"); } finally { isSubmitting.value = false; }
};

const selectRoleFilter = (role: string) => { roleFilter.value = role; isRoleDropdownOpen.value = false; };
const getRoleBadgeColor = (role: string) => { switch(role?.toLowerCase()) { case 'admin': return 'bg-rose-50 text-rose-700 border-rose-200'; case 'teacher': return 'bg-amber-50 text-amber-700 border-amber-200'; case 'ta': return 'bg-purple-50 text-purple-700 border-purple-200'; default: return 'bg-blue-50 text-blue-700 border-blue-200'; } };
</script>

<template>
  <div class="min-h-screen font-prompt selection:bg-slate-200 transition-colors duration-500 bg-cover bg-center bg-fixed"
       :style="{ 
         '--theme-color': systemSettings?.primary_color || '#161D2D',
         backgroundColor: systemSettings?.bg_image_url ? 'transparent' : '#f8fafc',
         backgroundImage: systemSettings?.bg_image_url ? `url(${getBaseUrl() + systemSettings.bg_image_url})` : 'none'
       }">
    
    <nav class="bg-white/90 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 shadow-sm">
      <div class="max-w-6xl mx-auto px-5 py-3 flex justify-between items-center">
        <div class="flex items-center gap-5">
          <div class="flex items-center gap-2.5">
            <img v-if="systemSettings?.logo_url" :src="getBaseUrl() + systemSettings.logo_url" class="h-8 w-8 object-contain drop-shadow-sm">
            <div v-else class="w-8 h-8 rounded-lg flex items-center justify-center shadow-md text-white font-bold text-sm" :style="{ backgroundColor: 'var(--theme-color)' }">
              {{ systemSettings?.platform_name?.charAt(0) || 'S' }}
            </div>
            <h1 class="text-xl font-bold tracking-tight text-slate-800" :style="{ color: 'var(--theme-color)' }">
              {{ systemSettings?.platform_name || 'SchoolLMS Pro' }}
            </h1>
          </div>
          
          <div v-if="authStore.isAdmin" class="hidden md:flex bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button @click="activeView = 'courses'" :class="[activeView === 'courses' ? 'bg-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50', 'px-4 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5']" :style="activeView === 'courses' ? { color: 'var(--theme-color)' } : {}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> รายวิชา
            </button>
            <button @click="activeView = 'users'" :class="[activeView === 'users' ? 'bg-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50', 'px-4 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5']" :style="activeView === 'users' ? { color: 'var(--theme-color)' } : {}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> ผู้ใช้
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm h-8">
             <input v-model="joinCodeInput" placeholder="กรอกรหัสห้อง (5 หลัก)" class="w-32 bg-transparent outline-none px-3 text-[10px] font-bold text-slate-700 text-center uppercase tracking-widest">
             <button @click="handleJoinCourse" class="text-white px-3 text-[10px] font-bold hover:opacity-90 transition-colors" :style="{ backgroundColor: 'var(--theme-color)' }">เข้าร่วม</button>
          </div>

          <button v-if="authStore.isAdmin" @click="isSystemSettingsModalOpen = true" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <div class="text-right hidden sm:block cursor-pointer" @click="isProfileModalOpen = true">
            <p class="text-xs font-bold text-slate-800 leading-tight">{{ authStore.user?.full_name }}</p>
            <p class="text-[9px] font-bold uppercase tracking-wider text-slate-500" :style="{ color: 'var(--theme-color)' }">{{ authStore.role }}</p>
          </div>
          <div @click="isProfileModalOpen = true" class="h-8 w-8 rounded-full border border-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 text-xs text-white font-bold" :style="{ backgroundColor: 'var(--theme-color)' }">
             <img v-if="authStore.user?.profile_img_url" :src="getBaseUrl() + authStore.user?.profile_img_url" class="w-full h-full object-cover"><span v-else>{{ authStore.user?.full_name?.charAt(0) || 'U' }}</span>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-6xl mx-auto px-5 py-6">
      <Transition name="fade" mode="out-in">
        
        <div v-if="activeView === 'courses'" class="space-y-6" key="courses">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/60 p-5 rounded-2xl backdrop-blur-md border border-white shadow-lg shadow-slate-200/30">
            <div>
              <h2 class="text-xl font-bold text-slate-800 tracking-tight">รายวิชาทั้งหมด</h2>
              <p class="text-[11px] text-slate-500 mt-1 font-medium">จัดการและเข้าถึงบทเรียน</p>
            </div>
            <div class="flex gap-2">
               <button v-if="authStore.isAdmin" @click="isCategoryModalOpen = true" class="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> หมวดหมู่
               </button>
               <button v-if="authStore.canCreate" @click="isCourseModalOpen = true" class="text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md hover:-translate-y-px transition-all flex items-center gap-1.5" :style="{ backgroundColor: 'var(--theme-color)' }">
                 <span class="text-sm leading-none">+</span> สร้างรายวิชา
               </button>
            </div>
          </div>

          <div class="flex flex-col md:flex-row justify-between gap-3">
             <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x flex-1">
               <button @click="selectedCategory = null" :class="[selectedCategory === null ? 'text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300', 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap snap-center']" :style="selectedCategory === null ? { backgroundColor: 'var(--theme-color)' } : {}">ทุกหมวดหมู่</button>
               <template v-for="main in categoryTree" :key="main.id">
                  <button @click="selectedCategory = main.id" :class="[selectedCategory === main.id ? 'text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300', 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap snap-center']" :style="selectedCategory === main.id ? { backgroundColor: 'var(--theme-color)' } : {}">{{ main.name }}</button>
                  <button v-for="sub in main.children" :key="sub.id" @click="selectedCategory = sub.id" :class="[selectedCategory === sub.id ? 'text-white shadow-sm' : 'bg-white/60 text-slate-500 border border-slate-200 border-dashed hover:border-slate-300', 'px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap snap-center']" :style="selectedCategory === sub.id ? { backgroundColor: 'var(--theme-color)' } : {}">↳ {{ sub.name }}</button>
               </template>
             </div>
             <div class="flex bg-white/80 p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
                <button @click="privacyFilter = 'all'" :class="[privacyFilter === 'all' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:bg-slate-50', 'px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all']">ทั้งหมด</button>
                <button @click="privacyFilter = 'public'" :class="[privacyFilter === 'public' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-400 hover:bg-slate-50', 'px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all']">Public</button>
                <button @click="privacyFilter = 'private'" :class="[privacyFilter === 'private' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-100' : 'text-slate-400 hover:bg-slate-50', 'px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all']">Private</button>
             </div>
          </div>

          <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <div v-for="i in 8" :key="i" class="bg-white rounded-2xl h-48 border border-slate-100 shadow-sm animate-pulse"></div>
          </div>

          <TransitionGroup v-else name="list" tag="div" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            <div v-for="c in filteredCourses" :key="c.id" @click="router.push(`/course/${c.id}`)" class="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-56">
              
              <div class="h-28 relative overflow-hidden shrink-0 bg-slate-900 flex flex-col justify-end">
                <img v-if="c.cover_img_url" :src="getBaseUrl() + c.cover_img_url" class="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition duration-500 ease-out">
                <div v-else class="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
                
                <div class="absolute top-3 left-3 flex gap-2">
                  <span class="bg-white px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider shadow-sm" :style="{ color: 'var(--theme-color)' }">{{ c.course_code }}</span>
                  <span v-if="c.is_public" class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md shadow-sm text-[9px] font-bold uppercase flex items-center gap-1"><svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 11h2a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.94M8 3.93v1.56A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1M15 20.48V18a2 2 0 012-2h3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> PUBLIC</span>
                  <span v-else class="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md shadow-sm text-[9px] font-bold uppercase flex items-center gap-1"><svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> PRIVATE</span>
                </div>
              </div>
              
              <div class="p-4 flex-1 flex flex-col justify-between bg-white relative z-10">
                <h3 class="text-base font-bold leading-tight line-clamp-2" :style="{ color: 'var(--theme-color)' }">{{ c.title }}</h3>
                <div class="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center text-slate-400">
                  <span v-if="authStore.isAdmin || authStore.canCreate" class="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">CODE: {{ c.join_code }}</span>
                  <span class="text-[10px] font-bold group-hover:text-slate-600 transition-colors ml-auto">เข้าสู่บทเรียน &rarr;</span>
                </div>
              </div>
            </div>
          </TransitionGroup>
          <div v-if="!isLoading && filteredCourses.length === 0" class="text-center py-16 bg-white/60 backdrop-blur-sm rounded-3xl border border-white shadow-sm text-slate-400 font-semibold text-sm">ไม่มีรายวิชาที่ค้นหา</div>
        </div>

        <div v-else-if="activeView === 'users' && authStore.isAdmin" class="space-y-5 bg-white/60 p-6 rounded-3xl backdrop-blur-md border border-white shadow-lg" key="users">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div><h2 class="text-xl font-bold text-slate-800 tracking-tight">จัดการผู้ใช้งาน</h2><p class="text-[11px] text-slate-500 mt-1 font-medium">จัดการสิทธิ์ รหัสผ่าน</p></div>
            <div class="flex gap-2">
               <button @click="isManualAddUserOpen = true" class="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-50 flex items-center gap-1.5"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg> เพิ่มคน</button>
               <button @click="isBulkOpen = true" class="text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md hover:-translate-y-px flex items-center gap-1.5" :style="{ backgroundColor: 'var(--theme-color)' }"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg> นำเข้า Excel</button>
            </div>
          </div>
          <div class="bg-white p-2.5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-2.5 shadow-sm">
            <div class="relative">
              <button @click="isRoleDropdownOpen = !isRoleDropdownOpen" class="w-full text-left bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 outline-none flex justify-between items-center hover:border-slate-300"><span class="truncate">{{ selectedRoleLabel }}</span><svg class="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg></button>
              <Transition name="fade">
                <div v-if="isRoleDropdownOpen" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 text-xs">
                  <div v-for="role in roleOptions" :key="role.value" @click="selectRoleFilter(role.value)" class="px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer" :class="{'bg-slate-50': roleFilter === role.value}" :style="roleFilter === role.value ? { color: 'var(--theme-color)' } : {}">{{ role.label }}</div>
                </div>
              </Transition>
            </div>
            <div class="md:col-span-3 relative">
              <svg class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input v-model="searchQuery" placeholder="ค้นหาชื่อ, อีเมล, รหัส..." class="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-slate-300">
            </div>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead class="bg-slate-50/80 border-b border-slate-200"><tr><th class="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ข้อมูลผู้ใช้งาน</th><th class="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">สถานะ</th></tr></thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="u in users" :key="u.id" @click="openUserDetails(u)" class="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td class="py-3 px-5"><div class="flex items-center gap-3"><div class="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs shadow-sm" :style="{ backgroundColor: 'var(--theme-color)' }"><img v-if="u.profile_img_url" :src="getBaseUrl() + u.profile_img_url" class="w-full h-full object-cover"><span v-else>{{ u.full_name?.charAt(0) || 'U' }}</span></div><div><div class="font-bold text-slate-800 text-sm group-hover:text-slate-900">{{ u.full_name }}</div><div class="text-[10px] text-slate-500 flex items-center gap-2"><span class="truncate">{{ u.email }}</span><span v-if="u.student_id" class="text-slate-400">ID: {{ u.student_id }}</span></div></div></div></td>
                  <td class="py-3 px-5 text-right align-middle"><span :class="['text-[9px] px-2 py-1 rounded font-bold uppercase tracking-wider border', getRoleBadgeColor(u.system_role)]">{{ u.system_role }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Transition>
    </main>

    <Transition name="modal">
      <div v-if="isAlertModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-xs p-6 shadow-xl text-center">
          <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" :class="alertType === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'"><svg v-if="alertType === 'success'" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg><svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></div>
          <h3 class="text-lg font-bold text-slate-800 mb-1.5">{{ alertType === 'success' ? 'สำเร็จ' : 'แจ้งเตือน' }}</h3><p class="text-xs text-slate-500 mb-4">{{ alertMessage }}</p>
          <button @click="isAlertModalOpen = false" class="w-full text-white font-bold py-2.5 rounded-lg text-xs transition-all" :class="alertType === 'success' ? 'bg-emerald-500' : 'bg-rose-500'">ตกลง</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isConfirmModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-xs p-6 shadow-xl text-center">
          <div class="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
          <h3 class="text-lg font-bold text-slate-800 mb-1.5">ยืนยันดำเนินการ</h3><p class="text-xs text-slate-500 mb-4">{{ confirmMessage }}</p>
          <div class="flex gap-2"><button @click="isConfirmModalOpen = false" class="flex-1 bg-slate-100 text-slate-500 font-semibold py-2.5 rounded-lg text-xs">ยกเลิก</button><button @click="executeConfirm" class="flex-1 bg-rose-500 text-white font-bold py-2.5 rounded-lg shadow-sm text-xs">ยืนยัน</button></div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isCategoryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-lg p-6 shadow-xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
          <button @click="isCategoryModalOpen = false" class="absolute top-5 right-5 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <div class="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <span class="bg-slate-100 text-slate-600 p-1.5 rounded-lg"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></span><h3 class="text-lg font-bold text-slate-800">จัดการหมวดหมู่</h3>
          </div>
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
            <h4 class="text-[10px] font-bold text-slate-500 mb-2">สร้างหมวดหมู่ใหม่</h4>
            <div class="flex flex-col sm:flex-row gap-2">
              <input v-model="newCategoryForm.name" placeholder="ชื่อ..." class="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none font-semibold text-xs focus:border-slate-400">
              <select v-model="newCategoryForm.parent_id" class="w-full sm:w-1/3 p-2 bg-white border border-slate-200 rounded-lg outline-none font-semibold text-xs text-slate-600 cursor-pointer">
                <option value="">(ไม่มีหลัก)</option><option v-for="main in categoryTree" :key="main.id" :value="main.id">ย่อยของ: {{ main.name }}</option>
              </select>
              <button @click="handleCreateCategory" :disabled="isSubmitting" class="text-white font-bold px-4 py-2 rounded-lg text-xs" :style="{ backgroundColor: 'var(--theme-color)' }">เพิ่ม</button>
            </div>
          </div>
          <div class="space-y-2">
            <h4 class="text-[10px] font-bold text-slate-500">รายการ</h4>
            <div v-for="main in categoryTree" :key="main.id" class="bg-white border border-slate-200 rounded-lg overflow-hidden">
               <div class="p-3 flex justify-between items-center bg-slate-50"><span class="font-bold text-xs text-slate-800">{{ main.name }}</span><button @click="promptDeleteCategory(main.id, main.name)" class="text-rose-500 bg-white p-1.5 rounded shadow-sm border border-rose-100"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
               <div v-if="main.children.length > 0" class="p-2 border-t border-slate-100">
                  <div v-for="sub in main.children" :key="sub.id" class="flex justify-between items-center py-1.5 px-3 hover:bg-slate-50 rounded group"><span class="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><svg class="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>{{ sub.name }}</span><button @click="promptDeleteCategory(sub.id, sub.name)" class="text-rose-400 opacity-0 group-hover:opacity-100"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isUserDetailsModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl relative">
          <button @click="isUserDetailsModalOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <div class="flex flex-col items-center mb-4">
            <div class="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl mb-3 shadow-md" :style="{ backgroundColor: 'var(--theme-color)' }"><img v-if="selectedUser?.profile_img_url" :src="getBaseUrl() + selectedUser?.profile_img_url" class="w-full h-full object-cover"><span v-else>{{ selectedUser?.full_name?.charAt(0) || 'U' }}</span></div>
            <h3 class="text-lg font-bold text-slate-800">{{ selectedUser?.full_name }}</h3>
            <div class="mt-2" v-if="authStore.isAdmin">
               <select v-model="selectedUser.system_role" @change="changeUserRole(selectedUser.system_role)" class="text-[10px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider border outline-none bg-slate-50 text-slate-600"><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="ta">TA</option><option value="student">Student</option></select>
            </div>
            <span v-else :class="['text-[9px] px-2.5 py-1 rounded font-bold uppercase tracking-wider border mt-2', getRoleBadgeColor(selectedUser?.system_role || '')]">{{ selectedUser?.system_role }}</span>
          </div>
          <div class="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div class="flex justify-between items-center border-b border-slate-200 pb-2"><span class="text-[10px] font-bold text-slate-400">อีเมล</span><span class="text-xs font-semibold text-slate-700">{{ selectedUser?.email }}</span></div>
            <div class="flex justify-between items-center border-b border-slate-200 pb-2"><span class="text-[10px] font-bold text-slate-400">รหัส</span><span class="text-xs font-semibold text-slate-700">{{ selectedUser?.student_id || '-' }}</span></div>
            <div class="flex justify-between items-center"><span class="text-[10px] font-bold text-slate-400">วันเกิด</span><span class="text-xs font-semibold text-slate-700">{{ selectedUser?.date_of_birth || '-' }}</span></div>
          </div>
          <button v-if="authStore.isAdmin" @click="promptDeleteUser" class="w-full mt-4 bg-white border border-rose-100 text-rose-500 font-bold py-2 rounded-lg text-xs hover:bg-rose-50">ลบผู้ใช้งาน</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isProfileModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl relative">
          <button @click="isProfileModalOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <h3 class="text-lg font-bold text-slate-800 mb-4">โปรไฟล์ฉัน</h3>
          <div class="flex flex-col items-center mb-4 relative">
            <label class="relative w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md overflow-hidden group cursor-pointer border-2 border-slate-100" :style="{ backgroundColor: 'var(--theme-color)' }">
              <img v-if="previewAvatar" :src="previewAvatar" class="w-full h-full object-cover">
              <span v-else class="group-hover:hidden">{{ authStore.user?.full_name?.charAt(0) || 'U' }}</span>
              <div class="hidden group-hover:flex inset-0 bg-black/50 items-center justify-center absolute"><svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
              <input type="file" @change="handleAvatarChange" accept="image/*" class="hidden">
            </label>
            <button v-if="previewAvatar" @click="removeAvatar" class="mt-2 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded">ลบรูปโปรไฟล์</button>
            <p class="text-xs font-semibold text-slate-500 mt-2">{{ authStore.user?.email }}</p>
          </div>
          <div class="space-y-3">
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">วันเกิด</label><input type="date" v-model="profileForm.dob" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-700 text-xs"></div>
          </div>
          <div class="flex gap-2 mt-5"><button @click="authStore.logout(); router.push('/login')" class="flex-1 bg-rose-50 text-rose-600 font-bold py-2 rounded-lg text-xs">ออกจากระบบ</button><button @click="saveProfile" :disabled="isSubmitting" class="flex-1 text-white font-bold py-2 rounded-lg shadow-sm text-xs" :style="{ backgroundColor: 'var(--theme-color)' }">{{ isSubmitting ? 'รอ...' : 'บันทึก' }}</button></div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isSystemSettingsModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl relative">
          <button @click="isSystemSettingsModalOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5"><svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> ตั้งค่าระบบ</h3>
          <div class="space-y-4">
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">ชื่อแพลตฟอร์ม</label><input v-model="systemSettings.platform_name" type="text" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"></div>
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">สีหลัก</label><div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200"><input v-model="systemSettings.primary_color" type="color" class="w-8 h-8 rounded border-none"><span class="font-semibold text-slate-600 text-xs uppercase">{{ systemSettings.primary_color }}</span></div></div>
            <div>
              <div class="flex justify-between items-center mb-1"><label class="block text-[10px] font-bold text-slate-500">โลโก้</label><button v-if="previewLogo" @click="removeLogo" class="text-[9px] font-bold text-rose-500">ลบโลโก้</button></div>
              <input type="file" @change="handleLogoChange" accept="image/*" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-semibold file:bg-slate-200 border border-dashed border-slate-300 p-1.5 rounded-lg">
            </div>
            <div>
              <div class="flex justify-between items-center mb-1"><label class="block text-[10px] font-bold text-slate-500">ภาพพื้นหลัง</label><button v-if="previewBg" @click="removeBg" class="text-[9px] font-bold text-rose-500">ลบพื้นหลัง</button></div>
              <input type="file" @change="handleBgChange" accept="image/*" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-semibold file:bg-slate-200 border border-dashed border-slate-300 p-1.5 rounded-lg">
            </div>
          </div>
          <button @click="saveSystemSettings" :disabled="isSubmitting" class="w-full mt-5 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm" :style="{ backgroundColor: 'var(--theme-color)' }">{{ isSubmitting ? 'บันทึก...' : 'บันทึก' }}</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isManualAddUserOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl relative">
          <button @click="isManualAddUserOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <h3 class="text-lg font-bold text-slate-800 mb-4">เพิ่มผู้ใช้</h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
               <div><label class="block text-[10px] font-bold text-slate-500 mb-1">ชื่อ-สกุล *</label><input v-model="manualUserForm.full_name" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"></div>
               <div><label class="block text-[10px] font-bold text-slate-500 mb-1">รหัส(ถ้ามี)</label><input v-model="manualUserForm.student_id" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"></div>
            </div>
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">อีเมล *</label><input v-model="manualUserForm.email" type="email" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"></div>
            <div class="grid grid-cols-2 gap-2">
               <div><label class="block text-[10px] font-bold text-slate-500 mb-1">รหัสผ่าน *</label><input v-model="manualUserForm.password" type="text" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"></div>
               <div><label class="block text-[10px] font-bold text-slate-500 mb-1">สิทธิ์ *</label><select v-model="manualUserForm.role" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"><option value="student">Student</option><option value="ta">TA</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></div>
            </div>
          </div>
          <button @click="handleManualAddUser" :disabled="isSubmitting" class="w-full mt-5 text-white font-bold py-2.5 rounded-lg text-xs shadow-sm" :style="{ backgroundColor: 'var(--theme-color)' }">เพิ่ม</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isBulkOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-xl relative">
          <button @click="isBulkOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <div class="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-3"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
          <h3 class="text-lg font-bold mb-1 text-slate-800">นำเข้าข้อมูล</h3>
          <p class="text-[9px] text-rose-500 mb-4 bg-rose-50 p-2 rounded border font-bold">รหัสผ่านเริ่มต้น: AB123456</p>
          <label class="block border-2 border-dashed border-slate-300 rounded-xl p-5 hover:bg-slate-50 cursor-pointer mb-4">
            <input type="file" @change="handleBulkFileChange" accept=".csv, .xlsx" class="hidden">
            <span v-if="bulkFile" class="font-bold text-slate-700 flex flex-col items-center gap-1 text-xs"><svg class="h-6 w-6 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>{{ bulkFile?.name }}</span>
            <span v-else class="font-bold text-slate-400 text-[10px] flex flex-col items-center gap-1"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>เลือกไฟล์ .csv / .xlsx</span>
          </label>
          <div v-if="bulkMsg" class="mb-4 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-700">{{ bulkMsg }}</div>
          <button @click="handleImport" :disabled="isSubmitting || !bulkFile" class="w-full text-white font-bold py-2.5 rounded-lg text-xs disabled:opacity-50" :style="{ backgroundColor: 'var(--theme-color)' }">นำเข้าข้อมูล</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isCourseModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-3xl w-full max-w-lg p-6 shadow-xl relative">
          <button @click="isCourseModalOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full"><svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
          <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5"><span class="text-white p-1.5 rounded-lg" :style="{ backgroundColor: 'var(--theme-color)' }"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></span> สร้างวิชา</h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-[10px] font-bold text-slate-500 mb-1">รหัสวิชา</label><input v-model="newCourse.course_code" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"></div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 mb-1">หมวดหมู่</label>
                <select v-model="newCourse.category_id" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"><option value="">เลือก</option><optgroup v-for="main in categoryTree" :key="main.id" :label="main.name"><option :value="main.id">{{ main.name }}</option><option v-for="sub in main.children" :key="sub.id" :value="sub.id">- {{ sub.name }}</option></optgroup></select>
              </div>
            </div>
            <div>
               <label class="block text-[10px] font-bold text-slate-500 mb-1">ความเป็นส่วนตัว</label>
               <div class="flex gap-2">
                  <label class="flex-1 border rounded-lg p-2 flex items-center gap-2 cursor-pointer text-xs" :class="{'ring-1 ring-emerald-500 bg-emerald-50': newCourse.is_public}"><input type="radio" v-model="newCourse.is_public" :value="true" class="hidden"><span class="font-bold text-slate-700">Public</span></label>
                  <label class="flex-1 border rounded-lg p-2 flex items-center gap-2 cursor-pointer text-xs" :class="{'ring-1 ring-rose-500 bg-rose-50': !newCourse.is_public}"><input type="radio" v-model="newCourse.is_public" :value="false" class="hidden"><span class="font-bold text-slate-700">Private</span></label>
               </div>
            </div>
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">ชื่อวิชา</label><input v-model="newCourse.title" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"></div>
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">คำอธิบาย</label><textarea v-model="newCourse.description" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none h-16 resize-none"></textarea></div>
            <div><label class="block text-[10px] font-bold text-slate-500 mb-1">รูปปก</label><input type="file" @change="handleCourseCoverChange" accept="image/*" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-slate-200 border border-dashed border-slate-300 p-1.5 rounded-lg"></div>
          </div>
          <button @click="handleCreateCourse" :disabled="isSubmitting" class="w-full mt-5 text-white font-bold py-2.5 rounded-lg text-xs" :style="{ backgroundColor: 'var(--theme-color)' }">บันทึก</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
.font-prompt { font-family: 'Prompt', sans-serif; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-5px); }
.modal-enter-active, .modal-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95) translateY(-5px); }
</style>