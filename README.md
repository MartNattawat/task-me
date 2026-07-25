# Task ME

แอปจัดการงานส่วนตัวและครอบครัว — Task, Calendar, Timeline (บันทึกหลักฐานแบบเคส) และค่าใช้จ่าย
ธีมครีมพาสเทลสไตล์เรียบง่าย ติดตั้งบนมือถือได้ (PWA)

## ฟีเจอร์
- **2 พื้นที่**: ส่วนตัว และ แชร์ (ครอบครัว)
- **Task**: ตัวกรอง สถิติ มอบหมายงาน เชื่อมกับอีเมล/ปฏิทิน (mock)
- **Calendar**: ปฏิทินรายเดือน ซิงก์สองทางกับ Google Calendar (mock)
- **Timeline**: รวบรวมเหตุการณ์ทีละวันของเรื่องเดียวเป็นไทม์ไลน์หลักฐาน (เช่น ปัญหา Solar Cell)
- **ค่าใช้จ่าย**: บันทึกและสรุปยอดแยกตามโปรเจกต์ ระบุผู้จ่ายในพื้นที่แชร์
- **ตั้งค่า**: แก้ชื่อผู้ใช้ เพิ่ม/ลบโปรเจกต์ ดูการเชื่อมต่อ

> สถานะปัจจุบัน: **prototype** — ใช้ mock data ทั้งหมด (in-memory) ยังไม่ผูก backend จริง

## โครงสร้าง
```
index.html            หน้าแอปทั้งหมด (single file)
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
icons/                ไอคอนแอป (192/512/maskable/apple-touch/favicon)
```

## รันในเครื่อง
เปิด `index.html` ด้วยเบราว์เซอร์ หรือเสิร์ฟแบบ static:
```
npx serve .
```

## Deploy
เป็น static site — Vercel ตรวจจับอัตโนมัติ ไม่ต้อง build

## แผนถัดไป (backend จริง)
Google Sheets + Apps Script, Google login, ซิงก์ Google Calendar สองทาง
