# CLAUDE.md — TaskME (handoff เชิงเทคนิค อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง)

> อัปเดตล่าสุด: 2026-08-04 · ไฟล์นี้ทำให้ session ใหม่ไม่ต้องไล่สแกนโค้ด 1,100 บรรทัด = ประหยัดลิมิต
> ผู้ใช้ (Mart) เป็นมือใหม่ด้าน web-dev — ตอบไทย, อธิบายเป็นสเต็ป, และให้คำสั่ง Terminal เป็น **บล็อกเดียว copy ทีเดียว paste ทีเดียว**

## แอปคืออะไร
PWA จัดการ งาน/ปฏิทิน/ไทม์ไลน์/ค่าใช้จ่าย ของครอบครัว ธีมครีม-ส้มพาสเทล ภาษาไทยทั้งหมด
มี 2 พื้นที่: **ส่วนตัว (personal)** / **แชร์ (shared)** แต่ละพื้นที่มี 4 แท็บ + Settings
- Live: https://task-me-nu.vercel.app · GitHub: `MartNattawat/task-me`

## สถาปัตยกรรม (สำคัญ)
- **Frontend:** `index.html` ไฟล์เดียว (~1,144 บรรทัด) ทั้ง HTML/CSS/JS อยู่ในไฟล์นี้ ไม่มี build step
- **Backend:** Google Apps Script (`apps-script/Code.gs`) เป็น Web App รับ POST → อ่าน/เขียน Google Sheets
- **Auth:** Google Identity Services (ปุ่ม Sign in with Google) ส่ง `credential` (JWT) ไป verify ที่ backend
- **DB:** Google Sheets (schema เต็มใน `docs/BACKEND.md`)
- **Deploy:** GitHub → Vercel auto-deploy

## Deploy workflow (จำให้แม่น)
- local branch = `master` · Vercel production branch = `main` → push ด้วย `git push origin master:main`
- **ทุกครั้งที่แก้ frontend ต้อง bump เลข cache ใน `sw.js`** (`const CACHE='taskme-vXX'`) ไม่งั้นมือถือได้ของเก่าจาก service worker (ปัจจุบัน v13)
- **แก้ backend** = แก้ `apps-script/Code.gs` แล้วต้องไป **Deploy ใหม่ใน Apps Script editor** เอง (git push ไม่อัปเดต backend). ตอน deploy ต้องตั้ง "Execute as: Me" + "Who has access: Anyone"
- คำสั่ง deploy มาตรฐาน (บล็อกเดียว):
```bash
cd ~/Mart/TaskME
rm -f .git/HEAD.lock .git/index.lock
git add index.html sw.js
git commit -m "<message>"
git push origin master:main
```
- gotcha: อย่าใช้ zsh glob ที่อาจ match ศูนย์ไฟล์ (เช่น `.git/refs/heads/*.lock`) เพราะ zsh จะ abort ทั้งบรรทัด → ใช้ path ตรงๆ. บางครั้งเจอ stale `.git/HEAD.lock`/`index.lock` ค้าง (ต้อง `rm -f` บนเครื่อง Mart เอง)

## เช็ก syntax ก่อน push เสมอ (ผ่าน sandbox bash)
```bash
cd /sessions/*/mnt/TaskME && python3 -c "import re;h=open('index.html').read();open('/tmp/a.js','w').write('\n'.join(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>',h,re.S)))" && node --check /tmp/a.js
# .gs: cp apps-script/Code.gs /tmp/x.js && node --check /tmp/x.js
```
path mapping: `/Users/martnattawat/Mart/TaskME` ↔ sandbox `/sessions/vigilant-intelligent-bell/mnt/TaskME`

## โมเดลข้อมูล
- `DATA = {personal:{...}, shared:{...}}` (บรรทัด ~329) · `ws` = พื้นที่ปัจจุบัน · `D()` = `DATA[ws]` (บ.338)
- แต่ละ workspace: `{label, tasks[], events[], cases[], expenses[], projects[]}`
- **task:** `{id,title,project,pri('high'|'mid'|'low'),due(ISO),time,status('todo'|'done'),assignee,email}`
- **event:** `{id,date(ISO),title,color,allDay,start,end}`
- **project:** `{id,name,emoji,color}` — สี = `proj(id).color` (พาเลต `PAL` บ.307)
- helper: `esc()`, `isoToThai()`, `isISO()`, `proj()`, `ptag()`, `THMONTH`, `genRecur(start,until,freq)`, `gcalUrl*()`

## ระบบ render + sync (จุดที่พังบ่อย — ระวัง)
- `render()` (บ.417) เขียนทับ `#main`; ถูก **หุ้ม** (บ.~1102) ให้เรียก `saveState()` อัตโนมัติทุกครั้ง และ **หุ้ม try/catch** กัน error หน้าจอทำแอปค้างถาวร
- `saveState` → `saveCache()` (localStorage `taskme_v2`) + `pushBackend()` (debounce 700ms → `forcePush` ผ่าน promise chain กัน personal/shared ยิงชนกัน)
- **ธง unsynced** (localStorage) กันข้อมูลหายถ้าปิดแอปเร็ว; `applyBootstrap` (บ.993) กู้คืน แต่กันเคส "แคชว่างทับ backend ที่มีของ" ด้วย `wsHasContent()`
- **modal ไม่ถูก render() รีเฟรช** — `render()` แตะแค่ `#main` ไม่แตะ `#modalRoot`. ฟังก์ชันที่แก้ข้อมูลจากใน modal (เช่น `deleteEvent`,`dayDeleteTask`) จึงต้องเรียก `render()` **แล้วเปิด modal ใหม่** (`openDayModal(iso)`) เอง
- `api(action,extra)` (บ.~950) POST แบบ `Content-Type: text/plain` **เจตนา** — เพื่อเป็น simple request เลี่ยง CORS preflight (Apps Script ไม่รับ OPTIONS)

## ฟีเจอร์ & จุดโค้ดหลัก (เลขบรรทัดโดยประมาณ)
- Tasks: `viewTasks` 520 · `taskRow` 504 · drag จัดลำดับ `enableTaskDrag` 447 + `commitTaskOrder` 490 · ค้นหา `onTaskSearch` · แท็บ "เสร็จแล้ว" (status==='done')
- Calendar: `viewCalendar` 572 (สัปดาห์เริ่มจันทร์) · `openDayModal` 597 = กดวัน → list นัด+งาน (จุดสี+เวลา+แก้/ลบ) + ฟอร์มเพิ่มนัดที่ **ซ่อนไว้ใต้ปุ่ม** (`toggleEvForm`) · `saveEvent` 651 (recurring ผ่าน `genRecur`)
- Timeline: `viewTimeline` 693 · แก้/ลบหัวเคส `deleteCase`/edit case
- Expenses: `viewExpenses` 806 (วันที่ใช้ date picker)
- Share/Settings/Members/Projects: `viewShare` 782 · `viewSettings` 860

## ประวัติเวอร์ชันล่าสุด (git)
- freeze fix: harden task-drag (stuck pointer/scroll), guard reorder, render try/catch
- calendar day modal: collapse add-event form; day list events+tasks with color dot
- 8 feature update + backend date fix · mobile-empty/save-race fixes

## มารยาทการทำงานกับ Mart
- ตอบไทย กระชับ เป็นสเต็ป · คำสั่ง Terminal = บล็อกเดียว
- อย่าพูดว่า "แก้แล้ว" จนกว่าจะ push ขึ้น prod + ให้ Mart เทสจริง
- ไล่ debug ให้ครบสาย (เขียนข้อมูล→cache→ส่ง backend→reload) ในรอบเดียว
