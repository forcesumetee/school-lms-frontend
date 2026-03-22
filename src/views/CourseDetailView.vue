<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import { QrcodeStream } from 'vue-qrcode-reader';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const courseId = route.params.id;
const getBaseUrl = () => api.defaults.baseURL ? api.defaults.baseURL.replace(/\/$/, '') : '';

const course = ref<any>(null);
const activeMenu = ref('lessons');
const activeLessonId = ref<number | null>(null);
const members = ref<any[]>([]);
const isEnrolled = ref(false);
const userCourseRole = ref('');
const isLoading = ref(true);
const systemSettings = ref({ primary_color: '#2563eb' });

const isAlertModalOpen = ref(false);
const alertMessage = ref('');
const alertType = ref<'success' | 'error'>('success');
let alertCloseCallback: (() => void) | null = null;
const isConfirmModalOpen = ref(false);
const confirmMessage = ref('');
let confirmActionCallback: (() => void) | null = null;
const isPromptModalOpen = ref(false);
const promptMessage = ref('');
const promptExpectedValue = ref('');
const promptInputValue = ref('');
let promptActionCallback: (() => void) | null = null;

const isFeedbackModalOpen = ref(false);
const currentFeedbackText = ref('');

const showAlert = (msg: string, type: 'success' | 'error' = 'success', onClose: (() => void) | null = null) => { alertMessage.value = msg; alertType.value = type; alertCloseCallback = onClose; isAlertModalOpen.value = true; };
const closeAlert = () => { isAlertModalOpen.value = false; if (alertCloseCallback) alertCloseCallback(); };
const showConfirm = (msg: string, callback: () => void) => { confirmMessage.value = msg; confirmActionCallback = callback; isConfirmModalOpen.value = true; };
const executeConfirm = () => { if (confirmActionCallback) confirmActionCallback(); isConfirmModalOpen.value = false; };
const showPrompt = (msg: string, expected: string, callback: () => void) => { promptMessage.value = msg; promptExpectedValue.value = expected; promptInputValue.value = ''; promptActionCallback = callback; isPromptModalOpen.value = true; };
const executePrompt = () => { if (promptInputValue.value === promptExpectedValue.value) { if (promptActionCallback) promptActionCallback(); isPromptModalOpen.value = false; } else { showAlert("ข้อมูลไม่ถูกต้อง", "error"); isPromptModalOpen.value = false; } };

const syllabusEditMode = ref(false);
const editedSyllabus = ref('');
const syllabusEditor = ref<HTMLElement | null>(null);

const lessons = ref<any[]>([]);
const newLesson = ref({ title: '', content: '', video: null as File|null, doc: null as File|null });
const isEditLessonModalOpen = ref(false);
const editingLesson = ref({ id: 0, title: '', content: '' });

const assignments = ref<any[]>([]);
const newAssignment = ref({ title: '', desc: '', date: '', files: [] as File[] });
const studentFiles = ref<File[]>([]);
const studentCommentInput = ref('');

const quizzes = ref<any[]>([]);
const quizType = ref('standalone'); 
const newQuiz = ref({ title: '', desc: '', start: '', end: '', vidId: '' });
const newQuizQuestions = ref<any[]>([{ question_text: '', q_type: 'choice', choice_a: '', choice_b: '', choice_c: '', choice_d: '', correct_answer: '', file: null }]);
const activeQuiz = ref<any>(null); 
const studentAnswers = ref<any>({}); 
const quizSubmitFile = ref<File | null>(null);

const assignmentDashboardData = ref<any>(null);
const quizDashboardData = ref<any>(null);
const studentDashboard = ref<any>({ assignments: [], quizzes: [] });

const expandedHistorySubId = ref<number | null>(null);

const activeStudentDetail = ref<any>(null);
const isStudentDetailModalOpen = ref(false);
const studentDetailTab = ref('attendance');
const activeQuizSubmission = ref<any>(null);
const activeQuizDashboardObj = ref<any>(null);

const chats = ref<any[]>([]);
const chatInput = ref('');
const chatImage = ref<File | null>(null);
const chatContainer = ref<HTMLElement | null>(null);

const activeAttendance = ref<any>(null);
const studentCodeInput = ref('');
const isCameraOpen = ref(false);
const studentHistory = ref<any[]>([]);
const teacherRecords = ref<any>(null);
const manualAddEmail = ref('');
const manualAddRole = ref('student');

const icons = {
  check: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
  x: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
  question: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  alert: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
  lock: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`,
  unlock: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`,
  play: `<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>`,
  document: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
  crown: `<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`,
  clock: `<svg class="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  trash: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
  edit: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`,
  photo: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  check_green: `<svg class="w-4 h-4 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`,
  cross_red: `<svg class="w-4 h-4 text-rose-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`,
  check_orange: `<svg class="w-4 h-4 text-amber-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`,
  cross_blue: `<svg class="w-4 h-4 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`
};

const baseMenus = [
  { id: 'lessons', name: 'บทเรียนออนไลน์', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>` },
  { id: 'assignments', name: 'การบ้าน', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>` },
  { id: 'quizzes', name: 'แบบทดสอบ', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>` },
  { id: 'attendance', name: 'เช็คชื่อ', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>` },
  { id: 'syllabus', name: 'รายละเอียดวิชา', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>` },
  { id: 'members', name: 'สมาชิก', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>` },
  { id: 'chat', name: 'แชทกลุ่ม', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>` }
];

const menus = computed(() => {
  let m = [...baseMenus];
  if (userCourseRole.value === 'student') {
    m.splice(2, 0, { id: 'dashboard', name: 'ผลการเรียน', icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>` });
  }
  return m;
});

const parseJsonArray = (str: string | null) => {
  try { return JSON.parse(str || '[]'); } catch { return []; }
};

const fetchCourseData = async () => {
  isLoading.value = true;
  try {
    const setRes = await api.get('/api/settings');
    if (setRes.data) systemSettings.value = setRes.data;

    const res = await api.get(`/api/courses/${courseId}`);
    course.value = res.data; 
    editedSyllabus.value = res.data.syllabus || '';
    
    const memRes = await api.get(`/api/courses/${courseId}/members`);
    members.value = memRes.data;
    
    const myMembership = members.value.find(m => m.user_id === authStore.user?.id);
    if (myMembership) { 
      isEnrolled.value = true; 
      userCourseRole.value = myMembership.role; 
    } else if (authStore.isAdmin) { 
      isEnrolled.value = true; 
      userCourseRole.value = 'admin'; 
    }
    
    if (isEnrolled.value) { loadTabContent(activeMenu.value); }
  } catch (e) { showAlert("ไม่พบรายวิชา", "error", () => router.push('/')); } finally { isLoading.value = false; }
};

onMounted(fetchCourseData);

const canManageCourse = computed(() => {
    if (authStore.isAdmin) return true;
    const role = String(userCourseRole.value).toLowerCase();
    return ['admin', 'teacher', 'ta'].includes(role);
});

const loadTabContent = (menu: string) => {
  activeMenu.value = menu;
  if (menu === 'chat') fetchChat();
  if (menu === 'lessons') { fetchQuizzes(); fetchLessons(); }
  if (menu === 'assignments') fetchAssignments();
  if (menu === 'quizzes') { fetchQuizzes(); fetchLessons(); } 
  if (menu === 'attendance') fetchAttendanceData();
  if (menu === 'dashboard') fetchStudentDashboard();
};

const isQuizOpen = (q: any) => {
   if (!q.start_time && !q.end_time) return true;
   
   const now = new Date();
   if (q.start_time && new Date(q.start_time) > now) return false;
   if (q.end_time && new Date(q.end_time) < now) return false;
   
   return true;
};
const isQuizExpired = (q: any) => {
   if (!q.end_time) return false;
   return new Date(q.end_time) < new Date();
};

const pretestQuizzes = computed(() => quizzes.value.filter(q => q.is_pretest));
const fetchLessons = async () => {
  try {
    const res = await api.get(`/api/courses/${courseId}/lessons`);
    lessons.value = res.data;
    if(lessons.value.length > 0 && !activeLessonId.value) activeLessonId.value = lessons.value[0].id;
  } catch (e) { console.error(e); }
};
const activeLesson = computed(() => lessons.value.find(l => l.id === activeLessonId.value));
const activeLessonQuizzes = computed(() => quizzes.value.filter(q => q.lesson_id === activeLessonId.value));

const createLesson = async () => {
  if(!newLesson.value.title) return showAlert("กรุณาใส่ชื่อบทเรียน", "error");
  const fd = new FormData();
  fd.append('title', newLesson.value.title);
  if(newLesson.value.content) fd.append('content', newLesson.value.content);
  if(newLesson.value.video) fd.append('video_file', newLesson.value.video);
  if(newLesson.value.doc) fd.append('file', newLesson.value.doc);
  try {
    await api.post(`/api/courses/${courseId}/lessons`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    newLesson.value = { title: '', content: '', video: null, doc: null };
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => input.value = '');
    fetchLessons(); showAlert("เพิ่มบทเรียนสำเร็จ", "success");
  } catch (e: any) { showAlert(e.response?.data?.detail || "เพิ่มบทเรียนล้มเหลว", "error"); }
};

const deleteLesson = async (id: number) => {
  showConfirm("คุณแน่ใจหรือไม่ที่จะลบบทเรียนนี้? (ควิซที่เชื่อมโยงจะถูกปลดออก)", async () => {
    try {
      await api.delete(`/api/courses/${courseId}/lessons/${id}`);
      if(activeLessonId.value === id) activeLessonId.value = null;
      fetchLessons();
      showAlert("ลบบทเรียนสำเร็จ", "success");
    } catch(e: any) { showAlert(e.response?.data?.detail || "ลบล้มเหลว", "error"); }
  });
};

const openEditLessonModal = (lesson: any) => {
  editingLesson.value = { id: lesson.id, title: lesson.title, content: lesson.content || '' };
  isEditLessonModalOpen.value = true;
};
const saveEditLesson = async () => {
  const fd = new FormData();
  fd.append('title', editingLesson.value.title);
  fd.append('content', editingLesson.value.content);
  try {
    await api.put(`/api/courses/${courseId}/lessons/${editingLesson.value.id}`, fd);
    isEditLessonModalOpen.value = false;
    fetchLessons();
    showAlert("อัปเดตบทเรียนสำเร็จ", "success");
  } catch(e: any) { showAlert(e.response?.data?.detail || "อัปเดตล้มเหลว", "error"); }
};

const vidControl = (action: string, value: number = 0) => {
  const v = document.getElementById(`main-vid`) as HTMLVideoElement;
  if(!v) return;
  if(action === 'play') v.paused ? v.play() : v.pause();
  if(action === 'skip') v.currentTime += value;
  if(action === 'speed') v.playbackRate = value;
};

// ==========================================
// 📝 ASSIGNMENTS 
// ==========================================
const fetchAssignments = async () => {
  assignmentDashboardData.value = null;
  try {
    const res = await api.get(`/api/courses/${courseId}/assignments`);
    if(userCourseRole.value === 'student') {
      for(let a of res.data) {
        try { const sub = await api.get(`/api/assignments/${a.id}/submissions/${authStore.user?.id}`); a.mySubmission = sub.data; } catch(e) { a.mySubmission = null; }
      }
    }
    assignments.value = res.data;
  } catch (e) { console.error(e); }
};

const handleTeacherFiles = (e: any) => {
    studentFiles.value = [];
    if (e.target.files) {
        for(let i=0; i<e.target.files.length; i++) {
            newAssignment.value.files.push(e.target.files[i]);
        }
    }
};

