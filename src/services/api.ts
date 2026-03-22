import axios from 'axios';

// สร้าง Axios Instance
const api = axios.create({
  // ใส่ URL ของ Backend ที่ได้มาตรงนี้
  // ถ้า Backend ของคุณมี prefix เช่น /api ก็เติมต่อท้ายได้เลย เช่น http://127.0.0.1:8000/api
  baseURL: '', 
  headers: {
    'Content-Type': 'application/json',
  },
  // timeout: 10000, // สามารถตั้งเวลา timeout ได้ (หน่วยเป็นมิลลิวินาที)
});

// (Optional) ตั้งค่า Interceptor สำหรับแนบ Token อัตโนมัติในอนาคต
api.interceptors.request.use(
  (config) => {
    // สมมติว่าเก็บ Token ไว้ใน localStorage
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;