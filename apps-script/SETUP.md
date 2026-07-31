# TaskME — ตั้งค่า Backend แชร์คนในบ้าน (Google Login + สิทธิ์)

คู่มือนี้ทำครั้งเดียว หลังทำเสร็จส่ง **2 ค่า** กลับมาให้ผม (Web App URL + OAuth Client ID)
แล้วผมจะ wire หน้าเว็บให้ล็อกอิน + ซิงก์ข้อมูลจริงได้

ภาพรวม: หน้าเว็บ (Vercel) → ล็อกอิน Google ได้ ID token → ส่งให้ Apps Script →
Apps Script ตรวจตัวตน + สิทธิ์ → อ่าน/เขียน Google Sheet กลาง → ทุกคนในบ้านเห็นข้อมูลชุดเดียวกัน

---

## ขั้นที่ 1 — สร้าง Google Sheet ฐานข้อมูล

1. ไปที่ https://sheets.google.com สร้างสเปรดชีตใหม่ ตั้งชื่อ `TaskME DB`
2. ย้ายไฟล์นี้เข้าโฟลเดอร์ Drive ที่ใช้เก็บงาน TaskME
3. คัดลอก **Spreadsheet ID** จาก URL — ส่วนระหว่าง `/d/` กับ `/edit`
   `https://docs.google.com/spreadsheets/d/`**`ตรงนี้คือ ID`**`/edit`

> ไม่ต้องสร้างแท็บ/หัวตารางเอง — สคริปต์จะสร้างให้ในขั้นที่ 4

---

## ขั้นที่ 2 — สร้าง OAuth Client ID (สำหรับปุ่มล็อกอิน Google)

1. เปิด https://console.cloud.google.com → สร้าง Project ใหม่ (เช่น `TaskME`)
2. เมนู **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - กรอกชื่อแอป `TaskME`, email support/developer เป็นอีเมลคุณ → Save
   - หน้า Audience/Test users: เพิ่มอีเมล Google ของ **ทุกคนในบ้าน** ที่จะใช้ (ตอนนี้ยังเป็นโหมด Testing ได้)
3. เมนู **APIs & Services → Credentials → + Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** ใส่ทั้งสองอัน:
     - `https://task-me-nu.vercel.app`
     - `http://localhost:3000` (ไว้ทดสอบในเครื่อง — จะใส่หรือไม่ก็ได้)
   - Create → คัดลอก **Client ID** (ลงท้าย `.apps.googleusercontent.com`)

---

## ขั้นที่ 3 — สร้าง Apps Script + วางโค้ด

1. เปิด https://script.google.com → **New project** ตั้งชื่อ `TaskME API`
2. ลบโค้ดตัวอย่างในไฟล์ `Code.gs` ทิ้ง แล้ววางเนื้อหาจากไฟล์ **`Code.gs`** (ในโฟลเดอร์นี้) ลงไปทั้งหมด
3. แก้ 2 บรรทัดบนสุดในบล็อก `CONFIG`:
   ```js
   SHEET_ID: 'วาง Spreadsheet ID จากขั้น 1',
   OAUTH_CLIENT_ID: 'วาง Client ID จากขั้น 2',
   ```
4. บันทึก (Ctrl/Cmd + S)

---

## ขั้นที่ 4 — รัน setup() ครั้งเดียว (สร้างแท็บ + ข้อมูลตัวอย่าง)

1. ในแถบเลือกฟังก์ชันด้านบน เลือก **`setup`** → กด **Run**
2. ครั้งแรกจะขออนุญาต → เลือกบัญชี Google ของคุณ → Advanced → ไปยัง TaskME API (unsafe) → Allow
3. เปิด Google Sheet `TaskME DB` ดู จะมีแท็บ: Members, Projects, Tasks, Events, Expenses, Cases, CaseEntries
4. ไปแท็บ **Members** แก้ `email` ของ พลอย/คุณพ่อ/น้องข้าว ให้เป็น **อีเมล Google จริง** ของแต่ละคน
   (คอลัมน์ `perm`: `owner` = เจ้าของ, `edit` = แก้ได้, `view` = ดูอย่างเดียว)

---

## ขั้นที่ 5 — Deploy เป็น Web App

1. ในหน้า Apps Script กด **Deploy → New deployment**
2. เฟือง ⚙️ ข้าง "Select type" → เลือก **Web app**
3. ตั้งค่า:
   - Description: `TaskME API v1`
   - **Execute as: Me** (บัญชีคุณ)
   - **Who has access: Anyone**  ← สำคัญ (หน้าเว็บเรียกแบบ anonymous แล้วแนบ token เอง)
4. Deploy → อนุญาตสิทธิ์อีกครั้งถ้าถาม → คัดลอก **Web app URL**
   (หน้าตาแบบ `https://script.google.com/macros/s/XXXX/exec`)

> แก้โค้ดภายหลังต้อง **Deploy → Manage deployments → แก้ version เป็น New version** ทุกครั้ง URL ถึงจะอัปเดต

---

## ขั้นที่ 6 — ส่งค่ากลับมาให้ผม

ส่ง 2 ค่านี้:

1. **Web app URL** (จากขั้น 5)
2. **OAuth Client ID** (จากขั้น 2)

จากนั้นผมจะเพิ่มปุ่ม "เข้าสู่ระบบด้วย Google" ในหน้าเว็บ + ต่อ API ให้ข้อมูลซิงก์จริง
ล็อกอินแล้วระบบจะเช็คอีเมลกับแท็บ Members อัตโนมัติ แล้วให้สิทธิ์ owner/edit/view ตามที่ตั้งไว้

---

## หมายเหตุความปลอดภัย

- backend ตรวจ **ทุก request**: token ต้องถูกต้อง + อีเมลต้องอยู่ในแท็บ Members ไม่งั้นเข้าไม่ได้
- สิทธิ์บังคับที่ฝั่ง server: `view` แก้พื้นที่ครอบครัวไม่ได้แม้จะกดในหน้าเว็บ
- พื้นที่ส่วนตัวของแต่ละคนแยกกัน (เก็บเป็น `personal:<member_id>`) คนอื่นมองไม่เห็น
