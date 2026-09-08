/**
 * ฐานข้อมูลกลาง — กองทุนสนับสนุนการจัดการเรียนการสอน แผนการเรียนเตรียมทหาร ตำรวจ โรงเรียนมัธยมวัดหนองแขม
 *
 * กองทุนภายใต้การกำกับของโรงเรียนมัธยมวัดหนองแขม
 * โรงเรียนเป็นเจ้าภาพรับเงินบริจาคและเบิกจ่ายตามระเบียบของทางราชการ
 * ทะเบียนนี้เป็นบัญชีคุมเพื่อการติดตามและรายงาน มิใช่บัญชีทางการเงินของโรงเรียน
 *
 * ใช้ Google Sheets เป็นฐานข้อมูล และ Apps Script เป็น API ให้เว็บไซต์เรียกใช้
 * เอกสารวิธีติดตั้งอยู่ในไฟล์ README.md
 */

/* ═══════════════ ตั้งค่า ═══════════════ */

/**
 * รหัสเข้าใช้งาน — ต้องเปลี่ยนเป็นของตัวเองก่อนใช้งานจริง และต้องตรงกับที่กรอกในหน้าเว็บ
 *
 * สำคัญ : ห้ามนำรหัสจริงไปใส่ในไฟล์ที่ push ขึ้นคลังโค้ดสาธารณะ
 * ให้เก็บรหัสจริงไว้ใน Apps Script เท่านั้น ไฟล์ในคลังโค้ดคงค่าตัวอย่างไว้แบบนี้
 */
var TOKEN = 'nk-cadet-2569-CHANGE-ME';
var DEFAULT_TOKEN = 'nk-cadet-2569-CHANGE-ME';

/** ปีการศึกษาปัจจุบัน ใช้ประกอบเลขที่เอกสาร */
var YEAR = '2569';

var SHEETS = {
  'ทะเบียนหนังสือ': [
    'id', 'เลขที่', 'ประเภท', 'หมวดงาน', 'วันที่', 'เรื่อง', 'จาก / ถึง',
    'ผู้รับผิดชอบ', 'สถานะ', 'จำนวนเงินที่เกี่ยวข้อง', 'ลิงก์ไฟล์', 'อ้างถึง',
    'หมายเหตุ', 'บันทึกเมื่อ', 'ผู้บันทึก'
  ],
  'บัญชี': [
    'id', 'วันที่', 'ประเภท', 'เลขที่เอกสาร', 'หมวด', 'รายละเอียด', 'คู่กรณี',
    'จำนวนเงิน', 'วิธีรับ–จ่าย', 'เลขที่หลักฐาน', 'วันที่นำฝาก', 'สถานะ',
    'หมายเหตุ', 'บันทึกเมื่อ', 'ผู้บันทึก'
  ],
  'ทะเบียนเลขที่': ['ประเภท', 'ปี', 'เลขล่าสุด'],
  'บันทึกการใช้งาน': ['เวลา', 'การกระทำ', 'ตาราง', 'id', 'รายละเอียด', 'ผู้ทำ']
};

/** คำนำหน้าเลขที่เอกสารของแต่ละประเภท */
var PREFIX = {
  'หนังสือเข้า': 'ร',
  'หนังสือออก': 'ศธ',
  'บันทึกภายใน': 'บท',
  'คำสั่งโรงเรียน': 'คส',
  'บันทึกข้อตกลง': 'มอ',
  'รายงานการประชุม': 'ปช',
  'แบบแจ้งความประสงค์บริจาค': 'ปบ',
  'ใบเสร็จรับเงินของโรงเรียน': 'บ',
  'หนังสือรับรองการบริจาค': 'รบ',
  'ใบสำคัญจ่ายเงิน': 'จ',
  'หนังสือขอบคุณ': 'ขอบคุณ',
  'ใบประกาศเกียรติคุณ': 'ปก',
  'แบบฟอร์มนักเรียน': 'นร',
  'รายงานการเงิน': 'รง',
  'รายงานประจำปี': 'รป'
};

/* ═══════════════ จุดเข้าใช้งาน ═══════════════ */

