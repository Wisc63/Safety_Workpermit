'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Plus, Pencil, Trash2, Download, X, Check, Search, GraduationCap, Upload, CalendarIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import CaptchaDialog from '@/components/CaptchaDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Contractor {
  ID: number;
  Contractor: string;
  Worker_Name: string;
  Worker_Tel: string | null;
  Worker_Position: string;
  Training_date: string | null;
  Training_status: string | null;
}

interface TrainingRow {
  workerId: number | null;
  workerName: string;
  position: string;
  lastTraining: string | null;
  currentStatus: string;
}

const POSITIONS = ['Foreman', 'Worker', 'Unknown'];
const emptyForm = { Contractor: '', Worker_Name: '', Worker_Tel: '', Worker_Position: 'Unknown' };

function computeStatus(trainingDate: string | null): string {
  if (!trainingDate) return 'Expired';
  const today = new Date();
  const trained = new Date(trainingDate);
  const diff = differenceInDays(today, trained);
  return diff > 365 ? 'Expired' : 'Allowed';
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '-';
  try { return format(parseISO(dateStr), 'dd/MM/yyyy'); } catch { return dateStr; }
}

function StatusChip({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>;
  if (status === 'Expired')
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
        <AlertTriangle size={12} /> Expired
      </span>
    );
  return <span className="inline-flex items-center text-green-600 text-xs font-semibold">Allowed</span>;
}

