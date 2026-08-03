/**
 * TaskME — Backend (Google Apps Script Web App)
 * ระบบแชร์คนในบ้าน + Google Login + สิทธิ์ owner / edit / view
 *
 * สถาปัตยกรรม:
 *  - Google Sheet เดียว หลายแท็บ = ฐานข้อมูล (ดู SCHEMA ด้านล่าง)
 *  - Frontend (บน Vercel) ล็อกอินด้วย Google Identity Services ได้ ID token (JWT)
 *    แล้วส่ง token มากับทุก request → backend ตรวจ token, หา member จากอีเมล,
 *    บังคับสิทธิ์ฝั่ง server, อ่าน/เขียน Sheet
 *  - workspace 'shared'  = ทุกคนในบ้านเห็นร่วมกัน
 *    workspace 'personal' = ของแต่ละคน (เก็บเป็น 'personal:<member_id>' ใน Sheet)
 *
 * ►►► ตั้งค่า 2 ค่านี้ก่อนใช้งาน ◄◄◄
 */
const CONFIG = {
  SHEET_ID: '1XHD-8hX-zeqU8__GB0y9qiTcFNh5WED33UjDC648ddw',          // id ของ Google Sheet ฐานข้อมูล
  OAUTH_CLIENT_ID: '893425372084-thvcg6cf0ne71c1n98pp6sagkvpldetg.apps.googleusercontent.com',  // Client ID (ลงท้าย .apps.googleusercontent.com)
};

/* ---------- SCHEMA: ชื่อแท็บ -> คอลัมน์ (คอลัมน์แรกใช้เป็น id ของ entity) ---------- */
const SCHEMA = {
  Members:     ['member_id', 'name', 'email', 'role', 'perm', 'color', 'av'],
  Projects:    ['workspace_id', 'id', 'name', 'emoji', 'color'],
  Tasks:       ['workspace_id', 'id', 'title', 'project', 'assignee', 'due', 'time', 'pri', 'status', 'email'],
  Events:      ['workspace_id', 'id', 'date', 'allday', 'start', 'end', 'title', 'color'],
  Expenses:    ['workspace_id', 'id', 'title', 'project', 'amount', 'date', 'payer'],
  Cases:       ['workspace_id', 'id', 'name', 'emoji', 'color', 'status'],
  CaseEntries: ['case_id', 'entry_id', 'date', 'time', 'what', 'ev'],
};
// entity ที่ผูกกับ workspace (ใช้ตอน bootstrap/save ต่อ workspace)
const WS_ENTITIES = ['Projects', 'Tasks', 'Events', 'Expenses', 'Cases'];

/* ============================================================
 *  HTTP entry points
 * ============================================================ */
function doGet(e) { return json({ ok: true, service: 'TaskME backend', ts: Date.now() }); }

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const me = authenticate(req.token);          // {email,...} หรือ throw
    const member = findMemberByEmail(me.email);
    if (!member) return json({ error: 'not_a_member', email: me.email });

    switch (req.action) {
      case 'bootstrap': return json(bootstrap(member));
      case 'save':      return json(saveWorkspace(member, req.workspace, req.data));
      case 'addMember': return json(addMember(member, req));
      case 'ping':      return json({ ok: true, email: me.email, perm: member.perm });
      default:          return json({ error: 'unknown_action', action: req.action });
    }
  } catch (err) {
    return json({ error: 'server_error', message: String(err && err.message || err) });
  }
}

/* ============================================================
 *  Auth — ตรวจ Google ID token (JWT) แล้วคืนอีเมล
 * ============================================================ */
function authenticate(idToken) {
  if (!idToken) throw new Error('missing token');
  const res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('invalid token');
  const info = JSON.parse(res.getContentText());
  if (info.aud !== CONFIG.OAUTH_CLIENT_ID) throw new Error('token audience mismatch');
  if (String(info.email_verified) !== 'true' && info.email_verified !== true) throw new Error('email not verified');
  return { email: String(info.email).toLowerCase(), name: info.name };
}