function doGet(e) {
  return handle(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var p = {};
  try {
    if (e && e.postData && e.postData.contents) p = JSON.parse(e.postData.contents);
  } catch (err) {
    p = (e && e.parameter) ? e.parameter : {};
  }
  return handle(p);
}

function handle(p) {
  var out;
  try {
    if (p.token !== TOKEN) throw new Error('รหัสเข้าใช้งานไม่ถูกต้อง');
    var action = p.action || 'ping';
    if (action === 'ping')          out = ok({ message: 'เชื่อมต่อสำเร็จ', year: YEAR, sheets: Object.keys(SHEETS) });
    else if (action === 'setup')    out = ok(setupDatabase());
    else if (action === 'list')     out = ok(listRows(p.table, p));
    else if (action === 'add')      out = ok(addRow(p.table, parseRow(p.row), p.user));
    else if (action === 'update')   out = ok(updateRow(p.table, p.id, parseRow(p.row), p.user));
    else if (action === 'delete')   out = ok(deleteRow(p.table, p.id, p.user));
    else if (action === 'nextNo')   out = ok({ no: nextNumber(p.type) });
    else if (action === 'summary')  out = ok(summary());
    else throw new Error('ไม่รู้จักคำสั่ง: ' + action);
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return respond(out, p.callback);
}

function ok(data) {
  if (TOKEN === DEFAULT_TOKEN && data && typeof data === 'object') {
    data.warning = 'ยังใช้รหัสเข้าใช้งานค่าเริ่มต้นอยู่ ซึ่งเปิดเผยอยู่ในคลังโค้ดสาธารณะ ' +
                   'กรุณาแก้ตัวแปร TOKEN ใน Apps Script เป็นรหัสของตัวเอง แล้วกดทำให้ใช้งานได้ใหม่';
  }
  return { ok: true, data: data };
}

function respond(obj, callback) {
  var body = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function parseRow(row) {
  if (!row) return {};
  if (typeof row === 'string') { try { return JSON.parse(row); } catch (e) { return {}; } }
  return row;
}

/* ═══════════════ จัดการฐานข้อมูล ═══════════════ */

function book() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheetOf(name) {
  if (!SHEETS[name]) throw new Error('ไม่มีตารางชื่อ ' + name);
  var ss = book();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
  }
  return sh;
}

function setupDatabase() {
  var made = [];
  Object.keys(SHEETS).forEach(function (name) {
    var ss = book();
    var sh = ss.getSheetByName(name);
    var isNew = !sh;
    if (isNew) sh = ss.insertSheet(name);
    var head = SHEETS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    sh.getRange(1, 1, 1, head.length)
      .setBackground('#10305F').setFontColor('#FFFFFF').setFontWeight('bold')
      .setVerticalAlignment('middle').setWrap(true);
    sh.setFrozenRows(1);
    sh.setRowHeight(1, 34);
    for (var c = 1; c <= head.length; c++) sh.setColumnWidth(c, c === 1 ? 90 : 150);
    made.push(name + (isNew ? ' (สร้างใหม่)' : ' (มีอยู่แล้ว)'));
  });
  var def = book().getSheetByName('Sheet1') || book().getSheetByName('ชีต1');
  if (def && book().getSheets().length > 1 && def.getLastRow() === 0) book().deleteSheet(def);
  return { sheets: made };
}

function headers(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function listRows(table, p) {
  var sh = sheetOf(table);
  var last = sh.getLastRow();
  var head = headers(sh);
  if (last < 2) return { headers: head, total: 0, rows: [] };
  var values = sh.getRange(2, 1, last - 1, head.length).getValues();
  var rows = values.map(function (v) {
    var o = {};
    head.forEach(function (h, i) { o[h] = fmt(v[i]); });
    return o;
  }).filter(function (o) { return String(o.id || '').length > 0; });

  if (p && p.q) {
    var q = String(p.q).toLowerCase();
    rows = rows.filter(function (o) {
      return head.some(function (h) { return String(o[h] || '').toLowerCase().indexOf(q) >= 0; });
    });
  }
  if (p && p.filterField && p.filterValue) {
    rows = rows.filter(function (o) { return String(o[p.filterField]) === String(p.filterValue); });
  }
  rows.reverse();                                   // ใหม่สุดขึ้นก่อน
  var limit = Number(p && p.limit ? p.limit : 300);
  return { headers: head, total: rows.length, rows: rows.slice(0, limit) };
}

function fmt(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
  return v;
}

function addRow(table, row, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheetOf(table);
    var head = headers(sh);
    var id = table.substring(0, 2) + '-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd-HHmmss')
             + '-' + Math.floor(Math.random() * 900 + 100);
    row.id = id;
    row['บันทึกเมื่อ'] = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
    row['ผู้บันทึก'] = user || row['ผู้บันทึก'] || '-';
    var line = head.map(function (h) { return row[h] !== undefined ? row[h] : ''; });
    sh.appendRow(line);
    log('เพิ่ม', table, id, row['เรื่อง'] || row['รายละเอียด'] || '', user);
    return { id: id, row: row };
  } finally {
    lock.releaseLock();
  }
}

function findRowIndex(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function updateRow(table, id, row, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheetOf(table);
    var r = findRowIndex(sh, id);
    if (r < 0) throw new Error('ไม่พบรายการ id ' + id);
    var head = headers(sh);
    var cur = sh.getRange(r, 1, 1, head.length).getValues()[0];
    var line = head.map(function (h, i) { return row[h] !== undefined ? row[h] : cur[i]; });
    line[head.indexOf('id')] = id;
    sh.getRange(r, 1, 1, head.length).setValues([line]);
    log('แก้ไข', table, id, '', user);
    return { id: id };
  } finally {
    lock.releaseLock();
  }
}

/** ไม่ลบแถวจริง แต่ทำเครื่องหมายยกเลิก เพื่อให้เลขที่เอกสารเรียงต่อเนื่องและตรวจสอบย้อนหลังได้ */
function deleteRow(table, id, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheetOf(table);
    var r = findRowIndex(sh, id);
    if (r < 0) throw new Error('ไม่พบรายการ id ' + id);
    var head = headers(sh);
    var iStatus = head.indexOf('สถานะ');
    var iAmount = head.indexOf('จำนวนเงิน');
    var iNote = head.indexOf('หมายเหตุ');
    if (iStatus >= 0) sh.getRange(r, iStatus + 1).setValue('ยกเลิก');
    if (iAmount >= 0) sh.getRange(r, iAmount + 1).setValue(0);
    if (iNote >= 0) {
      var old = sh.getRange(r, iNote + 1).getValue();
      sh.getRange(r, iNote + 1).setValue(('ยกเลิกเมื่อ ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm') + ' ' + (old || '')).trim());
    }
    sh.getRange(r, 1, 1, head.length).setFontLine('line-through').setFontColor('#9B2C2C');
    log('ยกเลิก', table, id, '', user);
    return { id: id, status: 'ยกเลิก' };
  } finally {
    lock.releaseLock();
  }
}