export default function ContractorPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<'save' | 'delete' | 'training'>('save');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [filterNormal, setFilterNormal] = useState(true);
  const [filterExpired, setFilterExpired] = useState(true);

  const [trainingOpen, setTrainingOpen] = useState(false);
  const [trainingContractor, setTrainingContractor] = useState('');
  const [allWorkersForCompany, setAllWorkersForCompany] = useState<Contractor[]>([]);
  const [trainingRows, setTrainingRows] = useState<TrainingRow[]>([{ workerId: null, workerName: '', position: '', lastTraining: null, currentStatus: '' }]);
  const [trainingSearchTerms, setTrainingSearchTerms] = useState<string[]>(['']);
  const [trainingFilePath, setTrainingFilePath] = useState('');
  const [trainingFileName, setTrainingFileName] = useState('');
  const [trainingDate, setTrainingDate] = useState<Date | undefined>();
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const loadData = useCallback(async () => {
    const filters: string[] = [];
    if (filterNormal) filters.push('Normal');
    if (filterExpired) filters.push('Expired');
    const filterParam = filters.length < 2 ? `trainingFilter=${filters.join(',')}` : '';
    const [cRes, authRes] = await Promise.all([
      fetch(`/api/contractor?${filterParam}`),
      fetch('/api/auth'),
    ]);
    const [c, auth] = await Promise.all([cRes.json(), authRes.json()]);
    setContractors(Array.isArray(c) ? c : []);
    setIsAdmin(auth.isAdmin || false);
  }, [filterNormal, filterExpired]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = contractors.filter(c =>
    c.Contractor.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.Worker_Name.toLowerCase().includes(searchQ.toLowerCase())
  );

  const openAddForm = () => { setForm(emptyForm); setEditingId(null); setFormOpen(true); };
  const openEditForm = (c: Contractor) => {
    setForm({ Contractor: c.Contractor, Worker_Name: c.Worker_Name, Worker_Tel: c.Worker_Tel || '', Worker_Position: c.Worker_Position || 'Unknown' });
    setEditingId(c.ID);
    setFormOpen(true);
  };

  const handleSaveClick = () => {
    if (!form.Contractor.trim() || !form.Worker_Name.trim()) {
      toast({ title: 'กรุณากรอกข้อมูลให้ครบถ้วน', variant: 'destructive' }); return;
    }
    if (form.Worker_Tel && form.Worker_Tel.length !== 10) {
      toast({ title: 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก', variant: 'destructive' }); return;
    }
    setCaptchaAction('save'); setCaptchaOpen(true);
  };

  const handleSaveConfirm = async () => {
    setCaptchaOpen(false);
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { ...form, ID: editingId } : form;
    const res = await fetch('/api/contractor', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      toast({ title: editingId ? 'อัปเดตสำเร็จ' : 'เพิ่มสำเร็จ' });
      setFormOpen(false); loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (id: number) => { setPendingDeleteId(id); setCaptchaAction('delete'); setCaptchaOpen(true); };
  const handleDeleteConfirm = async () => {
    setCaptchaOpen(false);
    if (!pendingDeleteId) return;
    const res = await fetch('/api/contractor', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: pendingDeleteId }) });
    const data = await res.json();
    if (data.success) { toast({ title: 'ลบสำเร็จ' }); loadData(); }
    else toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
  };

  const handleCaptchaConfirm = () => {
    if (captchaAction === 'delete') handleDeleteConfirm();
    else if (captchaAction === 'training') handleTrainingSaveConfirm();
    else handleSaveConfirm();
  };

  const openTraining = () => {
    setTrainingContractor(''); setAllWorkersForCompany([]);
    setTrainingRows([{ workerId: null, workerName: '', position: '', lastTraining: null, currentStatus: '' }]);
    setTrainingSearchTerms(['']); setTrainingFilePath(''); setTrainingFileName('');
    setTrainingDate(undefined); setUploadDone(false); setTrainingOpen(true);
  };

  const handleTrainingContractorChange = async (company: string) => {
    setTrainingContractor(company);
    setTrainingRows([{ workerId: null, workerName: '', position: '', lastTraining: null, currentStatus: '' }]);
    setTrainingSearchTerms(['']);
    if (!company) { setAllWorkersForCompany([]); return; }
    const res = await fetch(`/api/training?contractor=${encodeURIComponent(company)}`);
    const data = await res.json();
    setAllWorkersForCompany(Array.isArray(data) ? data : []);
  };

  const getAvailableWorkersForRow = (rowIdx: number, searchTerm: string) => {
    const selectedIds = trainingRows.map((r, i) => i !== rowIdx ? r.workerId : null).filter(Boolean);
    return allWorkersForCompany.filter(w =>
      !selectedIds.includes(w.ID) &&
      w.Worker_Name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const selectWorkerForRow = (rowIdx: number, workerId: number) => {
    const worker = allWorkersForCompany.find(w => w.ID === workerId);
    if (!worker) return;
    const newRows = [...trainingRows];
    newRows[rowIdx] = { workerId: worker.ID, workerName: worker.Worker_Name, position: worker.Worker_Position, lastTraining: worker.Training_date, currentStatus: computeStatus(worker.Training_date) };
    setTrainingRows(newRows);
    const newTerms = [...trainingSearchTerms];
    newTerms[rowIdx] = worker.Worker_Name;
    setTrainingSearchTerms(newTerms);
  };

  const addTrainingRow = () => {
    setTrainingRows(prev => [...prev, { workerId: null, workerName: '', position: '', lastTraining: null, currentStatus: '' }]);
    setTrainingSearchTerms(prev => [...prev, '']);
  };

  const removeTrainingRow = (idx: number) => {
    if (trainingRows.length <= 1) return;
    setTrainingRows(prev => prev.filter((_, i) => i !== idx));
    setTrainingSearchTerms(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!trainingFileName.trim()) {
      toast({ title: 'กรุณากรอกชื่อไฟล์ก่อน', variant: 'destructive' }); return;
    }
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileName', trainingFileName.trim());
      const res = await fetch('/api/training-upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setTrainingFilePath(data.filePath); setUploadDone(true);
        toast({ title: 'อัปโหลดสำเร็จ', description: data.filePath });
      } else {
        toast({ title: 'อัปโหลดไม่สำเร็จ', description: data.error, variant: 'destructive' });
      }
    } finally { setUploadLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const computedNewStatus = trainingDate ? computeStatus(format(trainingDate, 'yyyy-MM-dd')) : '';

  const handleTrainingSaveClick = () => {
    if (!trainingContractor) { toast({ title: 'กรุณาเลือกบริษัทผู้รับเหมา', variant: 'destructive' }); return; }
    const validRows = trainingRows.filter(r => r.workerId !== null);
    if (validRows.length === 0) { toast({ title: 'กรุณาเลือกพนักงานอย่างน้อย 1 คน', variant: 'destructive' }); return; }
    if (!uploadDone) { toast({ title: 'กรุณาอัปโหลดหลักฐานการฝึกอบรมก่อน', variant: 'destructive' }); return; }
    if (!trainingDate) { toast({ title: 'กรุณาเลือกวันที่ทำการฝึกอบรม', variant: 'destructive' }); return; }
    setCaptchaAction('training'); setCaptchaOpen(true);
  };

  const handleTrainingSaveConfirm = async () => {
    setCaptchaOpen(false);
    const validRows = trainingRows.filter(r => r.workerId !== null);
    const workerIds = validRows.map(r => r.workerId as number);
    const trainingDateStr = format(trainingDate!, 'yyyy-MM-dd');
    const res = await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerIds, trainingDate: trainingDateStr }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: `บันทึกสำเร็จ ${data.count} คน` });
      setTrainingOpen(false); loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const uniqueCompanies = Array.from(new Set(contractors.map(c => c.Contractor))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-[#1a3a5c]">ตั้งค่าผู้รับเหมา (Contractor)</h1>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => window.open('/api/export?table=contractor', '_blank')} className="gap-1">
              <Download size={14} /> Export Excel
            </Button>
          )}
          <Button
            size="sm" onClick={openTraining} disabled={!isAdmin}
            className={cn('gap-1', isAdmin ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'opacity-40 cursor-not-allowed bg-emerald-600 text-white')}
            title={!isAdmin ? 'เฉพาะ Admin เท่านั้น' : ''}
          >
            <GraduationCap size={14} /> จัดการฝึกอบรม
          </Button>
          <Button size="sm" onClick={openAddForm} className="bg-[#1a3a5c] hover:bg-[#2a5a8c] gap-1">
            <Plus size={14} /> เพิ่มผู้รับเหมา
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-[#1a3a5c]">รายการผู้รับเหมาทั้งหมด ({filtered.length} ราย)</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 font-medium">สถานะ:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox checked={filterNormal} onCheckedChange={v => setFilterNormal(!!v)} />
                  <span className="text-green-600">Normal</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <Checkbox checked={filterExpired} onCheckedChange={v => setFilterExpired(!!v)} />
                  <span className="text-red-600">Expired</span>
                </label>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  placeholder="ค้นหาบริษัท หรือ ชื่อพนักงาน..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border rounded-md w-60 focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 text-xs">
                  <TableHead>#</TableHead>
                  <TableHead>ชื่อบริษัท (Contractor)</TableHead>
                  <TableHead>พนักงานรับเหมา</TableHead>
                  <TableHead>ตำแหน่งงาน</TableHead>
                  <TableHead>เบอร์โทร (Tel)</TableHead>
                  <TableHead>วันที่ฝึกอบรมล่าสุด</TableHead>
                  <TableHead>สถานะการฝึกอบรม</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-8 text-sm">ยังไม่มีข้อมูลผู้รับเหมา</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c, i) => (
                    <TableRow key={c.ID} className="text-sm hover:bg-gray-50">
                      <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">{c.Contractor}</TableCell>
                      <TableCell>{c.Worker_Name}</TableCell>
                      <TableCell>
                        <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                          c.Worker_Position === 'Foreman' ? 'bg-blue-100 text-blue-700' :
                          c.Worker_Position === 'Worker' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-50 text-yellow-700'
                        )}>
                          {c.Worker_Position || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{c.Worker_Tel || '-'}</TableCell>
                      <TableCell className="text-xs">{formatDateDisplay(c.Training_date)}</TableCell>
                      <TableCell><StatusChip status={c.Training_status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600" onClick={() => openEditForm(c)}><Pencil size={13} /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteClick(c.ID)}><Trash2 size={13} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'แก้ไขผู้รับเหมา' : 'เพิ่มผู้รับเหมา'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">ชื่อบริษัทผู้รับเหมา (Contractor) <span className="text-red-500">*</span></Label>
              <Input value={form.Contractor} onChange={e => setForm(f => ({ ...f, Contractor: e.target.value }))} maxLength={50} placeholder="ชื่อบริษัทผู้รับเหมา..." className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-sm">ชื่อพนักงาน (Worker Name) <span className="text-red-500">*</span></Label>
              <Input value={form.Worker_Name} onChange={e => setForm(f => ({ ...f, Worker_Name: e.target.value }))} maxLength={100} placeholder="ชื่อพนักงานผู้รับเหมา..." className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-sm">ตำแหน่งงาน <span className="text-red-500">*</span></Label>
              <Select value={form.Worker_Position} onValueChange={v => setForm(f => ({ ...f, Worker_Position: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">เบอร์โทรศัพท์ (Tel)</Label>
              <Input
                value={form.Worker_Tel}
                onChange={e => setForm(f => ({ ...f, Worker_Tel: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                maxLength={10} placeholder="ตัวเลข 10 หลัก (ไม่บังคับ)" className="mt-1 text-sm font-mono" inputMode="numeric"
              />
              <p className={`text-xs mt-1 ${form.Worker_Tel.length === 10 ? 'text-green-500' : form.Worker_Tel.length > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                {form.Worker_Tel.length > 0 ? `${form.Worker_Tel.length}/10 หลัก` : 'ไม่บังคับ'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}><X size={14} className="mr-1" /> ยกเลิก</Button>
            <Button onClick={handleSaveClick} className="bg-[#1a3a5c] hover:bg-[#2a5a8c]"><Check size={14} className="mr-1" /> บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Management Dialog */}
      <Dialog open={trainingOpen} onOpenChange={setTrainingOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap size={18} className="text-emerald-600" /> จัดการการฝึกอบรม
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">บริษัทผู้รับเหมา <span className="text-red-500">*</span></Label>
              <Select value={trainingContractor} onValueChange={handleTrainingContractorChange}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="เลือกบริษัท..." /></SelectTrigger>
                <SelectContent>{uniqueCompanies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {trainingContractor && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">พนักงานรับเหมา <span className="text-red-500">*</span></Label>
                  <Button type="button" size="sm" variant="outline" onClick={addTrainingRow} className="gap-1 text-xs h-7">
                    <Plus size={12} /> เพิ่มพนักงาน
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 w-[35%]">ชื่อพนักงาน</th>
                        <th className="text-left px-3 py-2 w-[20%]">ตำแหน่ง</th>
                        <th className="text-left px-3 py-2 w-[20%]">ฝึกล่าสุด</th>
                        <th className="text-left px-3 py-2 w-[15%]">สถานะเดิม</th>
                        <th className="px-2 py-2 w-[10%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingRows.map((row, idx) => {
                        const available = getAvailableWorkersForRow(idx, trainingSearchTerms[idx]);
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={trainingSearchTerms[idx]}
                                  onChange={e => {
                                    const terms = [...trainingSearchTerms]; terms[idx] = e.target.value;
                                    setTrainingSearchTerms(terms);
                                    if (!e.target.value) {
                                      const rows = [...trainingRows];
                                      rows[idx] = { workerId: null, workerName: '', position: '', lastTraining: null, currentStatus: '' };
                                      setTrainingRows(rows);
                                    }
                                  }}
                                  placeholder="ค้นหาชื่อพนักงาน..."
                                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                {trainingSearchTerms[idx] && !row.workerId && available.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded shadow-lg max-h-32 overflow-y-auto">
                                    {available.map(w => (
                                      <button key={w.ID} type="button" onClick={() => selectWorkerForRow(idx, w.ID)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-xs border-b last:border-b-0">
                                        {w.Worker_Name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1 text-gray-600">{row.position || '-'}</td>
                            <td className="px-3 py-1 text-gray-600">{formatDateDisplay(row.lastTraining)}</td>
                            <td className="px-3 py-1"><StatusChip status={row.currentStatus || null} /></td>
                            <td className="px-2 py-1 text-center">
                              {trainingRows.length > 1 && (
                                <button type="button" onClick={() => removeTrainingRow(idx)} className="text-red-400 hover:text-red-600">
                                  <X size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
              <Label className="text-sm font-medium">หลักฐานการฝึกอบรม (PDF)</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">ชื่อไฟล์ (สามารถแก้ไขได้)</p>
                  <Input value={trainingFileName} onChange={e => setTrainingFileName(e.target.value)} maxLength={50} placeholder="ชื่อไฟล์ PDF..." className="text-sm" />
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploadLoading || !trainingFileName.trim()} onClick={() => fileInputRef.current?.click()} className="gap-1">
                    <Upload size={14} /> {uploadLoading ? 'กำลังอัปโหลด...' : '+ หลักฐาน'}
                  </Button>
                </div>
              </div>
              {trainingFilePath && (
                <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1 break-all">
                  ✓ {trainingFilePath}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">วันที่ทำการฝึกอบรม <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={!uploadDone} className={cn('w-full mt-1 text-sm justify-start', !trainingDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {trainingDate ? format(trainingDate, 'dd/MM/yyyy') : (uploadDone ? 'เลือกวันที่...' : 'อัปโหลดหลักฐานก่อน')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={trainingDate} onSelect={setTrainingDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-medium">สถานะการฝึกอบรม (ใหม่)</Label>
                <div className="mt-2 px-3 py-2 border rounded-md bg-white">
                  {computedNewStatus ? <StatusChip status={computedNewStatus} /> : <span className="text-xs text-gray-400">-</span>}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingOpen(false)}><X size={14} className="mr-1" /> ยกเลิก</Button>
            <Button onClick={handleTrainingSaveClick} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check size={14} className="mr-1" /> บันทึกการฝึกอบรม
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CaptchaDialog
        open={captchaOpen}
        title={captchaAction === 'delete' ? 'ยืนยันการลบผู้รับเหมา' : captchaAction === 'training' ? 'ยืนยันการบันทึกการฝึกอบรม' : editingId ? 'ยืนยันการแก้ไขผู้รับเหมา' : 'ยืนยันการเพิ่มผู้รับเหมา'}
        onConfirm={handleCaptchaConfirm}
        onCancel={() => setCaptchaOpen(false)}
      />
    </div>
  );
}
