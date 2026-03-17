'use client';
import { useState, useEffect, useCallback } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarIcon, Plus, X, Search, Pencil, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import CaptchaDialog from '@/components/CaptchaDialog';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Contractor {
  ID: number;
  Contractor: string;
  Worker_Name: string;
  Worker_Tel: string;
  Worker_Position: string;
  Training_status: string;
}

interface Personnel {
  ID: number;
  Department: string;
  Person_Name: string;
  Personnel_Position: string | null;
}

interface WorkPermit {
  Work_Permit_No: string;
  Created_Date: string;
  Contractor: string;
  Contractor_Tel: string;
  Foreman_Name: string;
  Request_For: string;
  Area: string;
  Start_Date: string;
  End_Date: string;
  Days: number;
  Workers: number;
  Department: string;
  Controller: string;
  Safety_Officer: string;
  Status: string;
  File_Path: string;
}

interface SelectedContractor {
  contractor: string;
  workerName: string;
  workerTel: string;
  trainingStatus: string;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    return format(d, 'EEE, dd/MM/yyyy', { locale: th });
  } catch { return dateStr; }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    return format(d, 'dd/MM/yyyy');
  } catch { return dateStr; }
}

function toISODate(date: Date | undefined): string {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

const CONTROLLER_POSITIONS = ['หัวหน้าแผนก/ส่วน', 'วิศวกร', 'ผู้บริหาร'];

const emptyForm = {
  Request_For: '',
  Area: '',
  Start_Date: '',
  End_Date: '',
  Days: 0,
  Workers: 1,
  Department: '',
  Controller: '',
};

export default function CreatePage() {
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);
  const filteredControllers = filteredPersonnel.filter(p => p.Personnel_Position && CONTROLLER_POSITIONS.includes(p.Personnel_Position));
  const [selectedContractors, setSelectedContractors] = useState<SelectedContractor[]>([]);
  const [selectedContractorCompany, setSelectedContractorCompany] = useState<string>('');
  const [selectedForemanId, setSelectedForemanId] = useState<string>('');
  const [form, setForm] = useState(emptyForm);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [searchQ, setSearchQ] = useState('');
  const [editingWP, setEditingWP] = useState<WorkPermit | null>(null);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<'save' | 'edit' | 'delete'>('save');
  const [pendingDeleteNo, setPendingDeleteNo] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const loadData = useCallback(async () => {
    const [cRes, pRes, wpRes, authRes] = await Promise.all([
      fetch('/api/contractor'),
      fetch('/api/personnel'),
      fetch('/api/workpermit?q=' + encodeURIComponent(searchQ)),
      fetch('/api/auth'),
    ]);
    const [c, p, wp, auth] = await Promise.all([cRes.json(), pRes.json(), wpRes.json(), authRes.json()]);
    setContractors(Array.isArray(c) ? c : []);
    setPersonnel(Array.isArray(p) ? p : []);
    setWorkPermits(Array.isArray(wp) ? wp : []);
    setIsAdmin(auth.isAdmin || false);
    const depts = Array.from(new Set((Array.isArray(p) ? p : []).map((x: Personnel) => x.Department))).sort();
    setDepartments(depts);
  }, [searchQ]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleAuthChange = () => { loadData(); };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, [loadData]);

  useEffect(() => {
    if (form.Department) {
      setFilteredPersonnel(personnel.filter(p => p.Department === form.Department));
    } else {
      setFilteredPersonnel([]);
    }
  }, [form.Department, personnel]);

  useEffect(() => {
    if (startDate && endDate) {
      const days = differenceInDays(endDate, startDate) + 1;
      setForm(f => ({ ...f, Days: days > 0 ? days : 0, Start_Date: toISODate(startDate), End_Date: toISODate(endDate) }));
    }
  }, [startDate, endDate]);

  const addContractor = () => {
    if (!selectedContractorCompany || !selectedForemanId) return;
    const c = contractors.find(x => x.ID === parseInt(selectedForemanId));
    if (!c) return;
    if (selectedContractors.find(s => s.contractor === c.Contractor && s.workerName === c.Worker_Name)) return;
    setSelectedContractors(prev => [...prev, { contractor: c.Contractor, workerName: c.Worker_Name, workerTel: c.Worker_Tel, trainingStatus: c.Training_status }]);
    setSelectedForemanId('');
  };

  const uniqueCompanies = Array.from(new Set(contractors.map(x => x.Contractor))).sort();
  const availableForemen = contractors.filter(x => x.Contractor === selectedContractorCompany && x.Worker_Position === 'Foreman');

  const removeContractor = (contractor: string, workerName: string) => {
    setSelectedContractors(prev => prev.filter(c => !(c.contractor === contractor && c.workerName === workerName)));
  };

  const buildContractorStr = () => selectedContractors.map(c => c.contractor).join(', ');
  const buildTelStr = () => selectedContractors.map(c => c.workerTel).join(', ');
  const buildForemanStr = () => selectedContractors.map(c => c.workerName).join(', ');

  const validateForm = (): string | null => {
    if (selectedContractors.length === 0) return 'กรุณาเลือกผู้รับเหมาอย่างน้อย 1 ราย';
    const expiredForeman = selectedContractors.find(c => c.trainingStatus === 'Expired');
    if (expiredForeman) return `Foreman "${expiredForeman.workerName}" มีสถานะ Expired กรุณาอัปเดตการฝึกอบรมก่อน`;
    if (!form.Request_For.trim()) return 'กรุณากรอก Request For';
    if (!form.Area.trim()) return 'กรุณากรอก Area';
    if (!form.Start_Date) return 'กรุณาเลือก Start Date';
    if (!form.End_Date) return 'กรุณาเลือก End Date';
    if (form.Workers < 1) return 'กรุณากรอกจำนวน Workers';
    if (!form.Department) return 'กรุณาเลือก Department';
    if (!form.Controller) return 'กรุณาเลือก Controller';
    return null;
  };

  const handleSaveClick = () => {
    const err = validateForm();
    if (err) { toast({ title: 'ข้อมูลไม่ครบถ้วน', description: err, variant: 'destructive' }); return; }
    setCaptchaAction(editingWP ? 'edit' : 'save');
    setCaptchaOpen(true);
  };

  const handleSaveConfirm = async () => {
    setCaptchaOpen(false);
    const payload = {
      ...form,
      Contractor: buildContractorStr(),
      Contractor_Tel: buildTelStr(),
      Foreman_Name: buildForemanStr(),
      ...(editingWP ? {
        Work_Permit_No: editingWP.Work_Permit_No,
        Safety_Officer: editingWP.Safety_Officer,
        Status: editingWP.Status,
        File_Path: editingWP.File_Path
      } : {}),
    };
    const method = editingWP ? 'PUT' : 'POST';
    const res = await fetch('/api/workpermit', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast({
        title: editingWP ? 'อัปเดตสำเร็จ' : 'บันทึกสำเร็จ',
        description: editingWP ? `อัปเดต ${editingWP.Work_Permit_No} แล้ว` : `สร้าง ${data.Work_Permit_No} แล้ว`,
      });
      resetForm();
      loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const handleEditWP = (wp: WorkPermit) => {
    setEditingWP(wp);
    const names = wp.Contractor?.split(', ') || [];
    const tels = wp.Contractor_Tel?.split(', ') || [];
    const foremans = wp.Foreman_Name?.split(', ') || [];
    const ctrs: SelectedContractor[] = names.map((name, i) => {
      const found = contractors.find(c => c.Contractor === name);
      return { contractor: name, workerName: foremans[i] || found?.Worker_Name || '', workerTel: tels[i] || found?.Worker_Tel || '', trainingStatus: found?.Training_status || '' };
    });
    setSelectedContractors(ctrs);
    const rawStart = wp.Start_Date?.split('T')[0] || '';
    const rawEnd = wp.End_Date?.split('T')[0] || '';
    setStartDate(rawStart ? parseISO(rawStart) : undefined);
    setEndDate(rawEnd ? parseISO(rawEnd) : undefined);
    setForm({
      Request_For: wp.Request_For,
      Area: wp.Area,
      Start_Date: rawStart,
      End_Date: rawEnd,
      Days: wp.Days,
      Workers: wp.Workers,
      Department: wp.Department,
      Controller: wp.Controller,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (wpNo: string) => {
    setPendingDeleteNo(wpNo);
    setCaptchaAction('delete');
    setCaptchaOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setCaptchaOpen(false);
    const res = await fetch('/api/workpermit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Work_Permit_No: pendingDeleteNo }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'ลบสำเร็จ', description: `ลบ ${pendingDeleteNo} แล้ว` });
      loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const handleCaptchaConfirm = () => {
    if (captchaAction === 'delete') handleDeleteConfirm();
    else handleSaveConfirm();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedContractors([]);
    setSelectedContractorCompany('');
    setSelectedForemanId('');
    setStartDate(undefined);
    setEndDate(undefined);
    setEditingWP(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1a3a5c]">
          {editingWP ? `แก้ไข Work Permit: ${editingWP.Work_Permit_No}` : 'CREATE NEW WORK PERMIT REQUEST'}
        </h1>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => window.open('/api/export?table=workpermit', '_blank')} className="gap-1">
            <Download size={14} /> Export Excel
          </Button>
        )}
      </div>

      <Card className="border-2 border-[#1a3a5c]/20">
        <CardHeader className="bg-[#1a3a5c] text-white rounded-t-lg py-3">
          <CardTitle className="text-base font-semibold flex items-center gap-1">
            ข้อมูล Work Permit
            {editingWP && <Badge variant="outline" className="text-white border-white text-xs">{editingWP.Work_Permit_No}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500 mb-1 block">Work Permit No. (สร้างอัตโนมัติ)</Label>
              <Input
                value={editingWP ? editingWP.Work_Permit_No : `W${new Date().getFullYear()}-XXXX`}
                disabled
                className="bg-gray-100 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-500 mb-1 block">Created Date</Label>
              <Input value={format(new Date(), 'dd/MM/yyyy')} disabled className="bg-gray-100 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              ผู้รับเหมา (Contractor) <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <p className="text-xs text-gray-500 mb-1">เลือกบริษัทผู้รับเหมา</p>
                <Select value={selectedContractorCompany} onValueChange={v => { setSelectedContractorCompany(v); setSelectedForemanId(''); }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="เลือกบริษัท..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCompanies.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">เลือก Foreman</p>
                <Select value={selectedForemanId} onValueChange={setSelectedForemanId} disabled={!selectedContractorCompany}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="เลือก Foreman..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForemen.map(f => (
                      <SelectItem key={f.ID} value={String(f.ID)}>
                        {f.Worker_Name} ({f.Worker_Tel}){f.Training_status === 'Expired' ? ' ⚠️ Expired' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={addContractor} size="sm" className="shrink-0 bg-[#1a3a5c] hover:bg-[#2a5a8c]" disabled={!selectedForemanId}>
                <Plus size={16} />
              </Button>
            </div>
            {selectedContractors.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-blue-50">
                {selectedContractors.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm border">
                    <div>
                      <span className="font-medium">{c.contractor}</span>
                      <span className="text-gray-500 ml-2">{c.workerName} | {c.workerTel}</span>
                      {c.trainingStatus === 'Expired' && <span className="ml-2 text-red-500 text-xs font-semibold">⚠️ Expired</span>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContractor(c.contractor, c.workerName)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Request For <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.Request_For}
                onChange={e => setForm(f => ({ ...f, Request_For: e.target.value }))}
                maxLength={200}
                placeholder="ระบุงานที่ขออนุญาต..."
                className="text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                Area <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.Area}
                onChange={e => setForm(f => ({ ...f, Area: e.target.value }))}
                maxLength={100}
                placeholder="พื้นที่ทำงาน..."
                className="text-sm mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Start Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full mt-1 text-sm justify-start', !startDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDateDisplay(toISODate(startDate)) : 'เลือกวันที่...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); if (endDate && d && endDate < d) { setEndDate(undefined); setForm(f => ({ ...f, End_Date: '', Days: 0 })); } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm font-medium">End Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full mt-1 text-sm justify-start', !endDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDateDisplay(toISODate(endDate)) : 'เลือกวันที่...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm font-medium">Days (คำนวณอัตโนมัติ)</Label>
              <Input
                value={form.Days > 0 ? `${form.Days} วัน` : '-'}
                disabled
                className="bg-gray-100 mt-1 text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Workers &lt;= <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={form.Workers}
                onChange={e => setForm(f => ({ ...f, Workers: Math.min(99, Math.max(1, parseInt(e.target.value) || 1)) }))}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">
                Department Requester <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.Department}
                onValueChange={v => setForm(f => ({ ...f, Department: v, Controller: '' }))}
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="เลือก Department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                Controller <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.Controller}
                onValueChange={v => setForm(f => ({ ...f, Controller: v }))}
                disabled={!form.Department}
              >
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue placeholder="เลือก Controller..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredControllers.map(p => (
                    <SelectItem key={p.ID} value={p.Person_Name}>
                      {p.Person_Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSaveClick}
              className="bg-[#1a3a5c] hover:bg-[#2a5a8c] text-white"
            >
              {editingWP ? 'อัปเดต' : 'บันทึก'} Work Permit
            </Button>
            {editingWP && (
              <Button variant="outline" onClick={resetForm}>ยกเลิกการแก้ไข</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 border-b">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base font-semibold text-[#1a3a5c]">รายการ Work Permit ทั้งหมด</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหา WP No., ผู้รับเหมา, วันที่..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-8 text-xs placeholder:text-xs w-72"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 text-xs">
                  <TableHead className="whitespace-nowrap">WP No.</TableHead>
                  <TableHead className="whitespace-nowrap">วันที่สร้าง</TableHead>
                  <TableHead>ผู้รับเหมา</TableHead>
                  <TableHead>Request For</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead className="whitespace-nowrap">Start Date</TableHead>
                  <TableHead className="whitespace-nowrap">End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Dept.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workPermits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-400 py-8 text-sm">
                      ไม่พบข้อมูล Work Permit
                    </TableCell>
                  </TableRow>
                ) : (
                  workPermits.map(wp => (
                    <TableRow key={wp.Work_Permit_No} className="text-xs hover:bg-blue-50">
                      <TableCell className="font-semibold text-[#1a3a5c] whitespace-nowrap">
                        {wp.Work_Permit_No}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateShort(wp.Created_Date)}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{wp.Contractor}</TableCell>
                      <TableCell className="max-w-[120px] truncate">{wp.Request_For}</TableCell>
                      <TableCell className="max-w-[80px] truncate">{wp.Area}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateDisplay(wp.Start_Date?.split('T')[0] || '')}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateDisplay(wp.End_Date?.split('T')[0] || '')}</TableCell>
                      <TableCell>{wp.Days}</TableCell>
                      <TableCell>{wp.Workers}</TableCell>
                      <TableCell>{wp.Department}</TableCell>
                      <TableCell><StatusBadge status={wp.Status} /></TableCell>
                      <TableCell>
                        {(() => {
                          const locked = wp.Status === 'Approved' || wp.Status === 'Completed';
                          const canAct = !locked || isAdmin;
                          return (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={"h-7 w-7 p-0 " + (canAct ? "text-blue-600 hover:text-blue-800" : "text-gray-300 cursor-not-allowed")}
                                onClick={() => canAct && handleEditWP(wp)}
                                disabled={!canAct}
                                title={!canAct ? "เฉพาะ Admin เท่านั้น (Status: " + wp.Status + ")" : ""}
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={"h-7 w-7 p-0 " + (canAct ? "text-red-500 hover:text-red-700" : "text-gray-300 cursor-not-allowed")}
                                onClick={() => canAct && handleDeleteClick(wp.Work_Permit_No)}
                                disabled={!canAct}
                                title={!canAct ? "เฉพาะ Admin เท่านั้น (Status: " + wp.Status + ")" : ""}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CaptchaDialog
        open={captchaOpen}
        title={
          captchaAction === 'delete'
            ? `ยืนยันการลบ ${pendingDeleteNo}`
            : captchaAction === 'edit'
            ? 'ยืนยันการอัปเดต Work Permit'
            : 'ยืนยันการบันทึก Work Permit'
        }
        onConfirm={handleCaptchaConfirm}
        onCancel={() => setCaptchaOpen(false)}
      />
    </div>
  );
}