const createAssignment = async () => {
  if(!newAssignment.value.title || !newAssignment.value.date) return showAlert("กรอกข้อมูลให้ครบ", "error");
  const fd = new FormData();
  fd.append('title', newAssignment.value.title); 
  if (newAssignment.value.desc) fd.append('description', newAssignment.value.desc); 
  fd.append('due_date', newAssignment.value.date);
  
  if (newAssignment.value.files.length > 0) {
      newAssignment.value.files.forEach(f => fd.append('files', f));
  }

  try {
    await api.post(`/api/courses/${courseId}/assignments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    newAssignment.value = { title: '', desc: '', date: '', files: [] }; 
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => input.value = '');
    fetchAssignments(); showAlert("สร้างการบ้านสำเร็จ", "success");
  } catch (e: any) { 
      showAlert(e.response?.data?.detail || "สร้างการบ้านล้มเหลว", "error"); 
  }
};

const deleteAssignment = async (id: number) => {
  showConfirm("คุณแน่ใจหรือไม่ที่จะลบการบ้านนี้? (ข้อมูลการส่งงานจะหายทั้งหมด)", async () => {
    try {
      await api.delete(`/api/courses/${courseId}/assignments/${id}`);
      fetchAssignments(); showAlert("ลบการบ้านสำเร็จ", "success");
    } catch(e: any) { showAlert(e.response?.data?.detail || "ลบล้มเหลว", "error"); }
  });
};

const handleStudentFiles = (e: any) => {
    studentFiles.value = [];
    if (e.target.files) {
        for(let i=0; i<e.target.files.length; i++) {
            studentFiles.value.push(e.target.files[i]);
        }
    }
};

const submitAssignment = async (assignId: number) => {
  if(studentFiles.value.length === 0 && !studentCommentInput.value) return showAlert("กรุณาแนบไฟล์หรือเขียนข้อความ", "error");
  const fd = new FormData(); 
  fd.append('user_id', String(authStore.user?.id)); 
  
  studentFiles.value.forEach(f => fd.append('files', f));
  if (studentCommentInput.value) fd.append('student_comment', studentCommentInput.value);

  try {
    await api.post(`/api/assignments/${assignId}/submit`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    studentFiles.value = []; 
    studentCommentInput.value = '';
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => input.value = '');
    fetchAssignments(); showAlert("บันทึกการส่งงานสำเร็จ", "success");
  } catch (e: any) { showAlert(e.response?.data?.detail || "ส่งงานล้มเหลว", "error"); }
};

const openAssignmentDashboard = async (assignId: number) => {
  try {
    const res = await api.get(`/api/assignments/${assignId}/dashboard`);
    assignmentDashboardData.value = res.data;
    expandedHistorySubId.value = null; 
  } catch (e) { showAlert("ไม่สามารถดึงข้อมูลได้", "error"); }
};

const saveGrade = async (subId: number, score: number, comment: string) => {
  try {
    await api.put(`/api/assignments/submissions/${subId}/grade`, { score: parseInt(String(score)), comment: comment || '' });
    showAlert("บันทึกการประเมินสำเร็จ", "success");
  } catch (e) { showAlert("บันทึกล้มเหลว", "error"); }
};

const getStatusColor = (dueDate: string, subDate: string|null, isLateFlag: boolean = false) => {
  const due = new Date(dueDate);
  if(!subDate) {
     return new Date() > due ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200';
  }
  return isLateFlag ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
};
const getStatusText = (dueDate: string, subDate: string|null, isLateFlag: boolean = false) => {
  const due = new Date(dueDate);
  if(!subDate) return new Date() > due ? 'ขาดส่ง / เลยกำหนดส่ง' : 'ยังไม่ส่ง';
  return isLateFlag ? 'ส่งช้า' : 'ส่งตรงเวลา';
};

const showFeedback = (text: string) => {
    currentFeedbackText.value = text;
    isFeedbackModalOpen.value = true;
};

// ==========================================
// ⏱️ QUIZZES
// ==========================================
const fetchQuizzes = async () => {
  quizDashboardData.value = null;
  try {
    const res = await api.get(`/api/courses/${courseId}/quizzes`);
    if(userCourseRole.value === 'student') {
      for(let q of res.data) {
        try { 
            const sub = await api.get(`/api/quizzes/${q.id}/submission/${authStore.user?.id}`); 
            q.mySubmission = sub.data; 
        } catch(e) { 
            q.mySubmission = null; 
            
            if(isQuizExpired(q)) {
                try {
                    const fd = new FormData();
                    fd.append('user_id', String(authStore.user?.id));
                    fd.append('score', "0");
                    fd.append('total_questions', String(q.questions?.length || 0));
                    fd.append('answers_json', "{}");
                    await api.post(`/api/quizzes/${q.id}/submit-with-files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    
                    const newSub = await api.get(`/api/quizzes/${q.id}/submission/${authStore.user?.id}`);
                    q.mySubmission = newSub.data;
                } catch(submitErr) { console.error("Failed to auto-submit 0 score", submitErr); }
            }
        }
      }
    }
    quizzes.value = res.data;
  } catch (e) { console.error(e); }
};

const addQuizQuestion = () => newQuizQuestions.value.push({ question_text: '', q_type: 'choice', choice_a: '', choice_b: '', choice_c: '', choice_d: '', correct_answer: '', file: null });
const removeQuizQuestion = (index: number) => newQuizQuestions.value.splice(index, 1);

