import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import CourseDetailView from '../views/CourseDetailView.vue' // ⚠️ 1. Import ไฟล์เข้ามา

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    // ⚠️ 2. เพิ่ม Route สำหรับหน้ารายละเอียดวิชา
    {
      path: '/course/:id',
      name: 'course-detail',
      component: CourseDetailView
    }
  ]
})

// ป้องกันคนยังไม่ล็อกอินแอบเข้าหน้าหลัก
router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user');
  if (to.name !== 'login' && !user) next({ name: 'login' })
  else if (to.name === 'login' && user) next({ name: 'home' })
  else next()
})

export default router