function log(action, table, id, detail, user) {
  try {
    var sh = sheetOf('บันทึกการใช้งาน');
    sh.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      action, table, id, detail || '', user || '-'
    ]);
  } catch (e) { /* ไม่ให้ log ทำให้การบันทึกหลักล้มเหลว */ }
}

/* ═══════════════ เลขที่เอกสารอัตโนมัติ ═══════════════ */

function nextNumber(type) {
  if (!type) throw new Error('ต้องระบุประเภทเอกสาร');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheetOf('ทะเบียนเลขที่');
    var last = sh.getLastRow();
    var rows = last > 1 ? sh.getRange(2, 1, last - 1, 3).getValues() : [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(type) && String(rows[i][1]) === YEAR) {
        var n = Number(rows[i][2]) + 1;
        sh.getRange(i + 2, 3).setValue(n);
        return format(type, n);
      }
    }
    sh.appendRow([type, YEAR, 1]);
    return format(type, 1);
  } finally {
    lock.releaseLock();
  }
}

function format(type, n) {
  var p = PREFIX[type] || 'อ';
  return p + ' ' + ('000' + n).slice(-3) + '/' + YEAR;
}

/* ═══════════════ สรุปยอด ═══════════════ */

function summary() {
  var acc = sheetOf('บัญชี');
  var last = acc.getLastRow();
  var head = headers(acc);
  var iType = head.indexOf('ประเภท'), iAmt = head.indexOf('จำนวนเงิน'),
      iCat = head.indexOf('หมวด'), iEvid = head.indexOf('เลขที่หลักฐาน'),
      iDep = head.indexOf('วันที่นำฝาก'), iWay = head.indexOf('วิธีรับ–จ่าย'),
      iStat = head.indexOf('สถานะ'), iDate = head.indexOf('วันที่');

  var income = 0, expense = 0, byCat = {}, noEvidence = 0, notDeposited = 0, byMonth = {};
  if (last > 1) {
    acc.getRange(2, 1, last - 1, head.length).getValues().forEach(function (v) {
      if (!v[0]) return;
      if (String(v[iStat]) === 'ยกเลิก') return;
      var amt = Number(v[iAmt]) || 0;
      var t = String(v[iType]);
      var m = v[iDate] instanceof Date
        ? Utilities.formatDate(v[iDate], 'Asia/Bangkok', 'yyyy-MM')
        : String(v[iDate] || '').substring(0, 7);
      byMonth[m] = byMonth[m] || { income: 0, expense: 0 };
      if (t === 'รับ') {
        income += amt;
        byMonth[m].income += amt;
        if (String(v[iWay]) === 'เงินสด' && !v[iDep]) notDeposited++;
      } else if (t === 'จ่าย') {
        expense += amt;
        byMonth[m].expense += amt;
        if (!v[iEvid]) noEvidence++;
      }
      var cat = String(v[iCat] || 'ไม่ระบุหมวด');
      byCat[cat] = byCat[cat] || { income: 0, expense: 0 };
      byCat[cat][t === 'รับ' ? 'income' : 'expense'] += amt;
    });
  }

  var doc = sheetOf('ทะเบียนหนังสือ');
  var dLast = doc.getLastRow();
  var dHead = headers(doc);
  var iDType = dHead.indexOf('ประเภท'), iDStat = dHead.indexOf('สถานะ');
  var byType = {}, pending = 0, docTotal = 0;
  if (dLast > 1) {
    doc.getRange(2, 1, dLast - 1, dHead.length).getValues().forEach(function (v) {
      if (!v[0]) return;
      var st = String(v[iDStat] || '');
      if (st === 'ยกเลิก') return;
      docTotal++;
      var t = String(v[iDType] || 'ไม่ระบุ');
      byType[t] = (byType[t] || 0) + 1;
      if (st === 'รอดำเนินการ' || st === 'รอลงนาม') pending++;
    });
  }

  return {
    income: income, expense: expense, balance: income - expense,
    byCategory: byCat, byMonth: byMonth,
    noEvidence: noEvidence, notDeposited: notDeposited,
    documents: docTotal, byDocType: byType, pendingDocuments: pending,
    updatedAt: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm')
  };
}