const createQuiz = async () => {
  if(!newQuiz.value.title || newQuizQuestions.value.length === 0) return showAlert("กรุณาตั้งชื่อควิซและเพิ่มคำถาม", "error");
  
  const payload: any = {
    title: newQuiz.value.title,
    description: newQuiz.value.desc,
    is_pretest: quizType.value === 'pretest',
    questions: []
  };

  if (quizType.value === 'lesson') {
    if(!newQuiz.value.vidId) return showAlert("กรุณาเลือกบทเรียนที่จะแนบ", "error");
    payload.lesson_id = parseInt(newQuiz.value.vidId);
  } else {
    payload.start = newQuiz.value.start ? newQuiz.value.start : null;
    payload.end = newQuiz.value.end ? newQuiz.value.end : null;
  }

  const fd = new FormData();
  newQuizQuestions.value.forEach(q => {
      payload.questions.push({
          question_text: q.question_text, q_type: q.q_type,
          choice_a: q.choice_a, choice_b: q.choice_b, choice_c: q.choice_c, choice_d: q.choice_d,
          correct_answer: q.correct_answer, has_file: !!q.file
      });
      if(q.file) fd.append('files', q.file);
  });
  fd.append('data', JSON.stringify(payload));

  try {
    await api.post(`/api/courses/${courseId}/quizzes/create-with-files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    newQuiz.value = { title: '', desc: '', start: '', end: '', vidId: '' }; 
    quizType.value = 'standalone';
    newQuizQuestions.value = [{ question_text: '', q_type: 'choice', choice_a: '', choice_b: '', choice_c: '', choice_d: '', correct_answer: '', file: null }];
    fetchQuizzes(); showAlert("สร้างควิซสำเร็จ", "success");
  } catch(e: any) { 
    showAlert(e.response?.data?.detail || "ไม่สามารถสร้างควิซได้", "error"); 
  }
};

const deleteQuiz = async (id: number) => {
  showConfirm("คุณแน่ใจหรือไม่ที่จะลบแบบทดสอบนี้? (คะแนนนักเรียนจะหายทั้งหมด)", async () => {
    try {
      await api.delete(`/api/courses/${courseId}/quizzes/${id}`);
      fetchQuizzes(); fetchLessons(); showAlert("ลบสำเร็จ", "success");
    } catch(e: any) { showAlert(e.response?.data?.detail || "ลบล้มเหลว", "error"); }
  });
};

const startQuiz = (quiz: any) => { 
    if(userCourseRole.value === 'student' && !isQuizOpen(quiz)) {
        return showAlert("ควิซนี้ยังไม่เปิด หรือหมดเวลาทำข้อสอบแล้ว", "error");
    }
    activeQuiz.value = quiz; 
    studentAnswers.value = {}; 
    quizSubmitFile.value = null; 
};

const submitQuiz = async () => {
  let score = 0;
  activeQuiz.value.questions.forEach((q: any) => {
    if(q.q_type === 'choice' && studentAnswers.value[q.id] === q.correct_answer) score++;
  });
  
  const fd = new FormData();
  fd.append('user_id', String(authStore.user?.id));
  fd.append('score', String(score));
  fd.append('total_questions', String(activeQuiz.value.questions.length));
  fd.append('answers_json', JSON.stringify(studentAnswers.value));
  if(quizSubmitFile.value) fd.append('file', quizSubmitFile.value);

  try {
    await api.post(`/api/quizzes/${activeQuiz.value.id}/submit-with-files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    fetchQuizzes(); fetchLessons(); showAlert(`ส่งคำตอบสำเร็จ! (ข้อเขียนรออาจารย์ตรวจ)`, "success");
    activeQuiz.value = null; quizSubmitFile.value = null;
  } catch(e:any) { showAlert(e.response?.data?.detail || "ส่งล้มเหลว", "error"); }
};

const openQuizDashboard = async (quizId: number) => {
  try {
    const res = await api.get(`/api/quizzes/${quizId}/dashboard`);
    quizDashboardData.value = res.data;
  } catch (e) { showAlert("ไม่สามารถดึงข้อมูลได้", "error"); }
};

const viewQuizAnswers = (submission: any, quizData: any) => {
    activeQuizSubmission.value = submission;
    activeQuizDashboardObj.value = quizzes.value.find(q => q.id === quizData.id) || quizData;
};
const parseQuizAnswers = (jsonStr: string) => {
    try { return JSON.parse(jsonStr || '{}'); } catch { return {}; }
};

const markEssay = (increment: number) => {
    if(activeQuizSubmission.value) {
       let current = activeQuizSubmission.value.score || 0;
       current += increment;
       if (current < 0) current = 0;
       if (current > activeQuizDashboardObj.value.questions.length) current = activeQuizDashboardObj.value.questions.length;
       activeQuizSubmission.value.score = current;
    }
};

const saveQuizGrade = async (subId: number, score: number) => {
  try {
    await api.put(`/api/quizzes/submissions/${subId}/grade`, { score: parseInt(String(score)) });
    showAlert("อัปเดตคะแนนควิซสำเร็จ", "success");
    if(quizDashboardData.value) { openQuizDashboard(quizDashboardData.value.quiz.id); }
    activeQuizSubmission.value = null;
  } catch (e) { showAlert("บันึกคะแนนล้มเหลว", "error"); }
};

const fetchStudentDashboard = async () => {
  try {
    const res = await api.get(`/api/courses/${courseId}/student-dashboard/${authStore.user?.id}`);
    studentDashboard.value = res.data;
  } catch(e) { console.error(e); }
};

const openStudentDetail = async (userId: number) => {
    try {
        const res = await api.get(`/api/courses/${courseId}/student/${userId}/details`);
        activeStudentDetail.value = res.data;
        activeStudentDetail.value.user_id = userId;
        studentDetailTab.value = 'attendance';
        isStudentDetailModalOpen.value = true;
    } catch(e) { showAlert("ไม่สามารถดึงข้อมูลประวัติได้", "error"); }
};
const updateStudentRoleInCourse = async (userId: number, role: string) => {
    try {
        await api.put(`/api/courses/${courseId}/members/${userId}/role?role=${role}`);
        const memRes = await api.get(`/api/courses/${courseId}/members`);
        members.value = memRes.data;
        showAlert("ปรับสิทธิ์สำเร็จ", "success");
    } catch(e) { showAlert("ปรับสิทธิ์ล้มเหลว", "error"); }
};

// ==========================================
// 💬 CHAT 
// ==========================================
const fetchChat = async () => {
  try {
    const res = await api.get(`/api/courses/${courseId}/chat`); chats.value = res.data;
    nextTick(() => { if(chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight; });
  } catch (e) { console.error(e); }
};
const sendChat = async () => {
  if (!chatInput.value.trim() && !chatImage.value) return;
  const fd = new FormData(); fd.append('user_id', String(authStore.user?.id));
  if(chatInput.value) fd.append('message', chatInput.value); if(chatImage.value) fd.append('image', chatImage.value);
  try { await api.post(`/api/courses/${courseId}/chat`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); chatInput.value = ''; chatImage.value = null; fetchChat(); } catch (e: any) { showAlert(e.response?.data?.detail || "ส่งข้อความล้มเหลว", "error"); }
};
let chatInterval: any;
watch(activeMenu, (t) => { if (t === 'chat') { fetchChat(); chatInterval = setInterval(fetchChat, 5000); } else clearInterval(chatInterval); });
onUnmounted(() => clearInterval(chatInterval));

// ==========================================
// 📷 ATTENDANCE
// ==========================================
const fetchAttendanceData = async () => {
  try {
    if (canManageCourse.value) {
      const actRes = await api.get(`/api/courses/${courseId}/attendance/current`); activeAttendance.value = actRes.data;
      const recRes = await api.get(`/api/courses/${courseId}/attendance/records`); teacherRecords.value = recRes.data;
    } else if (userCourseRole.value === 'student') {
      const histRes = await api.get(`/api/courses/${courseId}/attendance/history/${authStore.user?.id}`); studentHistory.value = histRes.data;
    }
  } catch (e) { console.error(e); }
};

const startAttendance = async () => { try { await api.post(`/api/courses/${courseId}/attendance/start`, {}); fetchAttendanceData(); } catch(e:any) { showAlert(e.response?.data?.detail || "ล้มเหลว", "error"); } };
const stopAttendance = async () => { try { await api.post(`/api/courses/${courseId}/attendance/stop`, {}); fetchAttendanceData(); } catch(e:any) { showAlert(e.response?.data?.detail || "ล้มเหลว", "error"); } };
const submitAttendanceCode = async () => {
  if (!studentCodeInput.value) return showAlert("กรุณากรอกรหัส", "error");
  try { await api.post(`/api/courses/${courseId}/attendance/submit`, { user_id: authStore.user?.id, code: studentCodeInput.value }); studentCodeInput.value = ''; isCameraOpen.value = false; fetchAttendanceData(); showAlert("เช็คชื่อสำเร็จ", "success"); } 
  catch (e:any) { showAlert(e.response?.data?.detail || "ล้มเหลว", "error"); }
};
const onDetectQr = async (detectedCodes: any[]) => { if (detectedCodes?.length > 0) { studentCodeInput.value = detectedCodes[0].rawValue; isCameraOpen.value = false; await submitAttendanceCode(); } };
const updateStudentStatus = async (studentId: number, status: string, remark: string) => { try { await api.put(`/api/courses/${courseId}/attendance/records/${studentId}`, { status, remark }); } catch(e) { console.error(e); } };

const formatText = (command: string, value: string | undefined = undefined) => { document.execCommand(command, false, value); if(syllabusEditor.value) syllabusEditor.value.focus(); };
const toggleSyllabusEdit = () => { if(syllabusEditMode.value) syllabusEditMode.value = false; else { syllabusEditMode.value = true; nextTick(()=> { if(syllabusEditor.value) syllabusEditor.value.innerHTML = editedSyllabus.value; }); } };
const saveSyllabus = async () => { if(syllabusEditor.value) editedSyllabus.value = syllabusEditor.value.innerHTML; try { await api.put(`/api/courses/${courseId}/syllabus`, { syllabus: editedSyllabus.value }); if(course.value) course.value.syllabus = editedSyllabus.value; syllabusEditMode.value = false; showAlert("บันทึกสำเร็จ", "success"); } catch(e) { showAlert("ล้มเหลว", "error"); } };

const enrollSelf = async () => { try { await api.post(`/api/courses/${courseId}/enroll`, { email: authStore.user?.email, role: 'student' }); showAlert("ลงทะเบียนสำเร็จ!", "success", () => fetchCourseData()); } catch(e) { showAlert("ลงทะเบียนล้มเหลว", "error"); } };
const addMemberManual = async () => { if (!manualAddEmail.value) return showAlert("ใส่อีเมล", "error"); try { await api.post(`/api/courses/${courseId}/members/manual`, { email: manualAddEmail.value, role: manualAddRole.value }); manualAddEmail.value = ''; const memRes = await api.get(`/api/courses/${courseId}/members`); members.value = memRes.data; showAlert("เพิ่มสำเร็จ", "success"); } catch(e:any) { showAlert(e.response?.data?.detail, "error"); } };
const removeMember = async (userId: number) => { showConfirm("เตะผู้ใช้นี้?", async () => { try { await api.delete(`/api/courses/${courseId}/members/${userId}`); const memRes = await api.get(`/api/courses/${courseId}/members`); members.value = memRes.data; } catch(e) { showAlert("ล้มเหลว", "error"); } }); };
const deleteCourse = async () => { showPrompt("ยืนยันพิมพ์รหัสวิชา:", course.value?.course_code, async () => { try { await api.delete(`/api/courses/${courseId}`); showAlert("ลบสำเร็จ", "success", () => router.push('/')); } catch(e) { showAlert("ล้มเหลว", "error"); } }); };

const getRoleBadgeColor = (role: string) => { switch(role?.toLowerCase()) { case 'admin': return 'bg-rose-50 text-rose-700 border-rose-200'; case 'teacher': return 'bg-amber-50 text-amber-700 border-amber-200'; case 'ta': return 'bg-purple-50 text-purple-700 border-purple-200'; default: return 'bg-blue-50 text-blue-700 border-blue-200'; } };
const formatDate = (ds: string) => new Date(ds).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const formatDateOnly = (ds: string) => new Date(ds).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
const formatTimeOnly = (ds: string) => new Date(ds).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center bg-slate-50" :style="{ '--theme-color': systemSettings?.primary_color || '#2563eb' }">
    <div class="animate-spin w-10 h-10 border-[3px] border-t-transparent rounded-full" :style="{ borderColor: 'var(--theme-color)', borderTopColor: 'transparent' }"></div>
  </div>
  
  <div v-else class="min-h-screen flex flex-col font-prompt selection:bg-slate-200 bg-[#f8fafc]" :style="{ '--theme-color': systemSettings?.primary_color || '#2563eb' }">
    
    <nav class="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/60 flex justify-between items-center px-4 md:px-6 shrink-0 shadow-sm z-30 sticky top-0">
      <button @click="router.push('/')" class="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all">
        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
        <span class="hidden md:inline">ออกจากห้องเรียน</span>
      </button>
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block cursor-pointer">
          <p class="text-xs font-bold text-slate-800 leading-none">{{ authStore.user?.full_name }}</p>
          <p class="text-[9px] font-bold uppercase tracking-wider mt-0.5" style="color: var(--theme-color)">{{ authStore.role }}</p>
        </div>
        <div class="h-8 w-8 rounded-full border border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-xs" style="background-color: var(--theme-color)">
          <img v-if="authStore.user?.profile_img_url" :src="getBaseUrl() + authStore.user?.profile_img_url" class="w-full h-full object-cover">
          <span v-else>{{ authStore.user?.full_name?.charAt(0) || 'U' }}</span>
        </div>
      </div>
    </nav>

    <div v-if="!isEnrolled" class="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div v-if="course?.cover_img_url" class="absolute inset-0 opacity-10"><img :src="getBaseUrl() + course.cover_img_url" class="w-full h-full object-cover blur-sm"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-[#f8fafc] to-transparent z-0"></div>

      <div class="bg-white/80 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-white z-10 w-full max-w-sm text-center">
        <div v-if="!course?.is_public">
          <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-inner" v-html="icons.lock"></div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">คลาสส่วนตัว (Private)</h2>
          <p class="text-xs text-slate-500 font-medium leading-relaxed">คุณต้องได้รับการเชิญเพื่อเข้าถึงเนื้อหาครับ</p>
        </div>
        <div v-else>
          <div class="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-inner" v-html="icons.unlock"></div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">ยินดีต้อนรับสู่รายวิชา!</h2>
          <p class="text-xs text-slate-500 font-medium mb-4 leading-relaxed">วิชานี้เป็นสาธารณะ กดปุ่มเพื่อเข้าเรียนได้ทันที</p>
          <button @click="enrollSelf" class="w-full text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:-translate-y-0.5 transition-all text-sm" style="background-color: var(--theme-color)">ลงทะเบียนเข้าเรียน</button>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <div class="md:hidden bg-white/90 backdrop-blur-md border-b shadow-sm z-20 shrink-0">
        <div class="flex overflow-x-auto scrollbar-hide snap-x px-3 py-1.5 gap-1.5">
          <button v-for="m in menus" :key="m.id" @click="loadTabContent(m.id)" :class="['px-3 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 snap-center border', activeMenu === m.id ? 'text-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-50']" :style="activeMenu === m.id ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}">
            <span v-html="m.icon" :class="activeMenu === m.id ? 'text-white' : 'text-slate-400'"></span> {{ m.name }}
          </button>
        </div>
      </div>

      <aside class="hidden md:flex w-60 bg-white border-r border-slate-200/60 flex-col shrink-0 shadow-[2px_0_12px_rgba(0,0,0,0.02)] z-20 overflow-y-auto scrollbar-hide">
        <div class="p-4 border-b border-slate-100 flex flex-col items-center bg-slate-900 text-white m-2 rounded-xl shadow-md overflow-hidden relative min-h-[140px] justify-end">
           <img v-if="course?.cover_img_url" :src="getBaseUrl() + course?.cover_img_url" class="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform hover:scale-105 duration-700">
           <div v-else class="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-700 to-slate-900"></div>
           <div class="relative z-10 w-full text-center">
             <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm inline-block mb-1.5" style="background-color: var(--theme-color)">{{ course?.course_code }}</span>
             <h2 class="text-sm font-bold leading-tight">{{ course?.title }}</h2>
             <button v-if="canManageCourse" @click="deleteCourse" class="mt-2 bg-rose-500/80 hover:bg-rose-500 text-white text-[9px] font-bold px-2.5 py-1 rounded transition-all shadow-sm">ลบรายวิชา</button>
           </div>
        </div>

        <div class="px-2 py-2 flex-1">
           <div class="px-2 mb-1.5"><h3 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">เมนูจัดการ</h3></div>
           <div class="space-y-0.5">
             <button v-for="m in menus" :key="m.id" @click="loadTabContent(m.id)" :class="['w-full text-left px-3 py-2.5 rounded-lg font-semibold text-xs flex items-center gap-2.5 transition-all duration-200', activeMenu === m.id ? 'shadow-sm' : 'text-slate-500 hover:bg-slate-50']" :style="activeMenu === m.id ? { backgroundColor: 'var(--theme-color)', color: '#ffffff' } : {}">
               <span v-html="m.icon" :class="activeMenu === m.id ? 'text-white' : 'text-slate-400'"></span> {{ m.name }}
             </button>
           </div>
        </div>

        <div class="border-t border-slate-100 p-2 mt-auto">
           <div class="px-2 mb-1.5 flex justify-between items-center">
             <h3 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">เพลย์ลิสต์</h3>
             <span class="text-[9px] font-semibold text-slate-400">{{ lessons.length + pretestQuizzes.length }} รายการ</span>
           </div>
           <div class="space-y-0.5 max-h-40 overflow-y-auto scrollbar-hide">
             <button v-for="(pq, i) in pretestQuizzes" :key="'p'+pq.id" @click="activeMenu='quizzes'; activeQuiz=null; startQuiz(pq)" class="w-full text-left px-2.5 py-2 rounded-lg flex gap-2 transition-all group items-center hover:bg-purple-50">
               <div class="shrink-0 text-purple-500" v-html="icons.document"></div>
               <div class="truncate">
                 <div class="font-semibold text-[11px] truncate text-purple-700 group-hover:text-purple-800">{{ pq.title }} <span class="text-[8px] bg-purple-200 px-1 py-0.5 rounded">Pre</span></div>
               </div>
             </button>

             <div v-for="(l, i) in lessons" :key="l.id">
               <button @click="activeMenu='lessons'; activeLessonId=l.id" :class="['w-full text-left px-2.5 py-2 rounded-lg flex gap-2 transition-all group items-center', activeLessonId === l.id && activeMenu==='lessons' ? 'bg-slate-100 border border-slate-200' : 'hover:bg-slate-50']">
                 <div class="shrink-0" :style="activeLessonId === l.id && activeMenu==='lessons' ? { color: 'var(--theme-color)' } : { color: '#cbd5e1' }" v-html="l.video_url ? icons.play : icons.document"></div>
                 <div class="truncate">
                   <div :class="['font-semibold text-[11px] truncate', activeLessonId === l.id && activeMenu==='lessons' ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800']">{{ i+1 }}. {{ l.title }}</div>
                 </div>
               </button>
               <button v-for="lq in quizzes.filter(q => q.lesson_id === l.id)" :key="'lq'+lq.id" @click="activeMenu='quizzes'; activeQuiz=null; startQuiz(lq)" class="w-full text-left px-2.5 py-1.5 rounded-lg flex gap-2 transition-all group items-center hover:bg-amber-50 pl-6">
                 <div class="shrink-0 text-amber-500"><svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                 <div class="truncate"><div class="font-semibold text-[10px] truncate text-slate-500 group-hover:text-amber-700">Quiz: {{ lq.title }}</div></div>
               </button>
             </div>
             <div v-if="!lessons.length && !pretestQuizzes.length" class="text-center py-3 text-[10px] font-bold text-slate-400">ยังไม่มีเนื้อหา</div>
           </div>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto p-3 md:p-5 scroll-smooth relative">
        <Transition name="fade" mode="out-in">
          
          <div v-if="activeMenu === 'lessons'" key="lessons" class="max-w-4xl mx-auto space-y-4 pb-6">
            <div v-if="canManageCourse" class="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white">
              <h3 class="font-bold text-base mb-4 text-slate-800 flex items-center gap-1.5">อัปโหลดบทเรียนใหม่</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">ชื่อบทเรียน</label>
                  <input v-model="newLesson.title" placeholder="พิมพ์ชื่อบทเรียน..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-slate-400">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">รายละเอียด (แบบย่อ)</label>
                  <input v-model="newLesson.content" placeholder="รายละเอียดคร่าวๆ..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-slate-400">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">อัปโหลดวิดีโอ (MP4)</label>
                  <input type="file" accept="video/mp4" @change="e=>newLesson.video=(e.target as any).files[0]" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 font-semibold border border-slate-200 rounded-lg p-1 cursor-pointer bg-white transition-colors">
                </div>
                <div>
                  <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">ไฟล์ประกอบ (PDF, ZIP)</label>
                  <input type="file" @change="e=>newLesson.doc=(e.target as any).files[0]" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 font-semibold border border-slate-200 rounded-lg p-1 cursor-pointer bg-white transition-colors">
                </div>
              </div>
              <button @click="createLesson" class="text-white font-bold px-5 py-2 text-xs rounded-lg shadow-sm transition-all hover:-translate-y-px" style="background-color: var(--theme-color)">บันทึกบทเรียน</button>
            </div>

            <div v-if="lessons.length" class="md:hidden bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white">
              <h3 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">เพลย์ลิสต์บทเรียน</h3>
              <div class="flex flex-col gap-1.5">
                 <button v-for="(l, i) in lessons" :key="l.id" @click="activeLessonId=l.id" :class="['w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 border transition-all', activeLessonId === l.id ? 'border-transparent shadow-sm text-white' : 'bg-white border-slate-100']" :style="activeLessonId === l.id ? { backgroundColor: 'var(--theme-color)' } : {}">
                   <div :class="activeLessonId === l.id ? 'text-white/80' : 'text-slate-400'" v-html="l.video_url ? icons.play : icons.document"></div>
                   <div :class="['font-semibold text-xs truncate flex-1', activeLessonId === l.id ? 'text-white' : 'text-slate-700']">{{ i+1 }}. {{ l.title }}</div>
                 </button>
              </div>
            </div>

            <div v-if="activeLesson" class="bg-white/90 backdrop-blur-md rounded-2xl shadow-md border border-white overflow-hidden">
              <div class="bg-black relative group" v-if="activeLesson.video_url">
                <video :key="activeLesson.video_url" id="main-vid" class="w-full max-h-[50vh] object-contain outline-none bg-black" controls controlsList="nodownload">
                   <source :src="getBaseUrl() + activeLesson.video_url" type="video/mp4">
                </video>
              </div>
              
              <div v-if="activeLesson.video_url" class="bg-slate-900 px-3 py-2 flex justify-center items-center gap-1.5 flex-wrap text-[10px] border-t border-slate-800">
                  <button @click="vidControl('skip', -10)" class="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded font-bold transition-all">ถอย 10s</button>
                  <button @click="vidControl('play')" class="text-white px-4 py-1.5 rounded font-bold transition-all shadow-sm" style="background-color: var(--theme-color)">เล่น / หยุด</button>
                  <button @click="vidControl('skip', 10)" class="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded font-bold transition-all">ข้าม 10s</button>
                  <div class="w-px h-3 bg-white/20 mx-1.5 rounded"></div>
                  <button @click="vidControl('speed', 1)" class="text-white/70 hover:text-white px-1.5 font-bold transition-colors">1x</button>
                  <button @click="vidControl('speed', 1.5)" class="text-white/70 hover:text-white px-1.5 font-bold transition-colors">1.5x</button>
                  <button @click="vidControl('speed', 2)" class="text-white/70 hover:text-white px-1.5 font-bold transition-colors">2x</button>
              </div>
              
              <div class="p-5 md:p-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                    <span v-html="icons.document" class="w-2.5 h-2.5"></span> บทเรียน
                  </div>
                  <div v-if="canManageCourse" class="flex gap-2">
                    <button @click="openEditLessonModal(activeLesson)" class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1"><span v-html="icons.edit"></span> แก้ไข</button>
                    <button @click="deleteLesson(activeLesson.id)" class="text-[10px] font-bold bg-rose-50 text-rose-500 px-2 py-1 rounded hover:bg-rose-100 flex items-center gap-1"><span v-html="icons.trash"></span> ลบ</button>
                  </div>
                </div>
                <h2 class="text-xl font-bold text-slate-800 mb-2 tracking-tight">{{ activeLesson.title }}</h2>
                <p class="text-slate-500 text-xs leading-relaxed font-medium">{{ activeLesson.content || 'ไม่มีคำอธิบายเพิ่มเติม' }}</p>
                
                <div v-if="activeLesson.file_url" class="mt-4 pt-4 border-t border-slate-100">
                  <a :href="getBaseUrl() + activeLesson.file_url" target="_blank" download class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition-all shadow-sm hover:-translate-y-px text-white w-full md:w-auto text-xs" style="background-color: var(--theme-color)">
                    <span v-html="icons.document"></span> โหลดไฟล์ประกอบ
                  </a>
                </div>

                <div v-if="activeLessonQuizzes.length > 0" class="mt-4 pt-4 border-t border-slate-100">
                  <h4 class="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5"><span v-html="menus[2].icon" style="color: var(--theme-color)"></span> ควิซทดสอบความเข้าใจ</h4>
                  <div class="flex flex-col gap-2">
                     <div v-for="q in activeLessonQuizzes" :key="q.id" class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                        <div>
                          <p class="text-xs font-bold text-slate-700 flex items-center gap-2">
                            {{ q.title }}
                            <span v-if="q.is_pretest" class="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase">ก่อนเรียน</span>
                          </p>
                          <p class="text-[10px] text-slate-500">{{ q.description }}</p>
                        </div>
                        <div v-if="userCourseRole === 'student'">
                           <div v-if="q.mySubmission" class="flex items-center gap-2">
                             <span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1 cursor-not-allowed"><span v-html="icons.check_green"></span> ทำแบบทดสอบแล้ว</span>
                             <span class="text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 text-emerald-700 cursor-not-allowed">{{ q.mySubmission.score }}/{{ q.mySubmission.total_questions }}</span>
                           </div>
                           <button v-else-if="isQuizOpen(q)" @click="activeMenu='quizzes'; startQuiz(q)" class="text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm hover:opacity-90 transition" style="background-color: var(--theme-color)">เริ่มทำ</button>
                           <div v-else class="text-[10px] font-bold bg-rose-50 text-rose-500 px-2 py-1 rounded border border-rose-100 cursor-not-allowed text-center mt-1">หมดเวลาทำข้อสอบ</div>
                        </div>
                        <div v-else>
                           <button @click="activeMenu='quizzes'; openQuizDashboard(q.id)" class="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-300">ดูคะแนน</button>
                        </div>
                     </div>
                  </div>
                </div>

              </div>
            </div>
            <div v-else-if="lessons.length === 0" class="text-center py-16 text-slate-400 text-xs font-semibold bg-white/60 backdrop-blur-sm rounded-2xl border border-white shadow-sm">อาจารย์ยังไม่ได้อัปโหลดบทเรียน</div>
          </div>

          <div v-else-if="activeMenu === 'assignments'" key="assignments" class="max-w-4xl mx-auto space-y-5 pb-6">
            <div v-if="assignmentDashboardData" class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white overflow-hidden">
               <div class="p-5 border-b border-slate-100 flex items-center gap-3">
                  <button @click="assignmentDashboardData = null" class="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-500"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                  <h3 class="text-base font-bold text-slate-800">ผู้ส่งงาน: {{ assignmentDashboardData.assignment.title }}</h3>
               </div>
               <div class="p-5 overflow-x-auto bg-slate-50">
                  <table class="w-full text-left border-separate border-spacing-y-1.5 min-w-[700px]">
                     <thead><tr>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest w-40">รายชื่อนักเรียน</th>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center w-24">สถานะ</th>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">ข้อความจากนักเรียน/ไฟล์แนบ</th>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center w-48">ให้คะแนน</th>
                     </tr></thead>
                     <tbody>
                        <template v-for="s in assignmentDashboardData.students" :key="s.user_id">
                           <tr class="bg-white rounded-lg shadow-sm border border-slate-100">
                              <td class="py-3 px-3 font-semibold text-slate-700 text-xs rounded-l-lg align-top">
                                  <span class="text-slate-400 text-[9px] mr-1.5">{{ s.student_id || '-' }}</span> {{ s.full_name }}
                              </td>
                              <td class="py-3 px-3 text-center align-top">
                                  <span :class="['text-[8px] px-2 py-1 rounded font-bold uppercase tracking-wider border whitespace-nowrap inline-block', getStatusColor(assignmentDashboardData.assignment.due_date, s.submission?.submitted_at, s.submission?.is_late)]">
                                     {{ getStatusText(assignmentDashboardData.assignment.due_date, s.submission?.submitted_at, s.submission?.is_late) }}
                                  </span>
                                  <div v-if="s.histories?.length > 0" class="mt-2">
                                      <button @click="expandedHistorySubId = expandedHistorySubId === s.submission.id ? null : s.submission.id" class="text-[9px] font-bold text-blue-500 hover:underline">ประวัติส่ง ({{ s.histories.length }})</button>
                                  </div>
                              </td>
                              <td class="py-3 px-3 text-xs align-top">
                                  <div v-if="s.submission">
                                      <p v-if="s.submission.student_comment" class="bg-slate-50 p-2 rounded border border-slate-100 text-[10px] text-slate-600 mb-2 italic">"{{ s.submission.student_comment }}"</p>
                                      <div v-if="s.submission.file_urls" class="flex flex-wrap gap-1.5">
                                          <a v-for="(url, i) in parseJsonArray(s.submission.file_urls)" :key="i" :href="getBaseUrl() + url" target="_blank" class="inline-block bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded text-[9px] font-bold hover:bg-emerald-100">ไฟล์ {{ i+1 }}</a>
                                      </div>
                                  </div>
                                  <span v-else class="text-slate-400 text-[10px]">-</span>
                              </td>
                              <td class="py-3 px-3 text-center rounded-r-lg align-top">
                                  <div class="flex flex-col gap-1 items-center">
                                      <div class="flex items-center gap-1 w-full justify-center">
                                         <input v-if="s.submission" type="number" v-model="s.submission.score" class="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-xs font-bold outline-none focus:border-slate-400" placeholder="-">
                                         <input v-if="s.submission" type="text" v-model="s.submission.teacher_comment" class="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-medium outline-none focus:border-slate-400" placeholder="คอมเมนต์อาจารย์...">
                                      </div>
                                      <button v-if="s.submission" @click="saveGrade(s.submission.id, s.submission.score, s.submission.teacher_comment)" class="w-full bg-emerald-500 text-white text-[9px] font-bold px-2 py-1.5 rounded hover:bg-emerald-600 mt-1">บันทึกคะแนน</button>
                                  </div>
                              </td>
                           </tr>
                           <tr v-if="expandedHistorySubId === s.submission?.id && s.histories?.length > 0">
                              <td colspan="4" class="p-0 border-none">
                                  <div class="bg-amber-50/50 p-4 border-l-4 border-amber-300 ml-5 mb-3 rounded-r-lg text-xs space-y-3 shadow-inner">
                                      <h4 class="font-bold text-amber-700 text-[10px] uppercase tracking-widest flex items-center gap-1"><svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ประวัติการแก้ไขส่งงาน</h4>
                                      <div v-for="(h, idx) in s.histories" :key="h.id" class="bg-white p-3 rounded-lg border border-amber-100 shadow-sm flex flex-col gap-2">
                                          <div class="flex justify-between items-center border-b border-slate-50 pb-1">
                                              <span class="text-[9px] font-bold text-slate-500">ครั้งที่ {{ s.histories.length - idx }} (ส่งเมื่อ: {{ formatDate(h.submitted_at) }})</span>
                                              <span v-if="h.is_late" class="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">เลยกำหนด</span>
                                          </div>
                                          <p v-if="h.student_comment" class="text-[10px] text-slate-600 italic border-l-2 border-slate-200 pl-2">"{{ h.student_comment }}"</p>
                                          <div class="flex gap-1.5 flex-wrap">
                                              <a v-for="(url, ui) in parseJsonArray(h.file_urls)" :key="ui" :href="getBaseUrl() + url" target="_blank" class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold hover:bg-slate-200">ไฟล์แนบเก่า {{ ui+1 }}</a>
                                          </div>
                                      </div>
                                  </div>
                              </td>
                           </tr>
                        </template>
                     </tbody>
                  </table>
               </div>
            </div>

            <div v-else>
               <div v-if="canManageCourse" class="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white mb-5">
                 <h3 class="font-bold text-base mb-4 text-slate-800">สั่งการบ้านนักเรียน</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                   <div>
                     <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">หัวข้อการบ้าน</label>
                     <input v-model="newAssignment.title" placeholder="พิมพ์หัวข้อ..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-slate-400">
                   </div>
                   <div>
                     <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">กำหนดส่ง</label>
                     <input v-model="newAssignment.date" type="datetime-local" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-slate-400">
                   </div>
                   <div class="md:col-span-2">
                     <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">รายละเอียดโจทย์</label>
                     <textarea v-model="newAssignment.desc" placeholder="อธิบายโจทย์การบ้าน..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all h-20 resize-none focus:border-slate-400"></textarea>
                   </div>
                   <div class="md:col-span-2">
                     <label class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">ไฟล์แนบโจทย์ (อัปโหลดได้หลายไฟล์)</label>
                     <input type="file" multiple @change="handleTeacherFiles" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 font-semibold border border-slate-200 rounded-lg p-1 cursor-pointer bg-white transition-colors">
                     <div v-if="newAssignment.files.length > 0" class="mt-2 flex gap-1 flex-wrap">
                        <span v-for="(f, i) in newAssignment.files" :key="i" class="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-[9px] font-bold">{{ f.name }}</span>
                     </div>
                   </div>
                 </div>
                 <button @click="createAssignment" class="text-white font-bold px-5 py-2 text-xs rounded-lg w-full md:w-auto shadow-sm transition-all hover:-translate-y-px" style="background-color: var(--theme-color)">บันทึกการบ้าน</button>
               </div>

               <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <div v-for="a in assignments" :key="a.id" class="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white flex flex-col justify-between relative overflow-hidden group hover:-translate-y-px transition-all duration-300">
                   <div class="flex flex-col sm:flex-row sm:justify-between items-start gap-1.5 mb-2.5 relative z-10">
                     <h3 class="text-lg font-bold text-slate-800 leading-tight">{{ a.title }}</h3>
                     <div class="flex items-center gap-2">
                       <span v-if="userCourseRole === 'student'" :class="['text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border whitespace-nowrap shrink-0', getStatusColor(a.due_date, a.mySubmission?.submitted_at, a.mySubmission?.is_late)]">
                         {{ getStatusText(a.due_date, a.mySubmission?.submitted_at, a.mySubmission?.is_late) }}
                       </span>
                       <button v-if="canManageCourse" @click="deleteAssignment(a.id)" class="text-rose-400 hover:text-rose-600"><span v-html="icons.trash"></span></button>
                     </div>
                   </div>
                   <p class="text-xs text-slate-500 mb-4 leading-relaxed font-medium relative z-10">{{ a.description }}</p>
                   
                   <div class="flex items-center gap-2.5 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100 relative z-10 flex-1 w-full max-h-12">
                     <div v-html="icons.clock" class="w-4 h-4 text-slate-400 shrink-0"></div>
                     <div class="flex items-center gap-1"><p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">กำหนดส่ง:</p><p class="text-[10px] font-semibold text-slate-700">{{ formatDate(a.due_date) }}</p></div>
                   </div>
                   
                   <div v-if="a.file_urls" class="mb-4 relative z-10 flex gap-2 flex-wrap">
                     <a v-for="(url, idx) in parseJsonArray(a.file_urls)" :key="idx" :href="getBaseUrl() + url" target="_blank" download class="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors">
                       <span v-html="icons.document"></span> ไฟล์โจทย์ {{ idx + 1 }}
                     </a>
                   </div>
                   
                   <div class="mt-auto pt-4 border-t border-slate-100 relative z-10">
                      <div v-if="userCourseRole === 'student'">
                         <div v-if="a.mySubmission" class="bg-emerald-50/80 p-3 rounded-lg border border-emerald-100 flex flex-col items-center justify-center relative mb-3">
                           <p class="text-[11px] font-bold text-emerald-600 mb-0.5 flex items-center justify-center gap-1"><span v-html="icons.check_green" class="w-3 h-3"></span> ส่งงานแล้ว</p>
                           <p class="text-[9px] text-slate-500 font-medium mb-2 flex items-center gap-1">ส่งล่าสุด: {{ formatDate(a.mySubmission.submitted_at) }}</p>
                           <div v-if="a.mySubmission.teacher_comment" class="w-full mt-1 mb-2">
                              <button @click="showFeedback(a.mySubmission.teacher_comment)" class="w-full text-[9px] font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded shadow-sm flex items-center justify-center gap-1 hover:bg-blue-200 transition-all border border-blue-200">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                มีข้อความตอบกลับจากอาจารย์
                              </button>
                           </div>
                         </div>
                         <div class="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <p v-if="a.mySubmission" class="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded text-center mb-1">ส่งไฟล์ใหม่จะแทนที่ไฟล์เดิม (มีประวัติเก็บไว้ให้อาจารย์ดู)</p>
                           <input type="file" multiple @change="handleStudentFiles" class="text-[9px] font-semibold w-full bg-white border border-slate-200 rounded-lg p-1 cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-100 file:text-slate-600">
                           <div v-if="studentFiles.length > 0" class="flex gap-1 flex-wrap text-[8px] font-bold text-slate-500 px-1">เลือก {{ studentFiles.length }} ไฟล์</div>
                           <textarea v-model="studentCommentInput" placeholder="พิมพ์ข้อความถึงอาจารย์ (ถ้ามี)..." class="text-[10px] w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-slate-400 font-medium h-12 resize-none"></textarea>
                           <button @click="submitAssignment(a.id)" class="text-white text-xs font-bold py-2 rounded-lg shadow-sm transition-all" style="background-color: var(--theme-color)">{{ a.mySubmission ? 'แก้ไขการส่งงาน' : 'ส่งงาน' }}</button>
                         </div>
                      </div>
                      <div v-else class="flex gap-2">
                         <button @click="openAssignmentDashboard(a.id)" class="w-full bg-slate-100 text-slate-600 text-[10px] font-bold py-2 rounded-lg hover:bg-slate-200">ตรวจสอบผู้ส่งงาน (Dashboard)</button>
                      </div>
                   </div>
                 </div>
                 <div v-if="!assignments.length" class="col-span-1 lg:col-span-2 text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-white shadow-sm text-slate-400 text-xs font-bold">อาจารย์ยังไม่ได้สั่งการบ้าน</div>
               </div>
            </div>
          </div>

          <div v-else-if="activeMenu === 'quizzes'" key="quizzes" class="max-w-4xl mx-auto space-y-5 pb-6">
            
            <div v-if="quizDashboardData" class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white overflow-hidden">
               <div class="p-5 border-b border-slate-100 flex items-center gap-3">
                  <button @click="quizDashboardData = null" class="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-500"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                  <h3 class="text-base font-bold text-slate-800">ประวัติส่งแบบทดสอบ: {{ quizDashboardData.quiz.title }}</h3>
               </div>
               <div class="p-5 overflow-x-auto bg-slate-50">
                  <table class="w-full text-left border-separate border-spacing-y-1.5 min-w-[500px]">
                     <thead>
                       <tr>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">รายชื่อนักเรียน</th>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">คะแนนรวม</th>
                         <th class="py-1 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">จัดการ</th>
                       </tr>
                     </thead>
                     <tbody>
                        <tr v-for="s in quizDashboardData.students" :key="s.user_id" class="bg-white rounded-lg shadow-sm">
                           <td class="py-2 px-3 font-semibold text-slate-700 text-xs rounded-l-lg"><span class="text-slate-400 text-[9px] mr-1.5">{{ s.student_id || '-' }}</span> {{ s.full_name }}</td>
                           <td class="py-2 px-3 text-center">
                              <span v-if="s.submission" class="text-emerald-600 font-bold text-xs">{{ s.submission.score }} / {{ s.submission.total_questions }}</span>
                              <span v-else class="text-slate-400 text-[10px]">ยังไม่ทำ</span>
                           </td>
                           <td class="py-2 px-3 text-center rounded-r-lg">
                              <button v-if="s.submission" @click="viewQuizAnswers(s.submission, quizDashboardData.quiz)" class="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-colors w-full whitespace-nowrap">ตรวจคำตอบ</button>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>

            <div v-else-if="activeQuiz" class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white p-5 md:p-8 max-w-3xl mx-auto">
               <div class="flex justify-between items-start mb-6 pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <div class="flex items-center gap-2 mb-2">
                       <span v-if="activeQuiz.is_pretest" class="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Pre-test</span>
                       <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase font-bold tracking-widest">แบบทดสอบ</span>
                    </div>
                    <h2 class="text-xl md:text-2xl font-bold text-slate-800">{{ activeQuiz.title }}</h2>
                    <p class="text-xs text-slate-500 mt-2 leading-relaxed font-medium">{{ activeQuiz.description }}</p>
                  </div>
                  <button @click="activeQuiz = null" class="bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors shrink-0 shadow-sm" v-html="icons.x"></button>
               </div>

               <div v-if="canManageCourse" class="bg-amber-50 text-amber-600 p-4 rounded-xl text-xs font-bold mb-6 border border-amber-100 flex items-center justify-center gap-2 shadow-sm">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z"/></svg>
                  โหมดดูตัวอย่าง (อาจารย์ไม่สามารถส่งคำตอบได้)
               </div>

               <div class="space-y-4">
                 <div v-for="(q, idx) in activeQuiz.questions" :key="q.id" class="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p class="font-bold text-sm text-slate-800 mb-4 leading-relaxed">{{ idx + 1 }}. {{ q.question_text }}</p>
                    
                    <img v-if="q.image_url" :src="getBaseUrl() + q.image_url" class="mb-5 rounded-lg max-h-60 object-contain w-full md:w-auto border border-slate-100 shadow-sm">
                    
                    <div v-if="q.q_type === 'choice'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       <label v-if="q.choice_a" class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all duration-200" :class="studentAnswers[q.id] === 'A' ? '!border-blue-500 !bg-blue-50 ring-2 ring-blue-500/20 shadow-sm' : ''">
                          <input type="radio" :name="'q'+q.id" value="A" v-model="studentAnswers[q.id]" class="w-4 h-4 accent-blue-600">
                          <span class="text-xs font-bold text-slate-700">A. {{ q.choice_a }}</span>
                       </label>
                       <label v-if="q.choice_b" class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all duration-200" :class="studentAnswers[q.id] === 'B' ? '!border-blue-500 !bg-blue-50 ring-2 ring-blue-500/20 shadow-sm' : ''">
                          <input type="radio" :name="'q'+q.id" value="B" v-model="studentAnswers[q.id]" class="w-4 h-4 accent-blue-600">
                          <span class="text-xs font-bold text-slate-700">B. {{ q.choice_b }}</span>
                       </label>
                       <label v-if="q.choice_c" class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all duration-200" :class="studentAnswers[q.id] === 'C' ? '!border-blue-500 !bg-blue-50 ring-2 ring-blue-500/20 shadow-sm' : ''">
                          <input type="radio" :name="'q'+q.id" value="C" v-model="studentAnswers[q.id]" class="w-4 h-4 accent-blue-600">
                          <span class="text-xs font-bold text-slate-700">C. {{ q.choice_c }}</span>
                       </label>
                       <label v-if="q.choice_d" class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-blue-300 transition-all duration-200" :class="studentAnswers[q.id] === 'D' ? '!border-blue-500 !bg-blue-50 ring-2 ring-blue-500/20 shadow-sm' : ''">
                          <input type="radio" :name="'q'+q.id" value="D" v-model="studentAnswers[q.id]" class="w-4 h-4 accent-blue-600">
                          <span class="text-xs font-bold text-slate-700">D. {{ q.choice_d }}</span>
                       </label>
                    </div>
                    
                    <div v-else>
                       <textarea v-model="studentAnswers[q.id]" placeholder="พิมพ์คำตอบของคุณ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white min-h-[120px] resize-none transition-all"></textarea>
                    </div>
                 </div>
               </div>

               <div class="mt-6 bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">แนบไฟล์ประกอบคำตอบ (ถ้ามี)</label>
                    <p class="text-[10px] text-slate-500 font-medium">เช่น รูปภาพวิธีทำ หรือไฟล์ PDF</p>
                  </div>
                  <input type="file" @change="e=>quizSubmitFile=(e.target as any).files[0]" class="w-full md:w-auto text-[10px] font-bold file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-slate-700 file:shadow-sm hover:file:bg-slate-100 bg-slate-200/50 border border-slate-200 rounded-lg cursor-pointer p-1.5 transition-colors">
               </div>

               <div class="mt-8 flex justify-end pt-6 border-t border-slate-100">
                  <button v-if="userCourseRole === 'student'" @click="submitQuiz" class="w-full md:w-auto px-10 py-3.5 text-white font-bold text-sm rounded-xl shadow-md hover:-translate-y-0.5 transition-all" style="background-color: var(--theme-color)">ส่งคำตอบ</button>
                  <button v-else @click="activeQuiz = null" class="w-full md:w-auto px-10 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:-translate-y-0.5 transition-all">ปิดตัวอย่าง</button>
               </div>
            </div>

            <template v-else>
              <div v-if="canManageCourse" class="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white">
                <h3 class="font-bold text-base mb-4 text-slate-800 flex items-center gap-1.5">
                  <span class="p-1 rounded text-white shadow-sm" style="background-color: var(--theme-color)" v-html="menus[2].icon"></span> 
                  สร้างแบบทดสอบใหม่
                </h3>
                
                <div class="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5">
                  <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">เลือกประเภทควิซ</label>
                  <div class="flex flex-wrap bg-slate-200/60 p-1.5 rounded-lg w-full gap-1">
                     <button @click="quizType = 'standalone'" :class="quizType === 'standalone' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'" class="px-3 py-2 text-xs font-bold rounded-md flex-1 transition-all duration-200">ควิซแยก (ตั้งเวลา)</button>
                     <button @click="quizType = 'lesson'" :class="quizType === 'lesson' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'" class="px-3 py-2 text-xs font-bold rounded-md flex-1 transition-all duration-200">แนบท้ายบทเรียน</button>
                     <button @click="quizType = 'pretest'" :class="quizType === 'pretest' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'" class="px-3 py-2 text-xs font-bold rounded-md flex-1 transition-all duration-200">ก่อนเรียน (Pre-test)</button>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                  <div>
                    <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">หัวข้อ</label>
                    <input v-model="newQuiz.title" placeholder="พิมพ์หัวข้อ..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">
                  </div>
                  <div>
                    <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">คำอธิบาย</label>
                    <input v-model="newQuiz.desc" placeholder="พิมพ์คำอธิบาย..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">
                  </div>

                  <template v-if="quizType === 'standalone' || quizType === 'pretest'">
                    <div>
                      <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">เวลาเปิด (เว้นว่างได้)</label>
                      <input type="datetime-local" v-model="newQuiz.start" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">
                    </div>
                    <div>
                      <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">เวลาปิด (เว้นว่างได้)</label>
                      <input type="datetime-local" v-model="newQuiz.end" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">
                    </div>
                  </template>

                  <template v-if="quizType === 'lesson'">
                    <div class="md:col-span-2">
                      <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">เลือกบทเรียนที่จะแนบ</label>
                      <select v-model="newQuiz.vidId" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-slate-400">
                          <option value="">-- เลือกบทเรียน --</option>
                          <option v-for="l in lessons" :key="l.id" :value="l.id">{{ l.title }}</option>
                      </select>
                    </div>
                  </template>
                </div>
                
                <div class="border-t border-slate-200 pt-4 mt-3 bg-slate-50/50 -mx-5 px-5 pb-5 rounded-b-xl">
                   <h4 class="font-bold text-slate-800 mb-3 text-sm flex items-center justify-between">
                     คำถามทั้งหมด ({{ newQuizQuestions.length }})
                     <button @click="addQuizQuestion" class="text-[10px] font-bold px-2.5 py-1 bg-white border border-slate-200 rounded shadow-sm text-slate-600 hover:bg-slate-50 transition-colors">+ เพิ่มคำถาม</button>
                   </h4>
                   <div v-for="(q, i) in newQuizQuestions" :key="i" class="bg-white p-4 rounded-xl border border-slate-200 mb-3 relative shadow-sm">
                      <button @click="removeQuizQuestion(i)" class="absolute top-3 right-3 text-rose-500 font-bold text-[9px] bg-rose-50 px-2 py-0.5 rounded hover:bg-rose-100">ลบ</button>
                      
                      <div class="mb-3">
                         <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">โจทย์</label>
                         <input v-model="q.question_text" placeholder="พิมพ์โจทย์..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold pr-12 outline-none focus:border-slate-400">
                      </div>

                      <div class="mb-3">
                         <label class="block text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-widest">แนบรูปภาพโจทย์ (ถ้ามี)</label>
                         <input type="file" @change="e => q.file = (e.target as any).files[0]" accept="image/*" class="w-full text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 font-semibold border border-slate-200 rounded-lg p-1 cursor-pointer bg-white transition-colors">
                      </div>

                      <div class="flex gap-2 mb-3">
                         <label class="text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded border border-slate-200"><input type="radio" v-model="q.q_type" value="choice" class="w-3 h-3" :style="{ accentColor: 'var(--theme-color)' }"> ปรนัย</label>
                         <label class="text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded border border-slate-200"><input type="radio" v-model="q.q_type" value="text" class="w-3 h-3" :style="{ accentColor: 'var(--theme-color)' }"> อัตนัย</label>
                      </div>
                      <div v-if="q.q_type === 'choice'" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                         <div class="flex items-center relative"><span class="absolute left-3 font-black text-slate-400 text-[10px]">A</span><input v-model="q.choice_a" placeholder="..." class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-bold outline-none focus:border-slate-400"></div>
                         <div class="flex items-center relative"><span class="absolute left-3 font-black text-slate-400 text-[10px]">B</span><input v-model="q.choice_b" placeholder="..." class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-bold outline-none focus:border-slate-400"></div>
                         <div class="flex items-center relative"><span class="absolute left-3 font-black text-slate-400 text-[10px]">C</span><input v-model="q.choice_c" placeholder="..." class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-bold outline-none focus:border-slate-400"></div>
                         <div class="flex items-center relative"><span class="absolute left-3 font-black text-slate-400 text-[10px]">D</span><input v-model="q.choice_d" placeholder="..." class="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-bold outline-none focus:border-slate-400"></div>
                         <div class="col-span-1 sm:col-span-2 mt-1 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                           <label class="text-[9px] font-bold text-emerald-600 block mb-1 uppercase tracking-widest">เฉลย</label>
                           <select v-model="q.correct_answer" class="w-full bg-white text-emerald-700 font-bold p-1.5 text-xs rounded border border-emerald-100 outline-none cursor-pointer"><option value="">เลือก...</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
                         </div>
                      </div>
                      <div v-else class="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                         <label class="text-[9px] font-bold text-emerald-600 block mb-1 uppercase tracking-widest">Keyword เฉลย</label>
                         <input v-model="q.correct_answer" placeholder="คำตอบ..." class="w-full bg-white text-emerald-700 text-[10px] font-bold p-1.5 rounded border border-emerald-100 outline-none">
                      </div>
                   </div>
                   <button @click="createQuiz" class="text-white font-bold px-4 py-2 text-xs rounded-lg w-full shadow-sm transition-all hover:-translate-y-px" style="background-color: var(--theme-color)">บันทึกแบบทดสอบ</button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="q in quizzes" :key="q.id" class="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white flex flex-col justify-between group hover:-translate-y-px transition-all">
                  <div>
                    <div class="flex justify-between items-start gap-2 mb-1.5">
                      <h3 class="text-base font-bold text-slate-800 leading-tight">{{ q.title }}</h3>
                      <button v-if="canManageCourse" @click="deleteQuiz(q.id)" class="text-rose-400 hover:text-rose-600"><span v-html="icons.trash"></span></button>
                    </div>
                    <div class="flex gap-1 flex-wrap mb-2">
                      <span v-if="q.lesson_id" class="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold uppercase tracking-widest">แนบบทเรียน</span>
                      <span v-if="q.is_pretest" class="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-widest">ก่อนเรียน</span>
                    </div>
                    <p class="text-[10px] text-slate-500 mb-4 font-medium">{{ q.description }}</p>
                  </div>
                  <div>
                    <div v-if="!q.lesson_id && !q.is_pretest" class="text-[9px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg mb-3 border border-slate-100 flex gap-2">
                      <div class="flex items-center gap-1 flex-1 w-full"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div> <span class="text-slate-400">เปิด:</span> {{ q.start_time ? formatDate(q.start_time) : 'อิสระ' }}</div>
                      <div class="flex items-center gap-1 flex-1 w-full"><div class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div> <span class="text-slate-400">ปิด:</span> {{ q.end_time ? formatDate(q.end_time) : 'อิสระ' }}</div>
                    </div>
                    <div v-else-if="q.lesson_id" class="text-[9px] font-bold text-slate-600 bg-amber-50 p-2 rounded-lg mb-3 border border-amber-100 flex items-center gap-1.5">
                      <span v-html="icons.document" class="w-3 h-3 text-amber-500"></span> <span class="text-slate-400">แนบอยู่ใต้บทเรียน</span>
                    </div>
                    
                    <div class="pt-2 border-t border-slate-100">
                      <div v-if="userCourseRole === 'student'">
                        <div v-if="q.mySubmission" class="flex items-center gap-2">
                           <span class="flex-1 text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1 bg-emerald-50 py-1.5 rounded border border-emerald-100 cursor-not-allowed"><span v-html="icons.check_green"></span> ทำแบบทดสอบแล้ว</span>
                           <span class="text-[10px] font-bold bg-slate-100 px-3 py-1.5 rounded text-slate-600 cursor-not-allowed">{{ q.mySubmission.score }}/{{ q.mySubmission.total_questions }}</span>
                        </div>
                        <button v-else-if="isQuizOpen(q)" @click="startQuiz(q)" class="w-full text-white text-xs font-bold py-2 rounded-lg shadow-sm hover:opacity-90 transition-colors" style="background-color: var(--theme-color)">ทำแบบทดสอบ</button>
                        <div v-else class="w-full bg-rose-50 text-rose-500 text-xs font-bold py-2 rounded-lg text-center border border-rose-100 flex flex-col items-center justify-center cursor-not-allowed">
                           <span>หมดเวลาทำข้อสอบแล้ว</span>
                           <span class="text-[9px] mt-0.5">คุณได้รับคะแนน: 0 / {{ q.questions?.length || 0 }}</span>
                        </div>
                      </div>
                      <div v-else>
                         <button @click="openQuizDashboard(q.id)" class="w-full bg-slate-100 text-slate-600 text-[10px] font-bold py-2 rounded-lg hover:bg-slate-200">ดูคะแนนผู้เข้าสอบ</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!quizzes.length" class="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 bg-white/60 backdrop-blur-sm rounded-2xl border border-white shadow-sm text-slate-400 text-xs font-bold">อาจารย์ยังไม่ได้สร้างแบบทดสอบ</div>
              </div>
            </template>
          </div>

          <div v-else-if="activeMenu === 'dashboard'" key="dashboard" class="max-w-4xl mx-auto space-y-5 pb-6">
            <div class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white overflow-hidden p-6">
              <h2 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <span class="text-white p-2 rounded-lg" style="background-color: var(--theme-color)"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg></span> ผลการเรียนของฉัน
              </h2>
              
              <h3 class="font-bold text-sm text-slate-700 mb-3 bg-slate-50 py-2 px-3 rounded-lg border border-slate-100">งานที่ได้รับมอบหมาย (Assignments)</h3>
              <div class="overflow-x-auto mb-6">
                 <table class="w-full text-left border-collapse min-w-[400px]">
                    <thead class="bg-slate-50 border-b border-slate-200"><tr><th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase">ชื่องาน</th><th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase text-center w-24">สถานะส่ง</th><th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase text-center w-24">คะแนน</th></tr></thead>
                    <tbody class="divide-y divide-slate-100">
                       <tr v-for="a in studentDashboard.assignments" :key="a.title" class="hover:bg-slate-50/50">
                          <td class="py-3 px-4 text-xs font-bold text-slate-700">{{ a.title }}
                              <div v-if="a.comment" class="text-[9px] text-slate-500 mt-1 font-medium px-2 py-1 bg-slate-100 rounded">อาจารย์: {{ a.comment }}</div>
                          </td>
                          <td class="py-3 px-4 text-center">
                             <span :class="['px-2 py-1 rounded text-[9px] font-bold whitespace-nowrap', a.is_late ? 'bg-amber-50 text-amber-600' : (a.submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')]">
                                {{ a.is_late ? 'ส่งช้า' : (a.submitted ? 'ส่งตรงเวลา' : 'ยังไม่ส่ง') }}
                             </span>
                          </td>
                          <td class="py-3 px-4 text-center text-xs font-bold" :class="a.score !== null ? 'text-emerald-600' : 'text-slate-400'">{{ a.score !== null ? a.score : '-' }}</td>
                       </tr>
                       <tr v-if="!studentDashboard.assignments?.length"><td colspan="3" class="text-center py-6 text-slate-400 text-xs">ไม่มีข้อมูล</td></tr>
                    </tbody>
                 </table>
              </div>

              <h3 class="font-bold text-sm text-slate-700 mb-3 bg-slate-50 py-2 px-3 rounded-lg border border-slate-100">แบบทดสอบ (Quizzes)</h3>
              <div class="overflow-x-auto">
                 <table class="w-full text-left border-collapse min-w-[400px]">
                    <thead class="bg-slate-50 border-b border-slate-200"><tr><th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase">ชื่อแบบทดสอบ</th><th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase text-center w-24">สถานะ</th><th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase text-center w-24">คะแนน</th></tr></thead>
                    <tbody class="divide-y divide-slate-100">
                       <tr v-for="q in studentDashboard.quizzes" :key="q.title" class="hover:bg-slate-50/50">
                          <td class="py-3 px-4 text-xs font-bold text-slate-700 flex items-center gap-2">{{ q.title }} <span v-if="q.is_pretest" class="text-[8px] bg-purple-100 text-purple-600 px-1.5 rounded uppercase">ก่อนเรียน</span></td>
                          <td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded text-[9px] font-bold" :class="q.score !== null ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'">{{ q.score !== null ? 'ทำแล้ว' : 'ยังไม่ทำ' }}</span></td>
                          <td class="py-3 px-4 text-center text-xs font-bold" :class="q.score !== null ? 'text-emerald-600' : 'text-slate-400'">{{ q.score !== null ? q.score + ' / ' + q.total : '-' }}</td>
                       </tr>
                       <tr v-if="!studentDashboard.quizzes?.length"><td colspan="3" class="text-center py-6 text-slate-400 text-xs">ไม่มีข้อมูล</td></tr>
                    </tbody>
                 </table>
              </div>
            </div>
          </div>

          <div v-else-if="activeMenu === 'attendance'" key="attendance" class="max-w-4xl mx-auto space-y-5 pb-6">
            <div v-if="canManageCourse" class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white overflow-hidden">
              <div class="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white">
                <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span class="text-white p-2 rounded-lg" style="background-color: var(--theme-color)" v-html="menus[3].icon"></span> ระบบเช็คชื่อ
                </h2>
                <button v-if="!activeAttendance" @click="startAttendance" class="text-white px-4 py-2 text-xs rounded-lg font-bold shadow-sm w-full md:w-auto" style="background-color: var(--theme-color)">สร้างเซสชัน</button>
                <button v-else @click="stopAttendance" class="bg-rose-500 text-white px-4 py-2 text-xs rounded-lg font-bold shadow-sm w-full md:w-auto">ปิดเซสชัน</button>
              </div>
              
              <div v-if="activeAttendance" class="p-6 md:p-8 text-center border-b border-slate-100 bg-slate-50/50 relative">
                <div class="inline-block p-3 bg-white rounded-xl shadow-md border border-slate-100 mb-4">
                  <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${activeAttendance.code}`" class="w-40 h-40 object-contain">
                </div>
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">รหัสเช็คชื่อ</h3>
                <div class="text-4xl md:text-5xl font-black tracking-[0.2em] drop-shadow-sm" style="color: var(--theme-color)">{{ activeAttendance.code }}</div>
              </div>

              <div class="p-5 overflow-x-auto bg-white">
                <h3 class="text-base font-bold text-slate-800 mb-3">ตารางเข้าเรียน (ล่าสุด)</h3>
                <table class="w-full text-left border-collapse min-w-[500px]">
                  <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">นักเรียน</th>
                      <th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-32">สถานะ</th>
                      <th class="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="rec in teacherRecords?.records" :key="rec.user_id" class="hover:bg-slate-50/50 transition-colors">
                      <td class="py-3 px-4 font-bold text-slate-700 text-xs">
                        <span class="text-slate-400 text-[10px] mr-1.5">{{ rec.student_id || '-' }}</span> {{ rec.full_name }}
                      </td>
                      <td class="py-3 px-4 text-center">
                        <select v-model="rec.status" @change="updateStudentStatus(rec.user_id, rec.status, rec.remark)" :class="['text-[10px] font-bold px-2 py-1 rounded outline-none border cursor-pointer', getStatusColor(rec.status, null)]">
                          <option>ตรงเวลา</option><option>สาย</option><option>ลา</option><option>ขาด</option>
                        </select>
                      </td>
                      <td class="py-3 px-4">
                        <input v-model="rec.remark" @blur="updateStudentStatus(rec.user_id, rec.status, rec.remark)" placeholder="หมายเหตุ..." class="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors">
                      </td>
                    </tr>
                    <tr v-if="!teacherRecords?.records?.length"><td colspan="3" class="text-center py-6 text-slate-400 text-xs font-bold">ไม่มีข้อมูล</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div v-if="userCourseRole === 'student'" class="space-y-5">
               <div class="bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white flex flex-col md:flex-row gap-3 items-center">
                  <input v-model="studentCodeInput" maxlength="5" placeholder="กรอกรหัส..." class="flex-1 w-full text-center text-xl md:text-2xl tracking-[0.2em] font-bold bg-slate-50 border border-slate-200 rounded-lg py-3 outline-none placeholder:text-sm placeholder:tracking-normal placeholder:font-bold">
                  <button @click="submitAttendanceCode" class="w-full md:w-auto text-white font-bold px-6 py-3 rounded-lg shadow-sm text-sm" style="background-color: var(--theme-color)">ยืนยัน</button>
                  <button @click="isCameraOpen = true" class="w-full md:w-auto bg-slate-800 text-white font-bold px-5 py-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> สแกน
                  </button>
               </div>
               <div class="bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm border border-white">
                 <div class="p-5 border-b border-slate-100 bg-white"><h3 class="text-base font-bold text-slate-800">ประวัติการเข้าเรียน</h3></div>
                 <div class="p-5 overflow-x-auto bg-slate-50/50">
                   <table class="w-full text-left border-collapse min-w-[500px]">
                     <thead class="bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500 w-32">วัน</th>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500 w-20">เวลา</th>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500 text-center w-20">ตรงเวลา</th>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500 text-center w-20">สาย</th>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500 text-center w-20">ลา</th>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500 text-center w-20">ขาด</th>
                         <th class="py-2 px-4 text-[10px] font-bold text-slate-500">หมายเหตุ</th>
                       </tr>
                     </thead>
                     <tbody class="divide-y divide-slate-100">
                       <tr v-for="(a, i) in studentHistory" :key="i" class="hover:bg-slate-50/50 transition-colors">
                         <td class="py-3 px-4 text-xs font-bold text-slate-700">{{ formatDateOnly(a.session_date) }}</td>
                         <td class="py-3 px-4 text-xs font-bold text-slate-500">{{ a.check_in_time ? formatTimeOnly(a.check_in_time) : '-' }}</td>
                         <td class="py-3 px-4 text-center border-l border-slate-100/50"><span v-if="a.status==='ตรงเวลา'" v-html="icons.check_green"></span></td>
                         <td class="py-3 px-4 text-center border-l border-slate-100/50"><span v-if="a.status==='สาย'" v-html="icons.check_orange"></span></td>
                         <td class="py-3 px-4 text-center border-l border-slate-100/50"><span v-if="a.status==='ลา'" v-html="icons.cross_blue"></span></td>
                         <td class="py-3 px-4 text-center border-l border-slate-100/50"><span v-if="a.status==='ขาด'" v-html="icons.cross_red"></span></td>
                         <td class="py-3 px-4 text-xs text-slate-500">{{ a.remark || '-' }}</td>
                       </tr>
                       <tr v-if="!studentHistory.length"><td colspan="7" class="text-center py-6 text-slate-400 text-xs font-bold">ยังไม่มีประวัติ</td></tr>
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          </div>

          <div v-else-if="activeMenu === 'syllabus'" key="syllabus" class="max-w-3xl mx-auto space-y-5 pb-6">
            <div class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white overflow-hidden">
              <div class="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <span class="text-white p-1.5 rounded-lg" style="background-color: var(--theme-color)" v-html="menus[4].icon"></span> รายละเอียดวิชา
                </h2>
                <button v-if="canManageCourse" @click="toggleSyllabusEdit" class="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-200">
                   {{ syllabusEditMode ? 'ยกเลิก' : 'แก้ไข' }}
                </button>
              </div>
              <div class="p-5 md:p-6">
                <div v-if="syllabusEditMode" class="space-y-3">
                  <div class="flex gap-1.5 p-1 bg-slate-50 rounded-lg overflow-x-auto border border-slate-100 inline-flex">
                     <button @click="formatText('bold')" class="px-3 py-1.5 bg-white rounded font-bold border border-slate-100 text-[11px]">B</button>
                     <button @click="formatText('italic')" class="px-3 py-1.5 bg-white rounded italic border border-slate-100 text-[11px]">I</button>
                     <button @click="formatText('underline')" class="px-3 py-1.5 bg-white rounded underline border border-slate-100 text-[11px]">U</button>
                     <div class="w-px bg-slate-200 mx-1 my-1"></div>
                     <button @click="formatText('insertOrderedList')" class="px-3 py-1.5 bg-white rounded font-bold border border-slate-100 text-[10px]">1. List</button>
                     <button @click="formatText('insertUnorderedList')" class="px-3 py-1.5 bg-white rounded font-bold border border-slate-100 text-[10px]">• List</button>
                     <div class="w-px bg-slate-200 mx-1 my-1"></div>
                     <button @click="formatText('formatBlock', 'H3')" class="px-3 py-1.5 bg-white rounded font-bold border border-slate-100 text-[10px]">H3 หัวข้อ</button>
                  </div>
                  <div ref="syllabusEditor" contenteditable="true" class="min-h-[300px] border border-slate-200 bg-white rounded-xl p-4 outline-none focus:border-slate-400 prose max-w-none text-slate-700 text-xs leading-relaxed"></div>
                  <div class="text-right pt-1">
                    <button @click="saveSyllabus" class="text-white font-bold px-5 py-2 rounded-lg shadow-sm text-xs" style="background-color: var(--theme-color)">บันทึก</button>
                  </div>
                </div>
                <div v-else>
                  <div v-if="course?.syllabus" class="prose max-w-none text-slate-700 text-sm leading-relaxed" v-html="course.syllabus"></div>
                  <div v-else class="text-center py-16 text-slate-400 font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs">อาจารย์ยังไม่ได้เพิ่มเนื้อหา</div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="activeMenu === 'members'" key="members" class="max-w-4xl mx-auto space-y-5 pb-6">
            <div v-if="canManageCourse" class="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white">
              <h3 class="text-base font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> เพิ่มสมาชิก (Manual)
              </h3>
              <div class="flex flex-col md:flex-row gap-3">
                <input v-model="manualAddEmail" type="email" placeholder="ใส่อีเมล..." class="flex-1 bg-white px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none font-bold focus:border-slate-400">
                <select v-model="manualAddRole" class="md:w-1/4 bg-white px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none font-bold text-slate-700 cursor-pointer">
                   <option value="student">นักเรียน</option><option value="ta">ผู้ช่วยสอน (TA)</option><option value="teacher">อาจารย์ร่วม</option>
                </select>
                <button @click="addMemberManual" class="text-white font-bold px-6 py-2 text-xs rounded-lg shadow-sm" style="background-color: var(--theme-color)">เพิ่ม</button>
              </div>
            </div>
            
            <div class="bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm border border-white">
              <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-white"><h3 class="text-lg font-bold text-slate-800">สมาชิกทั้งหมด ({{ members.length }})</h3></div>
              <div class="p-5 overflow-x-auto bg-slate-50/50">
                 <table class="w-full text-left border-collapse">
                   <thead class="border-b border-slate-200">
                     <tr>
                       <th class="py-2 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">ข้อมูลสมาชิก</th>
                       <th class="py-2 px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">บทบาท</th>
                     </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-100">
                     <tr v-for="m in members" :key="m.id" @click="canManageCourse ? openStudentDetail(m.user_id) : null" :class="['bg-white transition-colors', canManageCourse ? 'cursor-pointer hover:bg-slate-50' : '']">
                       <td class="py-3 px-3">
                         <div class="flex items-center gap-3">
                           <div class="w-8 h-8 rounded-full flex justify-center items-center font-bold text-xs text-white overflow-hidden border border-slate-100" style="background-color: var(--theme-color)">
                             <img v-if="m.profile_img" :src="getBaseUrl() + m.profile_img" class="w-full h-full object-cover"><span v-else>{{ m.user_name?.charAt(0) || 'U' }}</span>
                           </div>
                           <div><div class="font-bold text-slate-800 text-xs">{{ m.user_name }}</div><div class="text-[9px] font-semibold text-slate-400">{{ m.user_email }}</div></div>
                         </div>
                       </td>
                       <td class="py-3 px-3 text-right align-middle">
                         <div class="flex items-center justify-end gap-2">
                           <span :class="['text-[8px] px-2 py-1 rounded font-bold uppercase tracking-wider border', getRoleBadgeColor(m.role)]">{{ m.role }}</span>
                           <button v-if="canManageCourse && m.user_id !== authStore.user?.id" @click.stop="removeMember(m.user_id)" class="text-rose-500 font-bold text-[9px] bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 border border-rose-100">เตะออก</button>
                         </div>
                       </td>
                     </tr>
                   </tbody>
                 </table>
              </div>
            </div>
          </div>

          <div v-else-if="activeMenu === 'chat'" key="chat" class="max-w-3xl mx-auto h-[calc(100vh-100px)] pb-4">
            <div class="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-white flex flex-col h-full overflow-hidden">
              <div class="bg-white p-3 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <div class="flex items-center gap-2">
                    <div class="text-slate-800 bg-slate-100 p-2 rounded-lg" v-html="menus[6].icon"></div>
                    <div>
                      <h3 class="font-bold text-base text-slate-800 leading-none">ห้องแชท</h3>
                      <p class="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse"></span> ออนไลน์</p>
                    </div>
                 </div>
              </div>
              <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
                <div v-for="c in chats" :key="c.id" :class="['flex w-full', c.user_name === authStore.user?.full_name ? 'justify-end' : 'justify-start']">
                  <div class="flex max-w-[85%] gap-2" :class="c.user_name === authStore.user?.full_name ? 'flex-row-reverse' : 'flex-row'">
                    <div v-if="c.user_name !== authStore.user?.full_name" class="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-3 border border-slate-200 bg-white flex items-center justify-center text-[9px] font-bold text-slate-500 shadow-sm">
                      <img v-if="c.profile_img_url" :src="getBaseUrl() + c.profile_img_url" class="w-full h-full object-cover">
                      <span v-else>{{ c.user_name.charAt(0) }}</span>
                    </div>
                    
                    <div class="flex flex-col" :class="c.user_name === authStore.user?.full_name ? 'items-end' : 'items-start'">
                      <span class="text-[8px] text-slate-400 font-bold flex items-center gap-1 mb-1 px-1"><span v-if="['teacher', 'admin'].includes(c.user_role)" class="text-amber-500" v-html="icons.crown"></span>{{ c.user_name === authStore.user?.full_name ? 'คุณ' : c.user_name }}</span>
                      <div :class="['px-4 py-2.5 text-xs font-semibold shadow-sm leading-relaxed', c.user_name === authStore.user?.full_name ? 'text-white rounded-[1.2rem] rounded-tr-sm border' : 'bg-white text-slate-700 rounded-[1.2rem] rounded-tl-sm border border-slate-200']" :style="c.user_name === authStore.user?.full_name ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}">
                        <p v-if="c.message" class="break-words">{{ c.message }}</p>
                        <img v-if="c.image_url" :src="getBaseUrl() + c.image_url" class="mt-2 rounded-xl max-h-40 object-cover border border-black/5 w-full shadow-sm">
                      </div>
                      <span class="text-[8px] text-slate-400 mt-1 font-bold px-1.5">{{ formatDate(c.created_at) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="!chats.length" class="h-full flex flex-col items-center justify-center text-slate-400 font-bold">
                   <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100 text-slate-400" v-html="menus[6].icon"></div>
                   <p class="text-sm">ยังไม่มีข้อความ</p>
                </div>
              </div>
              <div class="p-3 bg-white border-t border-slate-100 shrink-0">
                <div class="flex gap-2 items-center">
                  <label class="cursor-pointer h-10 w-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 transition-colors shadow-sm">
                    <span v-html="icons.document" class="w-4 h-4 text-slate-500"></span><input type="file" @change="e=>chatImage=(e.target as any).files[0]" accept="image/*" class="hidden">
                  </label>
                  <div v-if="chatImage" class="h-10 md:w-32 flex items-center bg-slate-50 px-2.5 rounded-xl border border-slate-200 overflow-hidden shadow-sm"><span class="text-[9px] font-bold text-slate-600 truncate flex-1">{{ chatImage.name }}</span><button @click="chatImage=null" class="ml-1 text-slate-400 hover:text-rose-500 font-black text-[9px] w-5 h-5 flex items-center justify-center transition-colors">✕</button></div>
                  <div class="flex-1 relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-slate-400 transition-all h-10 pl-3 pr-1.5 shadow-sm">
                     <input v-model="chatInput" @keyup.enter="sendChat" placeholder="พิมพ์ข้อความ..." class="w-full bg-transparent outline-none text-xs font-bold text-slate-700 h-full">
                     <button @click="sendChat" :disabled="(!chatInput.trim() && !chatImage)" class="h-7 w-7 rounded-lg text-white hover:text-white font-black flex justify-center items-center transition-all disabled:opacity-30 shrink-0 bg-slate-500 hover:bg-slate-800" :style="(!chatInput.trim() && !chatImage) ? {} : { backgroundColor: 'var(--theme-color)' }">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 translate-x-[1px]" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </main>
    </div>

    <Transition name="modal">
      <div v-if="isAlertModalOpen" class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl text-center">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner" :class="alertType === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'" v-html="alertType === 'success' ? icons.check : icons.x"></div>
          <h3 class="text-base font-bold text-slate-800 mb-1.5">{{ alertType === 'success' ? 'สำเร็จ' : 'แจ้งเตือน' }}</h3>
          <p class="text-xs text-slate-500 mb-4 font-medium">{{ alertMessage }}</p>
          <button @click="closeAlert" class="w-full text-white font-bold py-2 rounded-lg shadow-sm text-xs" :class="alertType === 'success' ? 'bg-emerald-500' : 'bg-rose-500'">ตกลง</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isConfirmModalOpen" class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl text-center">
          <div class="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner" v-html="icons.question"></div>
          <h3 class="text-base font-bold text-slate-800 mb-1.5">ยืนยันการดำเนินการ</h3>
          <p class="text-xs text-slate-500 mb-4 font-medium">{{ confirmMessage }}</p>
          <div class="flex gap-2">
            <button @click="isConfirmModalOpen = false" class="flex-1 bg-slate-50 text-slate-500 font-bold py-2 rounded-lg border border-slate-200 text-xs">ยกเลิก</button>
            <button @click="executeConfirm" class="flex-1 bg-rose-500 text-white font-bold py-2 rounded-lg shadow-sm text-xs">ยืนยัน</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isPromptModalOpen" class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center relative">
          <button @click="isPromptModalOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full hover:text-slate-600" v-html="icons.x"></button>
          <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner" v-html="icons.alert"></div>
          <h3 class="text-base font-bold text-slate-800 mb-1.5">ยืนยันลบข้อมูล</h3>
          <p class="text-xs text-slate-500 mb-4">{{ promptMessage }}</p>
          <input v-model="promptInputValue" @keyup.enter="executePrompt" type="text" placeholder="พิมพ์ยืนยัน..." class="w-full text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-rose-300 mb-4">
          <button @click="executePrompt" class="w-full bg-rose-500 text-white font-bold py-2 rounded-lg shadow-sm text-xs">ยืนยันลบถาวร</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isEditLessonModalOpen" class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative">
          <button @click="isEditLessonModalOpen = false" class="absolute top-4 right-4 text-slate-400 bg-slate-50 p-1.5 rounded-full hover:text-slate-600" v-html="icons.x"></button>
          <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span v-html="icons.edit"></span> แก้ไขบทเรียน</h3>
          <div class="space-y-4">
             <div><label class="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">ชื่อบทเรียน</label><input v-model="editingLesson.title" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-slate-400"></div>
             <div><label class="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-widest">รายละเอียด (แบบย่อ)</label><textarea v-model="editingLesson.content" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-slate-400 h-20 resize-none"></textarea></div>
          </div>
          <button @click="saveEditLesson" class="w-full mt-4 text-white font-bold py-2.5 rounded-lg shadow-sm text-xs" style="background-color: var(--theme-color)">บันทึกข้อมูล</button>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isFeedbackModalOpen" class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-xl relative overflow-hidden">
          <div class="bg-blue-50 p-4 flex items-center justify-between border-b border-blue-100">
             <h3 class="text-sm font-bold text-blue-800 flex items-center gap-2">
               <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               ข้อความตอบกลับจากผู้สอน
             </h3>
             <button @click="isFeedbackModalOpen = false" class="text-blue-400 bg-white hover:text-rose-500 hover:bg-rose-50 rounded-full p-1 transition-colors" v-html="icons.x"></button>
          </div>
          <div class="p-6">
             <p class="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
               {{ currentFeedbackText }}
             </p>
             <button @click="isFeedbackModalOpen = false" class="w-full mt-5 text-white font-bold py-2.5 rounded-lg shadow-sm text-xs bg-blue-600 hover:bg-blue-700 transition-colors">รับทราบ</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isCameraOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-xs p-5 shadow-xl relative text-center">
          <button @click="isCameraOpen = false" class="absolute top-3 right-3 text-slate-500 bg-white shadow-sm p-1 rounded-full z-20 font-bold" v-html="icons.x"></button>
          <h3 class="text-base font-bold text-slate-800 mb-4">สแกน QR Code</h3>
          <div class="rounded-xl overflow-hidden shadow-inner border-[3px] bg-black aspect-square relative mb-4" :style="{ borderColor: 'var(--theme-color)' }">
            <qrcode-stream @detect="onDetectQr" class="w-full h-full object-cover"></qrcode-stream>
            <div class="absolute inset-0 pointer-events-none border-[20px] border-black/30"></div>
          </div>
          <p class="text-[10px] text-slate-500 font-medium bg-slate-50 py-1.5 rounded-md border border-slate-100">นำกล้องส่อง QR Code</p>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="isStudentDetailModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-3xl p-0 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide flex flex-col">
          
          <div class="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 p-5 pb-0 z-50">
             <button @click="isStudentDetailModalOpen = false; activeStudentDetail = null" class="absolute top-4 right-4 z-50 text-slate-400 bg-slate-100 p-2 rounded-full hover:bg-rose-100 hover:text-rose-500 transition-colors shadow-sm">
                 <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>

             <div class="flex items-start mb-3 pr-12">
                <div class="flex items-center gap-3">
                   <div class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg shadow-sm border border-slate-100" style="background-color: var(--theme-color)">
                      <img v-if="activeStudentDetail?.profile?.profile_img" :src="getBaseUrl() + activeStudentDetail?.profile?.profile_img" class="w-full h-full object-cover">
                      <span v-else>{{ activeStudentDetail?.profile?.full_name?.charAt(0) || 'U' }}</span>
                   </div>
                   <div>
                      <h3 class="text-lg font-bold text-slate-800 leading-tight">{{ activeStudentDetail?.profile?.full_name }}</h3>
                      <p class="text-[10px] text-slate-500 font-medium mt-0.5">{{ activeStudentDetail?.profile?.email }} <span class="mx-1">|</span> ID: <span class="font-bold">{{ activeStudentDetail?.profile?.student_id || '-' }}</span></p>
                   </div>
                </div>
             </div>
             
             <div class="flex flex-col sm:flex-row justify-between items-end border-b pb-3 mt-2 gap-3 relative z-40">
                <div v-if="!['teacher', 'ta', 'admin'].includes(String(activeStudentDetail?.profile?.role).toLowerCase())" class="flex gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide">
                   <button @click="studentDetailTab = 'attendance'" :class="['px-3 py-1.5 font-bold text-xs rounded-lg transition-colors whitespace-nowrap', studentDetailTab === 'attendance' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50']" :style="studentDetailTab === 'attendance' ? { color: 'var(--theme-color)' } : {}">ประวัติเข้าเรียน</button>
                   <button @click="studentDetailTab = 'assignments'" :class="['px-3 py-1.5 font-bold text-xs rounded-lg transition-colors whitespace-nowrap', studentDetailTab === 'assignments' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50']" :style="studentDetailTab === 'assignments' ? { color: 'var(--theme-color)' } : {}">คะแนนการบ้าน</button>
                   <button @click="studentDetailTab = 'quizzes'" :class="['px-3 py-1.5 font-bold text-xs rounded-lg transition-colors whitespace-nowrap', studentDetailTab === 'quizzes' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50']" :style="studentDetailTab === 'quizzes' ? { color: 'var(--theme-color)' } : {}">คะแนนทดสอบ</button>
                </div>
                <div v-else class="text-xs font-bold text-slate-400 py-1.5 hidden sm:block">ข้อมูลบุคลากร</div>

                <div class="w-full sm:w-40 shrink-0 relative ml-auto">
                   <label class="text-[8px] font-bold text-slate-400 uppercase block mb-1">ปรับสิทธิ์ผู้ใช้ในคลาส</label>
                   <select v-if="activeStudentDetail?.profile" v-model="activeStudentDetail.profile.role" @change="updateStudentRoleInCourse(activeStudentDetail.user_id, activeStudentDetail.profile.role)" class="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold outline-none cursor-pointer focus:border-slate-400 transition-colors relative z-50">
                      <option value="student">นักเรียน</option><option value="ta">ผู้ช่วยสอน (TA)</option><option value="teacher">อาจารย์ร่วม</option>
                   </select>
                </div>
             </div>
          </div>

          <div class="p-5">
             <div v-if="['teacher', 'ta', 'admin'].includes(String(activeStudentDetail?.profile?.role).toLowerCase())" class="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                <h3 class="text-sm font-bold text-slate-600 mb-1">ผู้ใช้งานระบบประเภทบุคลากร</h3>
                <p class="text-[10px] font-medium">ไม่แสดงประวัติเข้าเรียนหรือคะแนนสำหรับสิทธิ์บุคลากรนี้</p>
             </div>

             <template v-else>
               <div v-if="studentDetailTab === 'attendance'" class="overflow-x-auto border border-slate-100 rounded-xl">
                  <table class="w-full text-left border-collapse">
                     <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500">วัน</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 w-16">เวลา</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 text-center w-16">ตรงเวลา</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 text-center w-16">สาย</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 text-center w-16">ลา</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 text-center w-16">ขาด</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500">หมายเหตุ</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="(a, i) in activeStudentDetail?.attendance || []" :key="i" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                           <td class="p-2.5 text-[11px] font-bold text-slate-700">{{ formatDateOnly(a.date) }}</td>
                           <td class="p-2.5 text-[11px] font-bold text-slate-500">{{ a.check_in_time ? formatTimeOnly(a.check_in_time) : '-' }}</td>
                           <td class="p-2.5 text-center border-l border-slate-100/50"><span v-if="a.status==='ตรงเวลา'" v-html="icons.check_green"></span></td>
                           <td class="p-2.5 text-center border-l border-slate-100/50"><span v-if="a.status==='สาย'" v-html="icons.check_orange"></span></td>
                           <td class="p-2.5 text-center border-l border-slate-100/50"><span v-if="a.status==='ลา'" v-html="icons.cross_blue"></span></td>
                           <td class="p-2.5 text-center border-l border-slate-100/50"><span v-if="a.status==='ขาด'" v-html="icons.cross_red"></span></td>
                           <td class="p-2.5 text-[10px] text-slate-500">{{ a.remark || '-' }}</td>
                        </tr>
                        <tr v-if="!(activeStudentDetail?.attendance?.length)"><td colspan="7" class="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50">ไม่มีประวัติเข้าเรียน</td></tr>
                     </tbody>
                  </table>
               </div>

               <div v-if="studentDetailTab === 'assignments'" class="overflow-x-auto border border-slate-100 rounded-xl">
                  <table class="w-full text-left border-collapse">
                     <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500">กิจกรรมเพื่อการประเมิน (การบ้าน)</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 w-32 text-center">คะแนนที่ได้</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="(a, i) in activeStudentDetail?.assignments || []" :key="i" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                           <td class="p-3 text-xs font-bold text-slate-700">{{ a.title }}</td>
                           <td class="p-3 text-xs font-bold text-center border-l border-slate-100/50">
                              <span v-if="a.score !== null" class="text-emerald-600">{{ a.score }}</span>
                              <span v-else-if="a.submitted" class="text-slate-400 text-[10px]">รอประเมิน</span>
                              <span v-else class="text-rose-500 text-[10px]">ขาดส่ง</span>
                           </td>
                        </tr>
                        <tr v-if="!(activeStudentDetail?.assignments?.length)"><td colspan="2" class="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50">ไม่มีการบ้าน</td></tr>
                     </tbody>
                  </table>
               </div>

               <div v-if="studentDetailTab === 'quizzes'" class="overflow-x-auto border border-slate-100 rounded-xl">
                  <table class="w-full text-left border-collapse">
                     <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500">กิจกรรมเพื่อการประเมิน (แบบทดสอบ)</th>
                           <th class="p-2.5 text-[10px] font-bold text-slate-500 w-32 text-center">คะแนนที่ได้</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="(q, i) in activeStudentDetail?.quizzes || []" :key="i" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                           <td class="p-3 text-xs font-bold text-slate-700 flex items-center gap-2">
                              {{ q.title }}
                              <span v-if="q.is_pretest" class="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase tracking-widest">Pre-test</span>
                           </td>
                           <td class="p-3 text-xs font-bold text-center border-l border-slate-100/50">
                              <span v-if="q.score !== null" class="text-emerald-600">{{ q.score }} <span class="text-slate-300 text-[9px]">/ {{ q.total }}</span></span>
                              <span v-else class="text-slate-400 text-[10px]">ยังไม่ทำ</span>
                           </td>
                        </tr>
                        <tr v-if="!(activeStudentDetail?.quizzes?.length)"><td colspan="2" class="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50">ไม่มีแบบทดสอบ</td></tr>
                     </tbody>
                  </table>
               </div>
             </template>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="modal">
      <div v-if="activeQuizSubmission" class="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
           <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div>
                 <h3 class="font-bold text-slate-800 flex items-center gap-2">
                   <span v-html="menus[2].icon" class="text-blue-500"></span> ตรวจคำตอบ: {{ activeQuizDashboardObj?.title }}
                 </h3>
                 <p class="text-[10px] text-slate-500 mt-1 font-medium">คะแนนดิบจากระบบ: <span class="text-emerald-600 font-bold">{{ activeQuizSubmission?.score || 0 }} / {{ activeQuizDashboardObj?.questions?.length || 0 }}</span></p>
              </div>
              <button @click="activeQuizSubmission = null; activeQuizDashboardObj = null" class="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full border border-slate-200 shadow-sm" v-html="icons.x"></button>
           </div>
           
           <div class="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50 scrollbar-hide">
               
               <div v-if="activeQuizSubmission?.file_url" class="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2 text-blue-700">
                     <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                     <span class="text-[10px] font-bold">ไฟล์แนบจากนักเรียน</span>
                  </div>
                  <a :href="getBaseUrl() + activeQuizSubmission.file_url" target="_blank" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold hover:bg-blue-700 transition-colors shadow-sm">โหลดไฟล์</a>
               </div>

               <div v-for="(q, idx) in activeQuizDashboardObj?.questions" :key="q.id" class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <p class="text-xs font-bold text-slate-700 mb-3 leading-relaxed">{{ idx + 1 }}. {{ q.question_text }}</p>
                  <img v-if="q.image_url" :src="getBaseUrl() + q.image_url" class="mb-4 rounded-lg max-h-40 border border-slate-100 shadow-sm object-contain w-full md:w-auto">

                  <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] mb-2 relative">
                     <span class="font-bold text-slate-400 block mb-1.5 uppercase tracking-widest text-[9px]">คำตอบของนักเรียน</span>
                     <span class="text-blue-600 font-bold text-sm whitespace-pre-wrap">{{ activeQuizSubmission ? (parseQuizAnswers(activeQuizSubmission.student_answers_json)[q.id] || '-') : '-' }}</span>
                  </div>
                  
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                     <div class="inline-flex bg-emerald-50 px-3 py-1.5 rounded border border-emerald-100 text-[10px] font-semibold text-emerald-700 items-center gap-1.5 w-full sm:w-auto">
                        <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span class="truncate">เฉลย: {{ q.correct_answer }}</span>
                     </div>
                     
                     <div v-if="q.q_type === 'text'" class="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <button @click="markEssay(1)" class="flex-1 sm:flex-none bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1">
                           <span v-html="icons.check" class="w-3 h-3"></span> ให้ +1
                        </button>
                        <button @click="markEssay(-1)" class="flex-1 sm:flex-none bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded text-[10px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1">
                           <span v-html="icons.x" class="w-3 h-3"></span> หัก -1
                        </button>
                     </div>
                  </div>
               </div>
               <div v-if="!activeQuizDashboardObj?.questions?.length" class="text-center py-10 text-slate-400 text-xs font-bold">ไม่มีข้อมูลคำถาม</div>
           </div>
           
           <div class="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-3">
               <span class="text-[10px] font-bold text-rose-500">* ปรับคะแนน (Manual) โดยเฉพาะข้อเขียนที่ต้องตรวจเอง</span>
               <div class="flex items-center gap-3">
                 <span class="text-xs font-bold text-slate-600 shrink-0">คะแนนสุทธิ:</span>
                 <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-400 transition-colors">
                    <input type="number" v-if="activeQuizSubmission" v-model="activeQuizSubmission.score" class="w-16 p-2 text-center text-sm font-bold outline-none bg-transparent text-blue-600">
                    <span class="text-xs font-bold text-slate-400 pr-3">/ {{ activeQuizDashboardObj?.questions?.length || 0 }}</span>
                 </div>
                 <button v-if="activeQuizSubmission" @click="saveQuizGrade(activeQuizSubmission.id, activeQuizSubmission.score)" class="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white px-5 py-2 rounded-lg font-bold text-xs shadow-sm ml-2 shrink-0">บันทึก</button>
               </div>
           </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
.font-prompt { font-family: 'Prompt', sans-serif; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
.modal-enter-active, .modal-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }
.prose h3 { font-size: 1.1rem; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; color: #1e293b; }
.prose ul { list-style-type: disc; padding-left: 1.2em; margin-bottom: 1em; }
.prose ol { list-style-type: decimal; padding-left: 1.2em; margin-bottom: 1em; }
</style>