/* ============================================================
 *  Data access helpers
 * ============================================================ */
function ss() { return SpreadsheetApp.openById(CONFIG.SHEET_ID); }

function sheet(name) {
  const s = ss().getSheetByName(name);
  if (!s) throw new Error('missing sheet: ' + name);
  return s;
}

// อ่านทั้งแท็บเป็น array ของ object ตาม SCHEMA
function readAll(name) {
  const cols = SCHEMA[name];
  const values = sheet(name).getDataRange().getValues();
  const out = [];
  for (let r = 1; r < values.length; r++) {           // ข้าม header
    const row = values[r];
    if (row.every(c => c === '' || c === null)) continue;
    const o = {};
    cols.forEach((c, i) => { o[c] = row[i]; });
    out.push(o);
  }
  return out;
}

// เขียนทับทั้งแท็บด้วย array ของ object (คง header ไว้)
function writeAll(name, objs) {
  const cols = SCHEMA[name];
  const s = sheet(name);
  const last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, cols.length).clearContent();
  if (objs.length) {
    const rows = objs.map(o => cols.map(c => (o[c] === undefined || o[c] === null) ? '' : o[c]));
    s.getRange(2, 1, rows.length, cols.length).setValues(rows);
  }
}

function findMemberByEmail(email) {
  const m = readAll('Members').find(x => String(x.email).toLowerCase() === email);
  if (!m) return null;
  m.perm = m.perm || 'view';
  return m;
}

/* ============================================================
 *  bootstrap — คืนข้อมูลทั้งหมดที่ member คนนี้เห็นได้ (shared + personal ของตัวเอง)
 * ============================================================ */
function bootstrap(member) {
  const members = readAll('Members').map(m => ({
    id: m.member_id, name: m.name, email: m.email, role: m.role,
    perm: m.perm || 'view', color: m.color, av: m.av,
  }));
  return {
    ok: true,
    me: { id: member.member_id, name: member.name, perm: member.perm },
    members: members,
    DATA: {
      personal: buildWorkspace('personal:' + member.member_id, 'พื้นที่ส่วนตัว', 'งานและบันทึกของฉัน'),
      shared:   buildWorkspace('shared', 'พื้นที่ครอบครัว', 'แชร์กับทุกคนในบ้าน · ล็อกอินด้วย Google'),
    },
  };
}

function buildWorkspace(wsId, label, sub) {
  const pick = name => readAll(name).filter(r => r.workspace_id === wsId);
  const cases = pick('Cases').map(c => {
    const entries = readAll('CaseEntries').filter(e => e.case_id === c.id)
      .map(e => ({ date: String(e.date || ''), time: String(e.time || ''), what: e.what, ev: e.ev }));
    return { id: c.id, name: c.name, emoji: c.emoji, color: c.color, status: c.status, entries: entries };
  });
  const isIsoDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  return {
    label: label, sub: sub,
    projects: pick('Projects').map(p => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color })),
    tasks:    pick('Tasks').map(t => ({ id: t.id, title: t.title, project: t.project, assignee: t.assignee || undefined,
                                        due: t.due, time: String(t.time || ''), pri: t.pri, status: t.status, email: t.email === true || t.email === 'TRUE' })),
    events:   pick('Events').filter(e => isIsoDate(e.date)).map(e => ({ id: e.id, date: String(e.date), allDay: e.allday === true || e.allday === 'TRUE', start: String(e.start || ''), end: String(e.end || ''), title: e.title, color: e.color })),
    expenses: pick('Expenses').map(x => ({ id: x.id, title: x.title, project: x.project, amount: Number(x.amount),
                                           date: x.date, payer: x.payer || undefined })),
    cases:    cases,
  };
}

/* ============================================================
 *  save — เขียนทับข้อมูลของ 1 workspace (ตรวจสิทธิ์ก่อน)
 * ============================================================ */
