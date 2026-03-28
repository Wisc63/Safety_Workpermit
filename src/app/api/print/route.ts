import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wpNo = searchParams.get('wpNo');
  if (!wpNo) return NextResponse.json({ error: 'Missing wpNo' }, { status: 400 });

  try {
    const pool = await getPool();
    const [wpResult, cResult] = await Promise.all([
      pool.request()
        .input('wpNo', sql.NVarChar(12), wpNo)
        .query(`SELECT *, CONVERT(NVARCHAR, Created_Date, 103) AS Created_Date_Str,
                CONVERT(NVARCHAR, Start_Date, 103) AS Start_Date_Str,
                CONVERT(NVARCHAR, End_Date, 103) AS End_Date_Str
                FROM dbo.Work_Permit WHERE Work_Permit_No = @wpNo`),
      pool.request()
        .query(`SELECT Worker_Name, Training_status FROM dbo.Contractor`),
    ]);

    if (wpResult.recordset.length === 0) {
      return NextResponse.json({ error: 'Work Permit not found' }, { status: 404 });
    }

    const wp = wpResult.recordset[0];
    const trainingMap = new Map<string, string>(
      cResult.recordset.map((c: { Worker_Name: string; Training_status: string }) => [c.Worker_Name, c.Training_status])
    );

    // Build contractor rows with training status
    const contractorNames = (wp.Contractor || '').split(', ').filter(Boolean);
    const foremanNames = (wp.Foreman_Name || '').split(', ');
    const contractorTels = (wp.Contractor_Tel || '').split(', ');
    const contractorRows = contractorNames.map((name: string, i: number) => {
      const foremanName = (foremanNames[i] || '').trim();
      const tel = contractorTels[i] || '';
      const trainingStatus = foremanName ? (trainingMap.get(foremanName) || '') : '';
      const statusColor = trainingStatus === 'Allowed' ? '#15803d' : trainingStatus === 'Expired' ? '#dc2626' : '#555';
      const statusIcon = trainingStatus === 'Expired' ? '&#9888; ' : '';
      const statusLabel = trainingStatus
        ? `<span style="color:${statusColor};font-weight:600;font-size:9pt;">${statusIcon}${trainingStatus}</span>`
        : '<span style="color:#aaa;">-</span>';
      return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px ;padding-bottom:4px;">
        <div class="field"><div class="field-value">${name}</div></div>
        <div class="field"><div class="field-value">${foremanName}${tel ? ' (' + tel + ')' : ''}</div></div>
        <div class="field">${statusLabel}</div>
      </div>`;
    }).join('');

    const printDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>Work Permit - ${wp.Work_Permit_No}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap');
  * { font-family: 'Noto Sans Thai', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 210mm; }
  body { padding: 15mm; font-size: 12pt; color: #000; background: #fff; }
  @page { size: 210mm 297mm; margin: 0; }
  @media print { body { padding: 15mm; } }
  .header { text-align: center; border-bottom: 3px double #1a3a5c; padding-bottom: 10px; margin-bottom: 15px; }
  .company-name { font-size: 16pt; font-weight: 700; color: #1a3a5c; }
  .doc-title { font-size: 14pt; font-weight: 600; color: #333; margin-top: 5px; }
  .section { margin-bottom: 12px; }
  .section-title { font-weight: 700; font-size: 11pt; color: #1a3a5c; border-bottom: 1px solid #1a3a5c; padding-bottom: 3px; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .field { padding: 4px 0; }
  .field-label { font-size: 9pt; color: #666; }
  .field-value { font-size: 11pt; font-weight: 500; }
  .contractor-col-header { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-weight: 400; font-size: 9pt; color: #1a3a5c; padding-bottom: 4px; margin-bottom: 6px; }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-weight: 600; font-size: 10pt; }
  .status-Open { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
  .status-Approved { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .status-Completed { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
  .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; font-size: 10pt; }
  .doc-footer { margin-top: 20px; font-size: 8.5pt; color: #555; }
  .doc-footer-row { display: flex; justify-content: space-between; align-items: center; padding-top: 4px; }
  .doc-footer-line { border: none; border-top: 1px solid #000; margin: 0; }
  .print-info { text-align: center; font-size: 8pt; color: #aaa; margin-top: 12px; padding-top: 6px; border-top: 1px solid #eee; }
  .badge-row { display: flex; align-items: center; gap: 10px; }
</style>
</head>
<body>
<div class="header">
  <div class="company-name">บริษัทสหมิตรถังแก๊ส จำกัด (มหาชน)</div>
  <div class="doc-title">ใบอนุญาตทำงาน / WORK PERMIT ${wp.Work_Permit_No}</div>
</div>

<div class="section">
  <div class="section-title">ข้อมูลทั่วไป (General Information)</div>
  <div class="grid">
    <div class="field">
      <div class="field-label">วันที่สร้าง (Created Date)</div>
      <div class="field-value">${wp.Created_Date_Str || ''}</div>
    </div>
    <div class="field badge-row">
      <div>
        <div class="field-label">สถานะ (Status)</div>
        <span class="status-badge status-${wp.Status}">${wp.Status}</span>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">ผู้รับเหมา (Contractor Information)</div>
  <div class="contractor-col-header">
    <div>ชื่อบริษัทผู้รับเหมา</div>
    <div>หัวหน้างาน (Foreman / Tel)</div>
    <div>Training Status</div>
  </div>
  ${contractorRows}
</div>

<div class="section">
  <div class="section-title">รายละเอียดงาน (Work Details)</div>
  <div class="field">
    <div class="field-label">ประเภทงาน / ขอเข้าทำงาน (Request For)</div>
    <div class="field-value">${wp.Request_For || ''}</div>
  </div>
  <div class="field" style="margin-top:8px">
    <div class="field-label">พื้นที่ทำงาน (Work Area)</div>
    <div class="field-value">${wp.Area || ''}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">กำหนดการทำงาน (Work Schedule)</div>
  <div class="grid-3">
    <div class="field">
      <div class="field-label">วันที่เริ่มต้น (Start Date)</div>
      <div class="field-value">${wp.Start_Date_Str || ''}</div>
    </div>
    <div class="field">
      <div class="field-label">วันที่สิ้นสุด (End Date)</div>
      <div class="field-value">${wp.End_Date_Str || ''}</div>
    </div>
    <div class="field">
      <div class="field-label">จำนวนวัน (Days)</div>
      <div class="field-value">${wp.Days || 0} วัน</div>
    </div>
  </div>
  <div class="grid" style="margin-top:8px">
    <div class="field">
      <div class="field-label">จำนวนพนักงาน (Workers)</div>
      <div class="field-value">${wp.Workers || 0} คน</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">ผู้รับผิดชอบ (Responsible Person)</div>
  <div class="grid">
    <div class="field">
      <div class="field-label">แผนก (Department)</div>
      <div class="field-value">${wp.Department || ''}</div>
    </div>
    <div class="field">
      <div class="field-label">ผู้ควบคุมงาน (Controller)</div>
      <div class="field-value">${wp.Controller || ''}</div>
    </div>
    <div class="field">
      <div class="field-label">เจ้าหน้าที่ความปลอดภัย (Safety Officer)</div>
      <div class="field-value">${wp.Safety_Officer || ''}</div>
    </div>
  </div>
</div>

<div class="signature-section">
  <div class="sig-box">
    <div class="sig-line">
      <div>Safety Officer</div>
      <div style="font-size:9pt;color:#666;margin-top:3px">วันที่ / Date: ............................</div>
    </div>
  </div>
</div>

<div class="print-info">
  พิมพ์เมื่อ: ${printDate} | Work Permit No: ${wp.Work_Permit_No} | ระบบ Work Permit - หน่วยงานความปลอดภัย (SHE)
</div>
<div class="doc-footer">
  <hr class="doc-footer-line">
  <div class="doc-footer-row">
    <span>REV : 6/1 (14/10/2025)</span>
    <span>SHE-F-113</span>
  </div>
</div>

<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
