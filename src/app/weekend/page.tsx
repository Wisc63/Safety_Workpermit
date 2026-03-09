'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Printer, Trash2, AlertCircle, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SMPC = 'บริษัทสหมิตรถังแก๊ส จำกัด (มหาชน)';

interface PersonnelItem { ID: number; Department: string; Person_Name: string; }
interface ContractorItem { ID: number; Contractor: string; Worker_Name: string; Worker_Position: string; }
interface WPItem { Work_Permit_No: string; Contractor: string; Foreman_Name: string; Contractor_Tel: string; }
interface Employee { name: string; position: string; note: string; }

const makeEmps = (): Employee[] => Array.from({ length: 18 }, () => ({ name: '', position: '', note: '' }));

function FieldError({ show, msg }: { show: boolean; msg: string }) {
  if (!show) return null;
  return <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle size={11} />{msg}</p>;
}

export default function WeekendPage() {
  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [workPermits, setWorkPermits] = useState<WPItem[]>([]);
  const [company, setCompany] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [department, setDepartment] = useState('');
  const [controller, setController] = useState('');
  const [jobDetail, setJobDetail] = useState('');
  const [area, setArea] = useState('');
  const [wpNo, setWpNo] = useState('');
  const [ctrCompany, setCtrCompany] = useState('');
  const [foremanName, setForemanName] = useState('');
  const [ctrTel, setCtrTel] = useState('');
  const [employees, setEmployees] = useState<Employee[]>(makeEmps());
  const [printing, setPrinting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/personnel').then(r => r.json()),
      fetch('/api/contractor').then(r => r.json()),
      fetch('/api/workpermit').then(r => r.json()),
    ]).then(([p, c, w]) => {
      setPersonnel(Array.isArray(p) ? p : []);
      setContractors(Array.isArray(c) ? c : []);
      setWorkPermits(Array.isArray(w) ? w : []);
    }).catch(() => {});
  }, []);

  const isSmpc = company === SMPC;
  const departments = [...new Set(personnel.map(p => p.Department).filter(Boolean))].sort() as string[];
  const filteredPersonnel = personnel.filter(p => p.Department === department);
  const filteredContractorWorkers = contractors.filter(c => c.Contractor === company);
  const selectedNames = new Set(employees.filter(e => e.name).map(e => e.name));

  const isValid = !!(company && workDate && department && controller && jobDetail.trim() && area.trim());

  const handleCompanyChange = (val: string) => {
    setCompany(val === '__none' ? '' : val);
    setWorkDate(''); setDepartment(''); setController('');
    setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleWorkDateChange = (d: Date | undefined) => {
    setWorkDate(d ? format(d, 'yyyy-MM-dd') : '');
    setDepartment(''); setController('');
    setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleDeptChange = (val: string) => {
    setDepartment(val === '__none' ? '' : val);
    setController(''); setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleControllerChange = (val: string) => {
    setController(val === '__none' ? '' : val);
    setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleWPChange = (val: string) => {
    const id = val === '__none' ? '' : val;
    setWpNo(id);
    const wp = workPermits.find(w => w.Work_Permit_No === id);
    setCtrCompany(wp?.Contractor?.split(', ')[0] || '');
    setForemanName(wp?.Foreman_Name?.split(', ')[0] || '');
    setCtrTel(wp?.Contractor_Tel?.split(', ')[0] || '');
  };
  const updateEmp = (i: number, field: keyof Employee, val: string) =>
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const selectContractorWorker = (i: number, workerName: string) => {
    const worker = filteredContractorWorkers.find(c => c.Worker_Name === workerName);
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, name: workerName, position: worker?.Worker_Position || '' } : e));
  };

  const handleClear = () => {
    setCompany(''); setWorkDate(''); setDepartment(''); setController('');
    setJobDetail(''); setArea(''); setWpNo('');
    setCtrCompany(''); setForemanName(''); setCtrTel('');
    setEmployees(makeEmps());
    setShowErrors(false);
  };

  const openPrint = async () => {
    setShowErrors(true);
    if (!isValid) return;
    setPrinting(true);
    try {
      const body = { company, workDate, department, controller, jobDetail, area,
        workPermitNo: wpNo, contractorCompany: ctrCompany, foremanName, contractorTel: ctrTel, employees };
      const res = await fetch('/api/weekend-print', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const html = await res.text();
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } finally { setPrinting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a3a5c]">Weekend Request</h1>
          <p className="text-xs text-gray-500 mt-0.5">แบบฟอร์มแจ้งรายชื่อเข้าทำงานวันหยุด</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="text-xs h-8 gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={handleClear}>
            <Trash2 size={13} /> ล้างข้อมูล
          </Button>
          <Button className="text-xs h-8 gap-1 bg-[#1a3a5c] hover:bg-[#2a5a8c] text-white" onClick={openPrint} disabled={printing}>
            <Printer size={13} /> {printing ? 'กำลังโหลด...' : 'พิมพ์ PDF'}
          </Button>
        </div>
      </div>

      {showErrors && !isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">กรุณากรอกข้อมูลที่จำเป็นทุกช่อง (*) ก่อนพิมพ์</p>
        </div>
      )}

      {/* Card 1: General Info */}
      <Card className={showErrors && !isValid ? 'border-red-200' : ''}>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-gray-700">ข้อมูลทั่วไป</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">บริษัท <span className="text-red-500">*</span></Label>
              <Select value={company || '__none'} onValueChange={handleCompanyChange}>
                <SelectTrigger className={`text-xs h-8 ${showErrors && !company ? 'border-red-400' : ''}`}>
                  <SelectValue placeholder="เลือกบริษัท..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— เลือกบริษัท —</SelectItem>
                  <SelectItem value={SMPC}>{SMPC}</SelectItem>
                  {[...new Set(contractors.map(c => c.Contractor))].map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError show={showErrors && !company} msg="กรุณาเลือกบริษัท" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">วันที่เข้ามาปฏิบัติงาน <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!company}
                    className={`w-full justify-start text-xs h-8 font-normal ${showErrors && !workDate ? 'border-red-400' : ''} ${!workDate ? 'text-muted-foreground' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {workDate ? format(new Date(workDate + 'T00:00:00'), 'EEE, dd/MM/yyyy', { locale: th }) : '-- เลือกวันที่เข้ามาปฏิบัติงาน --'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={workDate ? new Date(workDate + 'T00:00:00') : undefined}
                    onSelect={handleWorkDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FieldError show={showErrors && !workDate} msg="กรุณาเลือกวันที่" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">หน่วยงาน <span className="text-red-500">*</span></Label>
              <Select value={department || '__none'} onValueChange={handleDeptChange} disabled={!workDate}>
                <SelectTrigger className={`text-xs h-8 ${showErrors && !department ? 'border-red-400' : ''}`}>
                  <SelectValue placeholder="เลือกหน่วยงาน..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— เลือกหน่วยงาน —</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError show={showErrors && !department} msg="กรุณาเลือกหน่วยงาน" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ชื่อ ผู้ควบคุมงาน <span className="text-red-500">*</span></Label>
              <Select value={controller || '__none'} onValueChange={handleControllerChange} disabled={!department}>
                <SelectTrigger className={`text-xs h-8 ${showErrors && !controller ? 'border-red-400' : ''}`}>
                  <SelectValue placeholder="เลือกผู้ควบคุมงาน..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— เลือกผู้ควบคุมงาน —</SelectItem>
                  {filteredPersonnel.map(p => (
                    <SelectItem key={p.ID} value={p.Person_Name}>
                      {p.Person_Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError show={showErrors && !controller} msg="กรุณาเลือกผู้ควบคุมงาน" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">งานที่เข้าทำ <span className="text-red-500">*</span></Label>
            <Input value={jobDetail} onChange={e => setJobDetail(e.target.value)}
              placeholder="ระบุงานที่เข้าทำ..."
              disabled={!controller}
              className={`text-xs h-8 ${showErrors && !jobDetail.trim() ? 'border-red-400' : ''}`} />
            <FieldError show={showErrors && !jobDetail.trim()} msg="กรุณาระบุงานที่เข้าทำ" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">พื้นที่ปฎิบัติงาน <span className="text-red-500">*</span></Label>
            <Input value={area} onChange={e => setArea(e.target.value)}
              placeholder="ระบุพื้นที่ปฎิบัติงาน..."
              disabled={!jobDetail.trim()}
              className={`text-xs h-8 ${showErrors && !area.trim() ? 'border-red-400' : ''}`} />
            <FieldError show={showErrors && !area.trim()} msg="กรุณาระบุพื้นที่ปฎิบัติงาน" />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Work Permit */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-gray-700">
            ข้อมูล Work Permit <span className="text-xs font-normal text-gray-400">(ถ้ามี)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Work Permit No.</Label>
              <Select value={wpNo || '__none'} onValueChange={handleWPChange}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="เลือก Work Permit..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— ไม่มี —</SelectItem>
                  {workPermits.map(wp => (
                    <SelectItem key={wp.Work_Permit_No} value={wp.Work_Permit_No}>
                      {wp.Work_Permit_No}{wp.Contractor ? ` – ${wp.Contractor.split(', ')[0]}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ชื่อ บริษัทรับเหมา</Label>
              <Input value={ctrCompany} readOnly className="text-xs h-8 bg-gray-50" placeholder="-" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ชื่อ หัวหน้างานรับเหมา</Label>
              <Input value={foremanName} readOnly className="text-xs h-8 bg-gray-50" placeholder="-" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">เบอร์โทรศัพท์ผู้รับเหมา</Label>
              <Input value={ctrTel} readOnly className="text-xs h-8 bg-gray-50" placeholder="-" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Employee Table */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            รายชื่อผู้เข้าทำงาน
            {isSmpc && department && <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded">เลือกจากหน่วยงาน {department}</span>}
            {!isSmpc && company && <span className="text-xs font-normal text-orange-500 bg-orange-50 px-2 py-0.5 rounded">กรอกชื่อ-สกุลผู้รับเหมา</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse table-fixed min-w-[600px]">
              <thead>
                <tr className="bg-[#1a3a5c] text-white">
                  <th className="border border-[#1a3a5c] px-2 py-2 text-center w-[8%]">ลำดับ</th>
                  <th className="border border-[#1a3a5c] px-3 py-2 text-left w-[32%]">ชื่อ - สกุล</th>
                  <th className="border border-[#1a3a5c] px-2 py-2 text-left w-[20%]">ตำแหน่ง</th>
                  <th className="border border-[#1a3a5c] px-2 py-2 text-center w-[40%]">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => {
                  const rowAvailableSmpc = filteredPersonnel.filter(p => !selectedNames.has(p.Person_Name) || emp.name === p.Person_Name);
                  const rowAvailableCtr = filteredContractorWorkers.filter(c => !selectedNames.has(c.Worker_Name) || emp.name === c.Worker_Name);
                  const rowEnabled = i === 0 || !!employees[i - 1].name;
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-2 py-1 text-center text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 px-1 py-0.5">
                        {isSmpc && department ? (
                          <Select value={emp.name || '__none'} onValueChange={v => updateEmp(i, 'name', v === '__none' ? '' : v)} disabled={!area.trim() || !rowEnabled}>
                            <SelectTrigger className="text-xs h-7 border-0 shadow-none focus:ring-0 bg-transparent">
                              <SelectValue placeholder="เลือกชื่อ..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none"></SelectItem>
                              {rowAvailableSmpc.map(p => (
                                <SelectItem key={p.ID} value={p.Person_Name}>
                                  {p.Person_Name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : !isSmpc && company ? (
                          <Select value={emp.name || '__none'} onValueChange={v => selectContractorWorker(i, v === '__none' ? '' : v)} disabled={!area.trim() || !rowEnabled}>
                            <SelectTrigger className="text-xs h-7 border-0 shadow-none focus:ring-0 bg-transparent">
                              <SelectValue placeholder="เลือกชื่อ..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none"></SelectItem>
                              {rowAvailableCtr.map(c => (
                                <SelectItem key={c.ID} value={c.Worker_Name}>
                                  {c.Worker_Name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={emp.name} onChange={e => updateEmp(i, 'name', e.target.value)}
                            className="text-xs h-7 border-0 shadow-none bg-transparent focus-visible:ring-0 px-2"
                            placeholder={!area.trim() || !rowEnabled ? '' : 'ระบุชื่อ-สกุล...'}
                            disabled={!area.trim() || !rowEnabled} />
                        )}
                      </td>
                      <td className="border border-gray-200 px-1 py-0.5">
                        <Input value={emp.position} onChange={e => updateEmp(i, 'position', e.target.value)}
                          className="text-xs h-7 border-0 shadow-none bg-transparent focus-visible:ring-0 px-2"
                          placeholder={!area.trim() || !rowEnabled ? '' : 'ตำแหน่ง...'}
                          disabled={!area.trim() || !rowEnabled} />
                      </td>
                      <td className="border border-gray-200 px-1 py-0.5">
                        <Input value={emp.note} onChange={e => updateEmp(i, 'note', e.target.value)}
                          className="text-xs h-7 border-0 shadow-none bg-transparent focus-visible:ring-0 px-2 font-normal"
                          placeholder={!area.trim() || (!rowEnabled && i !== 0) ? '' : '...'}
                          disabled={!area.trim() || !rowEnabled}
                          maxLength={50} />
                        {area.trim() && rowEnabled && <p className="text-right text-[10px] text-gray-400 pr-1 leading-none pb-0.5">{emp.note.length}/50</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            ℹ️ คอลัมน์ เวลาเข้า / ลงชื่อเข้า / เวลาออก / ลงชื่อออก จะปรากฏในแบบฟอร์มพิมพ์ PDF เพื่อให้กรอกด้วยลายมือ
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