function saveWorkspace(member, workspace, data) {
  if (workspace !== 'shared' && workspace !== 'personal') throw new Error('bad workspace');
  const wsId = workspace === 'shared' ? 'shared' : 'personal:' + member.member_id;

  // สิทธิ์: shared เขียนได้เฉพาะ owner/edit · personal เขียนได้เสมอ (ของตัวเอง)
  if (workspace === 'shared' && !(member.perm === 'owner' || member.perm === 'edit')) {
    return { error: 'forbidden', reason: 'view-only ไม่มีสิทธิ์แก้พื้นที่ครอบครัว' };
  }

  // ►► ล็อกกันการเซฟซ้อนกัน (race condition):
  // การเซฟคือ อ่านทั้งหมด→แก้→เขียนทับทั้งหมด ถ้า personal กับ shared เซฟพร้อมกัน
  // ตัวที่เขียนทีหลังจะใช้ข้อมูลอีก workspace ที่อ่านไว้ก่อนหน้า แล้วทับของใหม่หาย
  // LockService บังคับให้ทำทีละคำสั่ง แต่ละครั้งอ่านข้อมูลล่าสุดเสมอ → ไม่ทับกัน
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (e) { return { error: 'busy', message: 'ระบบกำลังบันทึกคำสั่งอื่น ลองใหม่' }; }
  try {
    return saveWorkspaceLocked(wsId, data);
  } finally {
    lock.releaseLock();
  }
}

function saveWorkspaceLocked(wsId, data) {
  // อ่านของ workspace อื่นไว้ (เพื่อไม่ให้ writeAll ทับข้าม workspace)
  const keep = {};
  WS_ENTITIES.concat(['CaseEntries']).forEach(name => { keep[name] = readAll(name); });

  // เตรียมแถวใหม่ของ workspace นี้
  const rows = { Projects: [], Tasks: [], Events: [], Expenses: [], Cases: [], CaseEntries: [] };
  (data.projects || []).forEach(p => rows.Projects.push({ workspace_id: wsId, id: p.id, name: p.name, emoji: p.emoji, color: p.color }));
  (data.tasks || []).forEach(t => rows.Tasks.push({ workspace_id: wsId, id: t.id, title: t.title, project: t.project,
      assignee: t.assignee || '', due: t.due, time: t.time || '', pri: t.pri, status: t.status, email: t.email ? true : false }));
  (data.events || []).forEach(e => rows.Events.push({ workspace_id: wsId, id: e.id, date: e.date, allday: e.allDay ? true : false, start: e.start || '', end: e.end || '', title: e.title, color: e.color }));
  (data.expenses || []).forEach(x => rows.Expenses.push({ workspace_id: wsId, id: x.id, title: x.title, project: x.project,
      amount: x.amount, date: x.date, payer: x.payer || '' }));
  (data.cases || []).forEach(c => {
    rows.Cases.push({ workspace_id: wsId, id: c.id, name: c.name, emoji: c.emoji, color: c.color, status: c.status });
    (c.entries || []).forEach((en, i) => rows.CaseEntries.push({
      case_id: c.id, entry_id: c.id + '-' + i, date: en.date, time: en.time || '', what: en.what, ev: en.ev }));
  });

  // รวม: แถวของ workspace อื่น (คงไว้) + แถวใหม่ของ workspace นี้
  const caseIds = rows.Cases.map(c => c.id);
  WS_ENTITIES.forEach(name => {
    const others = keep[name].filter(r => r.workspace_id !== wsId);
    writeAll(name, others.concat(rows[name]));
  });
  const otherEntries = keep.CaseEntries.filter(e => !belongsToWs(e.case_id, keep.Cases, wsId) && caseIds.indexOf(e.case_id) < 0);
  writeAll('CaseEntries', otherEntries.concat(rows.CaseEntries));

  return { ok: true, workspace: (wsId === 'shared' ? 'shared' : 'personal'), saved: Date.now() };
}

function belongsToWs(caseId, allCases, wsId) {
  const c = allCases.find(x => x.id === caseId);
  return c && c.workspace_id === wsId;
}

