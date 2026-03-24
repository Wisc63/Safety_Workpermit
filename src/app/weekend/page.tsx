'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Printer, Trash2, AlertCircle, CalendarIcon, Save, Pencil, Search, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CaptchaDialog from '@/components/CaptchaDialog';
import { useToast } from '@/hooks/use-toast';

const SMPC = 'บริษัทสหมิตรถังแก๊ส จำกัด (มหาชน)';
const CONTROLLER_POSITIONS = ['หัวหน้าแผนก/ส่วน', 'วิศวกร', 'ผู้บริหาร'];

interface PersonnelItem {
  ID: number;
  Department: string;
  Person_Name: string;
  Personnel_Tel: string | null;
  Personnel_Position: string | null;
}
interface ContractorItem { ID: number; Contractor: string; Worker_Name: string; Worker_Position: string; }
interface WPItem { Work_Permit_No: string; Contractor: string; Foreman_Name: string; Contractor_Tel: string; }
interface Employee { name: string; position: string; note: string; }
interface WeekendRecord {
  ID: number;
  Created_Date: string;
  Work_Date: string;
  Department: string;
  Controller: string;
  Controller_Tel: string | null;
  Job_Detail: string;
  Area: string;
  WP_No: string | null;
  Contractor_Company: string | null;
  Foreman_Name: string | null;
  Contractor_Tel: string | null;
  Employees: string | null;
}

const makeEmps = (): Employee[] => Array.from({ length: 15 }, () => ({ name: '', position: '', note: '' }));

function FieldError({ show, msg }: { show: boolean; msg: string }) {
  if (!show) return null;
  return <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertCircle size={11} />{msg}</p>;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return '-';
  try { return format(new Date(dateStr.split('T')[0] + 'T00:00:00'), 'dd/MM/yyyy', { locale: th }); } catch { return dateStr; }
}

