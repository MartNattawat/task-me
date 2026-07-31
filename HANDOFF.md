# TaskME — สรุปงานค้าง & Handoff

> เอกสารส่งต่องาน สำหรับเริ่มโปรเจกต์ TaskME แยกออกมาเป็น Project ใหม่ (แยกจาก Morning Brief)
> อัปเดตล่าสุด: 31 กรกฎาคม 2026

---

## 1. โปรเจกต์นี้คืออะไร

TaskME คือแอปจัดการงาน / ปฏิทิน / ไทม์ไลน์ / ค่าใช้จ่าย สำหรับงานส่วนตัวและครอบครัว
เป็น PWA (ติดตั้งบนมือถือได้) ไฟล์เดียว `index.html` ธีมครีม–ส้มพาสเทลสไตล์ Claude ภาษาไทยทั้งหมด

ลิงก์สำคัญ:

- เว็บใช้งานจริง: https://task-me-nu.vercel.app
- GitHub: `MartNattawat/task-me`
- โฟลเดอร์ Drive (backend): `01 TaskME`
- โค้ดในเครื่อง: โฟลเดอร์นี้ (`Mart/TaskME`)

---

## 2. สถานะปัจจุบัน

| หัวข้อ | สถานะ |
| :-- | :-- |
| Prototype (index.html, mock data) | ✅ เสร็จ ใช้งานได้ |
| Deploy บน Vercel (production) | ✅ เสร็จ |
| Vercel ↔ GitHub auto-deploy | ✅ ตั้งค่าแล้ว |
| Backend เป็น Google Sheet ตัวจริง (4 ตาราง) | ✅ เสร็จ เปิดได้ |
| เชื่อม remote git ในโฟลเดอร์เครื่องนี้ | ⚠️ ยังไม่ผูก (ดูข้อ 4) |
| commit การแก้ล่าสุด (icon/manifest/sw) | ⚠️ ยังไม่ commit (ดูข้อ 4) |
| ระบบจริง (API / login / บันทึกถาวร / sync ปฏิทิน) | ⬜ ยังไม่เริ่ม |

---

## 3. สิ่งที่ทำเสร็จแล้ว

- โครงแอปครบ 2 พื้นที่ (ส่วนตัว / ครอบครัว) แต่ละพื้นที่มี 4 แท็บ (งาน / ปฏิทิน / ไทม์ไลน์ / ค่าใช้จ่าย) + หน้า Settings
- ระบบสมาชิก + สิทธิ์ owner/edit/view เตรียมไว้ในโครง (ตอนนี้ยัง mock)
- ไอคอนแอปครบชุด (192 / 512 / maskable / apple-touch / favicon) + `manifest.webmanifest` + `sw.js` (offline cache)
- Deploy ขึ้น Vercel production และเชื่อม auto-deploy กับ GitHub
- Backend Google Sheet ตัวจริง 4 ตารางในโฟลเดอร์ Drive `01 TaskME` (เปิดได้ ข้อมูลครบ — ดูข้อ 5)

---

## 4. งานค้าง (ต้องทำต่อ) — เรียงตามความสำคัญ

### 4.1 เคลียร์สถานะ git ในโฟลเดอร์เครื่องนี้ ⚠️ ทำก่อน
โฟลเดอร์เครื่องนี้ยัง **ไม่ได้ผูก remote** และมีการแก้ที่ **ยังไม่ commit**:

- ไฟล์ที่แก้ค้างไว้: `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg` (ใหม่), และไอคอนใน `icons/` (บีบขนาดลง)
- ยังไม่มี `git remote` ชี้ไป GitHub ในโคลนนี้

สิ่งที่ต้องทำ: `git add -A && git commit` แล้ว `git remote add origin <GitHub repo>` และ `git push` เพื่อ sync กับ GitHub → Vercel จะ deploy อัตโนมัติ
(บอกได้เลยถ้าอยากให้ช่วย commit + push รอบนี้)

### 4.2 ลบไฟล์เสีย/ไฟล์ทดสอบใน Drive
ในโฟลเดอร์ `01 TaskME` มีไฟล์ .xlsx ที่เปิดไม่ได้/ไฟล์ทดสอบค้างอยู่ ลบทิ้งได้เลย (ระบบลบให้เองไม่ได้):

