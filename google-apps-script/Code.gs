/**
 * รับคะแนนหลังเรียนจากหน้า fitness.html แล้วเขียนลงแท็บ "คะแนนหลังเรียน" ของชีตนี้
 * วิธีติดตั้ง ดูไฟล์ README.md ในโฟลเดอร์เดียวกัน
 */
const SECRET = "เปลี่ยนรหัสนี้ก่อนใช้";   // ตั้งรหัสของตัวเอง แล้วใส่รหัสเดียวกันในปุ่ม "ตั้งค่า Google Sheets"
const TAB = "คะแนนหลังเรียน";

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (SECRET === "เปลี่ยนรหัสนี้ก่อนใช้" || d.key !== SECRET) return out({ ok: false, err: "รหัสไม่ถูกต้อง" });
    const rows = d.rows;
    if (!Array.isArray(rows) || !rows.length) return out({ ok: false, err: "ไม่มีข้อมูล" });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
    sh.clear();
    sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sh.getRange(1, 1, 1, rows[0].length).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange(rows.length + 2, 1).setValue("อัปเดตล่าสุด " + new Date().toLocaleString("th-TH") + (d.date ? " · วันที่สอบ " + d.date : ""));
    return out({ ok: true, n: rows.length - 1 });
  } catch (err) {
    return out({ ok: false, err: String(err) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