export default function WeekendPage() {
  const { toast } = useToast();
  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [workPermits, setWorkPermits] = useState<WPItem[]>([]);
  const [workDate, setWorkDate] = useState('');
  const [department, setDepartment] = useState('');
  const [controller, setController] = useState('');
  const [controllerTel, setControllerTel] = useState('');
  const [jobDetail, setJobDetail] = useState('');
  const [area, setArea] = useState('');
  const [wpNo, setWpNo] = useState('');
  const [ctrCompany, setCtrCompany] = useState('');
  const [foremanName, setForemanName] = useState('');
  const [ctrTel, setCtrTel] = useState('');
  const [employees, setEmployees] = useState<Employee[]>(makeEmps());
  const [printing, setPrinting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<'save' | 'delete'>('save');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [history, setHistory] = useState<WeekendRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchWorkDate, setSearchWorkDate] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchController, setSearchController] = useState('');
  const [searchWpNo, setSearchWpNo] = useState('');

  const loadHistory = useCallback(async (wd = '', dp = '', ct = '', wp = '') => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (wd) params.set('work_date', wd);
      if (dp) params.set('department', dp);
      if (ct) params.set('controller', ct);
      if (wp) params.set('wp_no', wp);
      const res = await fetch('/api/weekend-request?' + params.toString());
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
    setHistoryLoading(false);
  }, []);

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
    loadHistory();
  }, [loadHistory]);

  const departments = [...new Set(personnel.map(p => p.Department).filter(Boolean))].sort() as string[];
  const filteredPersonnel = personnel.filter(p => p.Department === department);
  const filteredControllers = filteredPersonnel.filter(p =>
    p.Personnel_Position && CONTROLLER_POSITIONS.includes(p.Personnel_Position)
  );
  const filteredContractorWorkers = contractors.filter(c =>
    c.Contractor.trim().toLowerCase() === ctrCompany.trim().toLowerCase()
  );
  const selectedNames = new Set(employees.filter(e => e.name).map(e => e.name));

  const isValid = !!(workDate && department && controller && jobDetail.trim() && area.trim());

  const handleWorkDateChange = (d: Date | undefined) => {
    setWorkDate(d ? format(d, 'yyyy-MM-dd') : '');
    setDepartment(''); setController(''); setControllerTel('');
    setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleDeptChange = (val: string) => {
    setDepartment(val === '__none' ? '' : val);
    setController(''); setControllerTel(''); setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleControllerChange = (val: string) => {
    const name = val === '__none' ? '' : val;
    setController(name);
    const person = personnel.find(p => p.Person_Name === name);
    setControllerTel(person?.Personnel_Tel || '');
    setJobDetail(''); setArea(''); setEmployees(makeEmps());
  };
  const handleWPChange = (val: string) => {
    const id = val === '__none' ? '' : val;
    setWpNo(id);
    const wp = workPermits.find(w => w.Work_Permit_No === id);
    setCtrCompany(wp?.Contractor?.split(', ')[0] || '');
    setForemanName(wp?.Foreman_Name?.split(', ')[0] || '');
    setCtrTel(wp?.Contractor_Tel?.split(', ')[0] || '');
    setEmployees(makeEmps());
  };
  const updateEmp = (i: number, field: keyof Employee, val: string) =>
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const selectPersonnelForRow = (i: number, name: string) => {
    const person = filteredPersonnel.find(p => p.Person_Name === name);
    setEmployees(prev => prev.map((e, idx) => idx === i
      ? { ...e, name: name, position: person?.Personnel_Position || '' } : e));
  };
  const selectContractorForRow = (i: number, workerName: string) => {
    const worker = filteredContractorWorkers.find(c => c.Worker_Name === workerName);
    setEmployees(prev => prev.map((e, idx) => idx === i
      ? { ...e, name: workerName, position: worker?.Worker_Position || '' } : e));
  };

  const handleClear = () => {
    setWorkDate(''); setDepartment(''); setController(''); setControllerTel('');
    setJobDetail(''); setArea(''); setWpNo('');
    setCtrCompany(''); setForemanName(''); setCtrTel('');
    setEmployees(makeEmps());
    setShowErrors(false);
    setEditingId(null);
  };

  const handleSaveClick = () => {
    if (!isValid) { setShowErrors(true); return; }
    setCaptchaAction('save');
    setCaptchaOpen(true);
  };

  const handleSaveConfirm = async () => {
    setCaptchaOpen(false);
    setSaving(true);
    try {
      const body = {
        workDate, department, controller, controllerTel, jobDetail, area,
        wpNo, contractorCompany: ctrCompany, foremanName, contractorTel: ctrTel, employees,
      };
      const res = editingId != null
        ? await fetch('/api/weekend-request', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...body }) })
        : await fetch('/api/weekend-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: editingId != null ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ' });
      handleClear();
      loadHistory();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'กรุณาลองใหม่', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleEditRecord = (rec: WeekendRecord) => {
    const dateStr = rec.Work_Date ? rec.Work_Date.split('T')[0] : '';
    setWorkDate(dateStr);
    setDepartment(rec.Department);
    setController(rec.Controller);
    setControllerTel(rec.Controller_Tel || '');
    setJobDetail(rec.Job_Detail);
    setArea(rec.Area);
    setWpNo(rec.WP_No || '');
    setCtrCompany(rec.Contractor_Company || '');
    setForemanName(rec.Foreman_Name || '');
    setCtrTel(rec.Contractor_Tel || '');
    const loadedEmps: Employee[] = rec.Employees ? JSON.parse(rec.Employees) : [];
    setEmployees(Array.from({ length: 15 }, (_, i) => loadedEmps[i] || { name: '', position: '', note: '' }));
    setEditingId(rec.ID);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: number) => {
    setPendingDeleteId(id);
    setCaptchaAction('delete');
    setCaptchaOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setCaptchaOpen(false);
    if (pendingDeleteId == null) return;
    try {
      const res = await fetch('/api/weekend-request', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pendingDeleteId }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: 'ลบข้อมูลสำเร็จ' });
      if (editingId === pendingDeleteId) handleClear();
      loadHistory();
    } catch (err) {
      toast({ title: 'เกิดข้อผิดพลาด', description: err instanceof Error ? err.message : 'กรุณาลองใหม่', variant: 'destructive' });
    } finally { setPendingDeleteId(null); }
  };

  const handleCaptchaConfirm = () => {
    if (captchaAction === 'save') handleSaveConfirm();
    else handleDeleteConfirm();
  };

  const openPrint = async () => {
    setShowErrors(true);
    if (!isValid) return;
    setPrinting(true);
    try {
      const body = {
        company: SMPC, workDate, department, controller, controllerTel, jobDetail, area,
        workPermitNo: wpNo, contractorCompany: ctrCompany, foremanName, contractorTel: ctrTel, employees,
      };
      const res = await fetch('/api/weekend-print', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const html = await res.text();
      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    } finally { setPrinting(false); }
  };

  const handleSearch = () => loadHistory(searchWorkDate, searchDept, searchController, searchWpNo);
  const handleClearSearch = () => {
    setSearchWorkDate(''); setSearchDept(''); setSearchController(''); setSearchWpNo('');
    loadHistory();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-4">

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a3a5c]">Weekend Request</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {editingId != null
              ? <span className="text-orange-600 font-semibold">โหมดแก้ไข (#{editingId})</span>
              : 'แบบฟอร์มแจ้งรายชื่อเข้าทำงานวันหยุด'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {editingId != null && (
            <Button variant="outline" className="text-xs h-8 gap-1 text-gray-500 border-gray-300 hover:bg-gray-50" onClick={handleClear}>
              <X size={13} /> ยกเลิกแก้ไข
            </Button>
          )}
          <Button variant="outline" className="text-xs h-8 gap-1 text-red-500 border-red-200 hover:bg-red-50" onClick={handleClear}>
            <Trash2 size={13} /> ล้างข้อมูล
          </Button>
          <Button
            className="text-xs h-8 gap-1 bg-green-700 hover:bg-green-800 text-white"
            onClick={handleSaveClick}
            disabled={saving}
          >
            <Save size={13} /> {saving ? 'กำลังบันทึก...' : editingId != null ? 'อัปเดต' : 'บันทึก'}
          </Button>
          <Button className="text-xs h-8 gap-1 bg-[#1a3a5c] hover:bg-[#2a5a8c] text-white" onClick={openPrint} disabled={printing}>
            <Printer size={13} /> {printing ? 'กำลังโหลด...' : 'พิมพ์ PDF'}
          </Button>
        </div>
      </div>

      {showErrors && !isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">กรุณากรอกข้อมูลที่จำเป็นทุกช่อง (*) ก่อนดำเนินการ</p>
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
              <Label className="text-xs font-semibold">วันที่เข้ามาปฏิบัติงาน <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-xs h-8 font-normal ${showErrors && !workDate ? 'border-red-400' : ''} ${!workDate ? 'text-muted-foreground' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {workDate ? format(new Date(workDate + 'T00:00:00'), 'EEE, dd/MM/yyyy', { locale: th }) : '-- เลือกวันที่เข้ามาปฏิบัติงาน --'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={workDate ? new Date(workDate + 'T00:00:00') : undefined} onSelect={handleWorkDateChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FieldError show={showErrors && !workDate} msg="กรุณาเลือกวันที่" />
            </div>
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ชื่อ ผู้ควบคุมงาน <span className="text-red-500">*</span></Label>
              <Select value={controller || '__none'} onValueChange={handleControllerChange} disabled={!department}>
                <SelectTrigger className={`text-xs h-8 ${showErrors && !controller ? 'border-red-400' : ''}`}>
                  <SelectValue placeholder="เลือกผู้ควบคุมงาน..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— เลือกผู้ควบคุมงาน —</SelectItem>
                  {filteredControllers.map(p => (
                    <SelectItem key={p.ID} value={p.Person_Name}>
                      {p.Person_Name} <span className="text-gray-400">({p.Personnel_Position})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError show={showErrors && !controller} msg="กรุณาเลือกผู้ควบคุมงาน" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">หมายเลขโทรศัพท์ผู้ควบคุมงาน</Label>
              <Input value={controllerTel} readOnly className="text-xs h-8 bg-gray-50 font-mono" placeholder="-" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">งานที่เข้าทำ <span className="text-red-500">*</span></Label>
            <Input value={jobDetail} onChange={e => setJobDetail(e.target.value)}
              placeholder="ระบุงานที่เข้าทำ..." disabled={!controller}
              className={`text-xs h-8 ${showErrors && !jobDetail.trim() ? 'border-red-400' : ''}`} />
            <FieldError show={showErrors && !jobDetail.trim()} msg="กรุณาระบุงานที่เข้าทำ" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">พื้นที่ปฎิบัติงาน <span className="text-red-500">*</span></Label>
            <Input value={area} onChange={e => setArea(e.target.value)}
              placeholder="ระบุพื้นที่ปฎิบัติงาน..." disabled={!jobDetail.trim()}
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
            {wpNo && ctrCompany
              ? <span className="text-xs font-normal text-orange-500 bg-orange-50 px-2 py-0.5 rounded">ผู้รับเหมา: {ctrCompany}</span>
              : department && <span className="text-xs font-normal text-blue-500 bg-blue-50 px-2 py-0.5 rounded">หน่วยงาน {department}</span>
            }
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
                  const rowAvailablePersonnel = filteredPersonnel.filter(p => !selectedNames.has(p.Person_Name) || emp.name === p.Person_Name);
                  const rowAvailableContractor = filteredContractorWorkers.filter(c => !selectedNames.has(c.Worker_Name) || emp.name === c.Worker_Name);
                  const rowEnabled = i === 0 || !!employees[i - 1].name;
                  const useContractor = !!(wpNo && ctrCompany);
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-2 py-1 text-center text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 px-1 py-0.5">
                        {useContractor ? (
                          <Select value={emp.name || '__none'} onValueChange={v => selectContractorForRow(i, v === '__none' ? '' : v)} disabled={!area.trim() || !rowEnabled}>
                            <SelectTrigger className="text-xs h-7 border-0 shadow-none focus:ring-0 bg-transparent">
                              <SelectValue placeholder="เลือกชื่อ..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none"></SelectItem>
                              {rowAvailableContractor.map(c => (
                                <SelectItem key={c.ID} value={c.Worker_Name}>{c.Worker_Name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : department ? (
                          <Select value={emp.name || '__none'} onValueChange={v => selectPersonnelForRow(i, v === '__none' ? '' : v)} disabled={!area.trim() || !rowEnabled}>
                            <SelectTrigger className="text-xs h-7 border-0 shadow-none focus:ring-0 bg-transparent">
                              <SelectValue placeholder="เลือกชื่อ..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none"></SelectItem>
                              {rowAvailablePersonnel.map(p => (
                                <SelectItem key={p.ID} value={p.Person_Name}>{p.Person_Name}</SelectItem>
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
                          className="!text-xs h-7 border-0 shadow-none bg-transparent focus-visible:ring-0 px-2"
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

      {/* Card 4: History */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-gray-700">ประวัติการบันทึกข้อมูล</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">วันที่เข้าทำงาน</Label>
              <Input value={searchWorkDate} onChange={e => setSearchWorkDate(e.target.value)}
                placeholder="เช่น 2026-03" className="text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">หน่วยงาน</Label>
              <Input value={searchDept} onChange={e => setSearchDept(e.target.value)}
                placeholder="ค้นหาหน่วยงาน..." className="text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">ชื่อผู้ควบคุมงาน</Label>
              <Input value={searchController} onChange={e => setSearchController(e.target.value)}
                placeholder="ค้นหาผู้ควบคุมงาน..." className="text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Work Permit No.</Label>
              <Input value={searchWpNo} onChange={e => setSearchWpNo(e.target.value)}
                placeholder="เช่น W2026-..." className="text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-8 gap-1 bg-[#1a3a5c] hover:bg-[#2a5a8c] text-white" onClick={handleSearch} disabled={historyLoading}>
              <Search size={12} /> ค้นหา
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={handleClearSearch} disabled={historyLoading}>
              <X size={12} /> ล้างการค้นหา
            </Button>
          </div>
          {historyLoading ? (
            <p className="text-xs text-gray-400 text-center py-4">กำลังโหลด...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">ไม่พบข้อมูล</p>
          ) : (
            <div className="overflow-x-auto rounded border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 text-xs">
                    <TableHead className="text-xs py-2 w-[100px]">วันที่เข้าทำงาน</TableHead>
                    <TableHead className="text-xs py-2 w-[60px]">หน่วยงาน</TableHead>
                    <TableHead className="text-xs py-2 w-[130px]">ผู้ควบคุมงาน</TableHead>
                    <TableHead className="text-xs py-2">งานที่เข้าทำ</TableHead>
                    <TableHead className="text-xs py-2 w-[120px]">พื้นที่ปฏิบัติงาน</TableHead>
                    <TableHead className="text-xs py-2 w-[100px]">Work Permit No.</TableHead>
                    <TableHead className="text-xs py-2 w-[80px] text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(rec => (
                    <TableRow key={rec.ID} className={`text-xs ${editingId === rec.ID ? 'bg-orange-50 border-l-2 border-orange-400' : ''}`}>
                      <TableCell className="py-1.5 font-mono text-xs">{fmtDate(rec.Work_Date)}</TableCell>
                      <TableCell className="py-1.5">{rec.Department}</TableCell>
                      <TableCell className="py-1.5">{rec.Controller}</TableCell>
                      <TableCell className="py-1.5">{rec.Job_Detail}</TableCell>
                      <TableCell className="py-1.5">{rec.Area}</TableCell>
                      <TableCell className="py-1.5 font-mono text-xs">{rec.WP_No || '-'}</TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="outline"
                            className="h-6 w-6 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEditRecord(rec)} title="แก้ไข">
                            <Pencil size={11} />
                          </Button>
                          <Button size="sm" variant="outline"
                            className="h-6 w-6 p-0 border-red-200 text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteClick(rec.ID)} title="ลบ">
                            <Trash2 size={11} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CaptchaDialog
        open={captchaOpen}
        title={
          captchaAction === 'delete'
            ? 'ยืนยันการลบข้อมูล'
            : editingId != null
              ? 'ยืนยันการแก้ไขข้อมูล'
              : 'ยืนยันการบันทึกข้อมูล'
        }
        onConfirm={handleCaptchaConfirm}
        onCancel={() => { setCaptchaOpen(false); setPendingDeleteId(null); }}
      />

    </div>
  );
}