- `TaskME_Backend.xlsx` (ตัวเก่า เปิดไม่ได้) — id `1KVtSwREB-jq0OWARWGr9obo5SEQFEP-A`
- `TaskME_Backend` (.xlsx อีกตัว ยังพัง) — id `10GwfUlAJrjoV26t8OBZDBLH4-BT0FByj`
- `mini_native.xlsx` (ไฟล์ทดสอบ) — id `1fYGbXXMQIu_r6VRVQ1xvRqUsR5uYYppq`

### 4.3 เติมตาราง backend ที่ยังขาด
ตอนนี้มี 4 ตาราง (Tasks / Events / Expenses / Members) ที่ยังไม่ได้แยกเป็นชีต:
Projects, Workspaces, Cases, CaseEntries, และ Summary (สูตรสรุปยอด) — สร้างเพิ่มแบบเดียวกันได้

### 4.4 เริ่มระบบจริง (รอบถัดไป — ดูข้อ 6)
เปลี่ยนจาก mock data เป็น backend จริง + login + บันทึกถาวร + sync ปฏิทิน

---

## 5. Backend Google Sheets (ตัวจริง เปิดได้)

สร้างเป็น Google Sheet ตัวจริง (native) แยกไฟล์ละตาราง อยู่ในโฟลเดอร์ Drive `01 TaskME`:

| ตาราง | เนื้อหา | ลิงก์ |
| :-- | :-- | :-- |
| Tasks (ตารางงาน) | งาน 9 รายการ | https://docs.google.com/spreadsheets/d/1xGNoM9eFkzQ3ruceuImlSIGZGDYjbSBnWX6wEXV1h1k/edit |
| Events (ปฏิทิน) | นัดหมาย 3 รายการ | https://docs.google.com/spreadsheets/d/16tsam6L8UcRUfI1mYHMYd28lfItbCtrq1s_vOKueBE8/edit |
| Expenses (ค่าใช้จ่าย) | ค่าใช้จ่าย 8 รายการ | https://docs.google.com/spreadsheets/d/1gsi1bs3vlRom9ucEpXL8bQyz-lzdBJ9nT78gTD35wPk/edit |
| Members (สมาชิก) | สมาชิก 4 คน | https://docs.google.com/spreadsheets/d/18aB3CCIOeA2Gl1Q6ymSl_bhifnYx3jdYdrUl41YSSaw/edit |

หมายเหตุ: ทำแยกไฟล์เพราะช่องทางสร้าง Sheet ที่เชื่อถือได้ทำได้ทีละชีต ซึ่งเข้าโครง backend จริงพอดี (1 ตาราง = 1 entity) รายละเอียด schema เต็มดูที่ `docs/BACKEND.md`

เอกสารสรุปโครงสร้าง/แผนงานฉบับเต็ม (Google Doc):
https://docs.google.com/document/d/1mJqN5kqcV6C7Ez8DY12UhhuNt7bl78LKE8r_KQkl3aw/edit

---

## 6. แผนสู่ระบบจริง (รอบถัดไป)

1. **Backend จริง** — Google Sheets เป็นฐานข้อมูล + Google Apps Script เป็น API (อ่าน/เขียน)
2. **Google Login** — สมาชิกล็อกอินด้วยบัญชี Google ผูกกับตาราง Members เพื่อคุมสิทธิ์ owner/edit/view
3. **บันทึกถาวร** — เปลี่ยน mock `DATA` ใน index.html เป็นเรียก API จริง
4. **Sync ปฏิทิน 2 ทาง** — เชื่อม Google Calendar (Events เตรียมช่อง google_event_id ไว้)
5. **แจ้งเตือน** — อีเมล/เตือนงานใกล้ครบกำหนด (Tasks มีช่อง email)

---

## 7. โครงสร้างไฟล์ในโฟลเดอร์นี้

```
index.html            แอปทั้งหมด (single file) — โค้ด mock อยู่ในตัวแปร DATA (บรรทัด ~258)
manifest.webmanifest  PWA manifest
sw.js                 service worker (offline cache)
icon.svg              ไอคอนต้นฉบับ (vector)
icons/                ไอคอนแอป (192/512/maskable/apple-touch/favicon)
README.md             อธิบายแอปแบบสั้น + วิธีรัน
HANDOFF.md            เอกสารฉบับนี้ — สรุปงานค้าง & handoff
docs/BACKEND.md       schema backend เต็ม + ลิงก์ Google Sheets
```

รันในเครื่อง: เปิด `index.html` ตรง ๆ หรือ `npx serve .`
