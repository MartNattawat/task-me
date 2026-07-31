# TaskME — Backend Schema Reference

โครงฐานข้อมูลสำหรับระบบจริง (Google Sheets + Apps Script) ออกแบบแบบ normalized
มิเรอร์จากข้อมูลในแอป ทุกตารางมี id เชื่อมกันเพื่อต่อยอดเป็นฐานข้อมูลจริงได้ทันที

โฟลเดอร์ Drive: `01 TaskME`

## ตารางที่สร้างเป็น Google Sheet ตัวจริงแล้ว (4)

### Tasks — ตารางงาน
`task_id, workspace_id, project, title, assignee_id, due_date, priority, status, note`
- `workspace_id`: personal / shared
- `priority`: low / medium / high
- `status`: todo / doing / done
- ลิงก์: https://docs.google.com/spreadsheets/d/1xGNoM9eFkzQ3ruceuImlSIGZGDYjbSBnWX6wEXV1h1k/edit

### Events — ปฏิทิน
`event_id, workspace_id, title, start, end, all_day, location, member_id`
- `start` / `end`: `YYYY-MM-DD HH:MM`
- เตรียมต่อยอด: เพิ่ม `google_event_id` สำหรับ sync Google Calendar
- ลิงก์: https://docs.google.com/spreadsheets/d/16tsam6L8UcRUfI1mYHMYd28lfItbCtrq1s_vOKueBE8/edit

### Expenses — ค่าใช้จ่าย
`expense_id, workspace_id, date, category, amount, note, member_id`
- `member_id`: ผู้จ่าย (ในพื้นที่ shared)
- ลิงก์: https://docs.google.com/spreadsheets/d/1gsi1bs3vlRom9ucEpXL8bQyz-lzdBJ9nT78gTD35wPk/edit

### Members — สมาชิก
`member_id, name, email, role, color`
- `role`: owner / member (เตรียมขยายเป็น owner/edit/view)
- เตรียมต่อยอด: เพิ่ม `google_sub` สำหรับผูก Google Login
- ลิงก์: https://docs.google.com/spreadsheets/d/18aB3CCIOeA2Gl1Q6ymSl_bhifnYx3jdYdrUl41YSSaw/edit

## ตารางที่ยังไม่ได้สร้าง (ทำเพิ่มรอบหน้า)

### Workspaces
`workspace_id, name, type, owner_member_id` — personal / shared

### Projects
`project_id, workspace_id, name, emoji, color, archived`

### Cases — เคส/เรื่องที่ติดตามในไทม์ไลน์
`case_id, workspace_id, title, status, owner_id, opened_date`

### CaseEntries — บันทึกความคืบหน้าแต่ละเคส
`entry_id, case_id, date, note, evidence, by`

### Summary — สรุปยอดอัตโนมัติ (สูตร)
คำนวณด้วย SUMIFS / COUNTIFS:
- ค่าใช้จ่าย personal / shared / รวม
- จำนวนงานทั้งหมด / งานค้าง / งานเสร็จ
- จำนวนเคสที่เปิดอยู่
- จำนวนสมาชิก

## ความสัมพันธ์ (relations)

```
Members.member_id  ←─ Tasks.assignee_id, Expenses.member_id, Events.member_id, Cases.owner_id
Workspaces.workspace_id ←─ Projects, Tasks, Events, Expenses, Cases (workspace_id)
Projects.project_id ←─ Tasks.project, Expenses (project)
Cases.case_id ←─ CaseEntries.case_id
```

## หมายเหตุ
ข้อมูลตัวอย่างใน Sheets เป็น seed สำหรับทดสอบโครงสร้าง — ยังไม่ sync กับ mock `DATA`
ใน`index.html` (แอปยังใช้ข้อมูลในหน่วยความจำ) การเชื่อมจริงจะทำในเฟส "ระบบจริง"