/* ============================================================
 *  addMember — เชิญสมาชิกใหม่ (เพิ่มแถวในแท็บ Members จริง)
 *  เฉพาะ owner/edit เท่านั้นที่เชิญได้
 * ============================================================ */
function addMember(inviter, req) {
  if (!(inviter.perm === 'owner' || inviter.perm === 'edit')) return { error: 'forbidden' };
  const email = String(req.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 1) return { error: 'bad_email' };

  const all = readAll('Members');
  if (all.some(m => String(m.email).toLowerCase() === email)) return { error: 'exists' };

  const perm = (req.perm === 'view' || req.perm === 'edit') ? req.perm : 'edit';
  const role = perm === 'edit' ? 'แก้ไขได้' : 'ดูอย่างเดียว';
  const name = String(req.name || '').trim() || email.split('@')[0];
  const palette = ['#E8998D', '#E8A0BF', '#A3B18A', '#F2D091', '#98BBD4', '#B9A9D6'];
  const color = palette[all.length % palette.length];
  const av = name.slice(0, 1);
  const id = 'm' + Date.now();

  const member = { member_id: id, name: name, email: email, role: role, perm: perm, color: color, av: av };
  all.push(member);
  writeAll('Members', all);

  return { ok: true, member: { id: id, name: name, email: email, role: role, perm: perm, color: color, av: av } };
}

/* ============================================================
 *  setup() — รันครั้งเดียวจาก editor เพื่อสร้างแท็บ + ใส่ข้อมูลตัวอย่าง
 * ============================================================ */
function setup() {
  const book = ss();
  Object.keys(SCHEMA).forEach(name => {
    let s = book.getSheetByName(name);
    if (!s) s = book.insertSheet(name);
    s.clear();
    s.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
    s.setFrozenRows(1);
  });
  const def = book.getSheetByName('Sheet1');
  if (def && book.getSheets().length > 1) book.deleteSheet(def);

  // ใส่เจ้าของคนเดียว — สมาชิกที่เหลือเชิญผ่านปุ่ม "เชิญ" ในแอปได้เลย · ไม่ seed ข้อมูลตัวอย่าง
  writeAll('Members', [
    { member_id: 'me', name: 'มาร์ท', email: 'nattawatnummit@gmail.com', role: 'เจ้าของ', perm: 'owner', color: '#D97757', av: 'ม' },
  ]);
  SpreadsheetApp.flush();
  Logger.log('setup เสร็จ — เริ่มต้นด้วยเจ้าของคนเดียว ไม่มีข้อมูลตัวอย่าง');
}

/* ============================================================
 *  resetData() — ล้างข้อมูลตัวอย่าง/เดโมทั้งหมด แต่ "คงสมาชิกไว้"
 *  รันครั้งเดียวจาก editor เพื่อให้เริ่มจากศูนย์แบบไม่มีของปลอม
 *  (ไม่แตะแท็บ Members — benjama และเจ้าของยังอยู่ครบ)
 * ============================================================ */
function resetData() {
  ['Projects', 'Tasks', 'Events', 'Expenses', 'Cases', 'CaseEntries'].forEach(name => writeAll(name, []));
  SpreadsheetApp.flush();
  Logger.log('resetData เสร็จ — ล้างข้อมูลทุกพื้นที่แล้ว สมาชิกยังอยู่ครบ');
}

/* ============================================================
 *  fixHeaders() — เขียนหัวคอลัมน์แถวแรกให้ตรง SCHEMA ปัจจุบัน
 *  (หลังเปลี่ยน Events: day→date และ CaseEntries: +time)
 * ============================================================ */
function fixHeaders() {
  Object.keys(SCHEMA).forEach(name => {
    const s = ss().getSheetByName(name);
    if (s) s.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold');
  });
  SpreadsheetApp.flush();
  Logger.log('fixHeaders เสร็จ');
}

/* ---------- util ---------- */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