/* ═══════════════ เมนูในสเปรดชีต ═══════════════ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('กองทุนเตรียมทหาร–ตำรวจ นข.')
    .addItem('สร้าง/ซ่อมตารางฐานข้อมูล', 'menuSetup')
    .addItem('แสดงสรุปยอด', 'menuSummary')
    .addToUi();
}

function menuSetup() {
  var r = setupDatabase();
  SpreadsheetApp.getUi().alert('เรียบร้อย\n\n' + r.sheets.join('\n'));
}

function menuSummary() {
  var s = summary();
  SpreadsheetApp.getUi().alert(
    'สรุปยอด ณ ' + s.updatedAt +
    '\n\nรายรับรวม   ' + s.income.toLocaleString() +
    '\nรายจ่ายรวม  ' + s.expense.toLocaleString() +
    '\nคงเหลือ     ' + s.balance.toLocaleString() +
    '\n\nหนังสือทั้งหมด ' + s.documents + ' ฉบับ' +
    '\nรอดำเนินการ ' + s.pendingDocuments + ' ฉบับ' +
    '\nรายจ่ายที่ยังไม่มีหลักฐาน ' + s.noEvidence + ' รายการ' +
    '\nเงินสดที่ยังไม่นำฝาก ' + s.notDeposited + ' รายการ'
  );
}
