import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Employee { name: string; note: string; }

export async function POST(req: NextRequest) {
  const { company, workDate, department, controller, jobDetail, area,
    workPermitNo, contractorCompany, foremanName, contractorTel, employees } = await req.json();

  let dateDisplay = '-';
  if (workDate) {
    try { dateDisplay = format(new Date(workDate + 'T00:00:00'), 'EEE dd/MM/yyyy', { locale: th }); } catch { /* ignore */ }
  }

  const rows = ((employees || []) as Employee[]).map((emp, i) =>
    '<tr>'
    + '<td class="num">' + (i + 1) + '</td>'
    + '<td class="name">' + (emp.name || '&nbsp;') + '</td>'
    + '<td class="time">&nbsp;</td>'
    + '<td class="sign">&nbsp;</td>'
    + '<td class="time">&nbsp;</td>'
    + '<td class="sign">&nbsp;</td>'
    + '<td class="note">' + (emp.note || '&nbsp;') + '</td>'
    + '</tr>'
  ).join('');

  const wpSection = workPermitNo
    ? '<tr><td class="lbl">Work Permit :</td><td class="val">' + workPermitNo + '</td><td style="width:6mm"></td>'
      + '<td class="lbl">ชื่อ บริษัทรับเหมา :</td><td class="val">' + (contractorCompany || '-') + '</td></tr>'
      + '<tr><td class="lbl">ชื่อ หัวหน้างานรับเหมา :</td><td class="val">' + (foremanName || '-') + '</td><td></td>'
      + '<td class="lbl">เบอร์โทรศัพท์ผู้รับเหมา :</td><td class="val">' + (contractorTel || '-') + '</td></tr>'
    : '';

  const html = '<!DOCTYPE html><html lang="th"><head>'
    + '<meta charset="utf-8">'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;600;700&display=swap" rel="stylesheet">'
    + '<title>Weekend Request</title>'
    + '<style>'
    + '* { box-sizing: border-box; margin: 0; padding: 0; }'
    + 'body { font-family: "Noto Sans Thai", sans-serif; font-size: 10.5pt; color: #000; }'
    + '@page { size: A4 portrait; margin: 14mm 12mm 14mm 15mm; }'
    + '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'
    + '.container { max-width: 183mm; }'
    + '.header { text-align: center; margin-bottom: 10px; }'
    + '.title { font-size: 14pt; font-weight: 700; margin-bottom: 2px; }'
    + '.subtitle { font-size: 11pt; color: #444; }'
    + '.divider { border: none; border-top: 2px solid #1a3a5c; margin: 8px 0; }'
    + '.info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }'
    + '.info-table td { padding: 4px 5px; vertical-align: bottom; }'
    + '.lbl { font-weight: 600; white-space: nowrap; font-size: 10pt; }'
    + '.val { padding-bottom: 1px; min-width: 28mm; font-size: 10pt; }'
    + '.main-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt; }'
    + '.main-table th { background-color: #1a3a5c; color: #fff; border: 1px solid #1a3a5c; padding: 5px 4px; text-align: center; font-weight: 600; }'
    + '.main-table td { border: 1px solid #999; padding: 4px 5px; min-height: 20px; }'
    + '.num { text-align: center; width: 8%; }'
    + '.name { width: 24%; }'
    + '.time { text-align: center; width: 10%; }'
    + '.sign { text-align: center; width: 13%; }'
    + '.note { text-align: center; width: 22%; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; word-break: break-all; }'
    + '.main-table tbody tr:nth-child(even) { background-color: #f8f9fa; }'
    + '.footer-note { font-size: 8.5pt; color: #444; margin-bottom: 16px; line-height: 1.6; border-left: 3px solid #1a3a5c; padding-left: 8px; }'
    + '.sig-area { text-align: center; float: right; margin-top: 10px; width: 55mm; }'
    + '.sig-area p { margin-bottom: 3px; font-size: 10pt; }'
    + '.sig-line { border-bottom: 1.5px solid #000; width: 50mm; display: inline-block; margin: 35px 0 4px; }'
    + '</style>'
    + '</head><body>'
    + '<div class="container">'
    + '<div class="header">'
    + '<div class="title">แบบฟอร์มแจ้งรายชื่อเข้าทำงานวันหยุด</div>'
    + '<div class="subtitle">Weekend Request</div>'
    + '</div>'
    + '<hr class="divider">'
    + '<table class="info-table">'
    + '<tr><td class="lbl">บริษัท :</td><td class="val" colspan="4">' + (company || '-') + '</td></tr>'
    + '<tr><td class="lbl">วันที่เข้ามาปฏิบัติงาน :</td><td class="val" colspan="4">' + dateDisplay + '</td></tr>'
    + '<tr><td class="lbl">หน่วยงาน :</td><td class="val">' + (department || '-') + '</td>'
    + '<td></td>'
    + '<td class="lbl">ชื่อ ผู้ควบคุมงาน :</td><td class="val">' + (controller || '-') + '</td></tr>'
    + '<tr><td class="lbl">งานที่เข้าทำ :</td><td class="val" colspan="4">' + (jobDetail || '-') + '</td></tr>'
    + '<tr><td class="lbl">พื้นที่ปฎิบัติงาน :</td><td class="val" colspan="4">' + (area || '-') + '</td></tr>'
    + wpSection
    + '</table>'
    + '<table class="main-table">'
    + '<thead><tr>'
    + '<th class="num">ลำดับที่</th>'
    + '<th class="name">ชื่อ - สกุล</th>'
    + '<th class="time">เวลาเข้า</th>'
    + '<th class="sign">ลงชื่อเข้า</th>'
    + '<th class="time">เวลาออก</th>'
    + '<th class="sign">ลงชื่อออก</th>'
    + '<th class="note">หมายเหตุ</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '</table>'
    + '<p class="footer-note">ในกรณีเพิ่มรายชื่อในแบบฟอร์มช่วงวันหยุด ขอให้ผู้จัดการแต่ละหน่วยงาน ติดต่อเพิ่มรายชื่อฝ่ายบริหารทรัพยากรบุคคล<br>คุณเรืองชัย อภิบูลย์ เบอร์โทร 061-1758564</p>'
    + '<div class="sig-area">'
    + '<p>อนุมัติโดย</p>'
    + '<p>&nbsp;</p>'
    + '<div class="sig-line"></div>'
    + '<p>ผู้อำนวยการ</p>'
    + '</div>'
    + '</div>'
    + '<script>window.onload = function() { window.print(); };</script>'
    + '</body></html>';

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
