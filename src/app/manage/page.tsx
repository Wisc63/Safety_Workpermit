'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { Search, Upload, Printer, Download, FileText, CheckCircle2, Clock, CheckCheck, AlertTriangle, CalendarIcon, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import CaptchaDialog from '@/components/CaptchaDialog';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';

interface WorkPermit {
  Work_Permit_No: string;
  Created_Date: string;
  Contractor: string;
  Contractor_Tel: string;
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
  Extension_Count: number;
}

interface Personnel {
  ID: number;
  Department: string;
  Person_Name: string;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr.split('T')[0]);
    return format(d, 'EEE, dd/MM/yyyy', { locale: th });
  } catch { return dateStr; }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr.split('T')[0]);
    return format(d, 'dd/MM/yyyy');
  } catch { return dateStr; }
}

const STATUS_OPTIONS = ['Open', 'Approved', 'Completed', 'Expired'];

function getDisplayStatus(wp: { Status: string; End_Date: string }): string {
  if (wp.Status === 'Completed') return 'Completed';
  if ((wp.Status === 'Open' || wp.Status === 'Approved') && wp.End_Date) {
    const end = new Date(wp.End_Date.split('T')[0]);
    end.setHours(23, 59, 59, 999);
    if (end < new Date()) return 'Expired';
  }
  return wp.Status;
}

export default function ManagePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>([]);
  const [shePersonnel, setShePersonnel] = useState<Personnel[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedWP, setSelectedWP] = useState<WorkPermit | null>(null);
  const [safetyOfficer, setSafetyOfficer] = useState('');
  
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<'approve' | 'complete' | 'save' | 'extend'>('save');
  const [uploading, setUploading] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendEndDate, setExtendEndDate] = useState<Date | undefined>();

  const loadData = useCallback(async () => {
    const apiStatuses = statusFilter.flatMap(s => s === 'Expired' ? ['Open', 'Approved'] : [s]);
    const uniqueStatuses = Array.from(new Set(apiStatuses));
    const statusParam = uniqueStatuses.length > 0 ? uniqueStatuses.join(',') : '';
    const [wpRes, pRes, authRes] = await Promise.all([
      fetch(`/api/workpermit?q=${encodeURIComponent(searchQ)}&status=${encodeURIComponent(statusParam)}`),
      fetch('/api/personnel?department=SHE'),
      fetch('/api/auth'),
    ]);
    const [wp, p, auth] = await Promise.all([wpRes.json(), pRes.json(), authRes.json()]);
    const allWp = Array.isArray(wp) ? wp : [];
    // Client-side filter for Expired
    const filtered = statusFilter.length === 0 ? allWp : allWp.filter(w => {
      const ds = getDisplayStatus(w);
      return statusFilter.includes(ds);
    });
    setWorkPermits(filtered);
    setShePersonnel(Array.isArray(p) ? p : []);
    setIsAdmin(auth.isAdmin || false);
  }, [searchQ, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleAuthChange = () => { loadData(); };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, [loadData]);

  const toggleStatus = (s: string) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSelectWP = (wp: WorkPermit) => {
    setSelectedWP(wp);
    setSafetyOfficer(wp.Safety_Officer || '');
    
  };

  const handleApproveClick = () => {
    if (!safetyOfficer) {
      toast({ title: 'กรุณาเลือก Safety Officer', variant: 'destructive' });
      return;
    }
    setCaptchaAction('approve');
    setCaptchaOpen(true);
  };

  const handleCompleteClick = () => {
    if (!selectedWP?.File_Path) {
      toast({ title: 'กรุณา Upload ไฟล์ก่อน', description: 'ต้อง Upload PDF ก่อนเปลี่ยนสถานะเป็น Completed', variant: 'destructive' });
      return;
    }
    setCaptchaAction('complete');
    setCaptchaOpen(true);
  };

  const handleSaveClick = () => {
    setCaptchaAction('save');
    setCaptchaOpen(true);
  };

  const handleExtendClick = () => {
    if (!selectedWP) return;
    const count = selectedWP.Extension_Count || 0;
    if (count >= 2) {
      toast({ title: 'ไม่สามารถขยายเวลาได้', description: 'ขยายเวลาครบ 2 ครั้งแล้ว', variant: 'destructive' });
      return;
    }
    setExtendEndDate(undefined);
    setExtendOpen(true);
  };

  const handleExtendSave = () => {
    if (!extendEndDate) {
      toast({ title: 'กรุณาเลือก End Date ใหม่', variant: 'destructive' });
      return;
    }
    setCaptchaAction('extend');
    setExtendOpen(false);
    setCaptchaOpen(true);
  };

  const handleCaptchaConfirm = async () => {
    setCaptchaOpen(false);
    if (!selectedWP) return;
    if (captchaAction === 'extend' && extendEndDate && selectedWP) {
      const newEndDate = format(extendEndDate, 'yyyy-MM-dd');
      const startD = new Date(selectedWP.Start_Date.split('T')[0]);
      const newDays = differenceInDays(extendEndDate, startD) + 1;
      const newCount = (selectedWP.Extension_Count || 0) + 1;
      const payload = {
        ...selectedWP,
        Safety_Officer: safetyOfficer,
        Start_Date: selectedWP.Start_Date?.split('T')[0],
        End_Date: newEndDate,
        Days: newDays,
        Extension_Count: newCount,
      };
      const res = await fetch('/api/workpermit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'ขยายเวลาสำเร็จ', description: `ขยายถึง ${format(extendEndDate, 'dd/MM/yyyy')} (ครั้งที่ ${newCount}/2)` });
        setSelectedWP(prev => prev ? { ...prev, End_Date: newEndDate, Days: newDays, Extension_Count: newCount } : null);
        loadData();
      } else {
        toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
      }
      return;
    }

    let newStatus = selectedWP.Status;
    if (captchaAction === 'approve') newStatus = 'Approved';
    else if (captchaAction === 'complete') newStatus = 'Completed';

    const payload = {
      ...selectedWP,
      Safety_Officer: safetyOfficer,
      Status: newStatus,
      Start_Date: selectedWP.Start_Date?.split('T')[0],
      End_Date: selectedWP.End_Date?.split('T')[0],
    };
    const res = await fetch('/api/workpermit', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'บันทึกสำเร็จ', description: `อัปเดต ${selectedWP.Work_Permit_No} สถานะ: ${newStatus}` });
      setSelectedWP(prev => prev ? { ...prev, Safety_Officer: safetyOfficer, Status: newStatus } : null);
      loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWP) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'กรุณาเลือกไฟล์ PDF เท่านั้น', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('wpNo', selectedWP.Work_Permit_No);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      // Update file path in DB
      const payload = {
        ...selectedWP,
        Safety_Officer: safetyOfficer,
        File_Path: data.filePath,
        Start_Date: selectedWP.Start_Date?.split('T')[0],
        End_Date: selectedWP.End_Date?.split('T')[0],
      };
      await fetch('/api/workpermit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSelectedWP(prev => prev ? { ...prev, File_Path: data.filePath } : null);
      toast({ title: 'Upload สำเร็จ', description: `ไฟล์บันทึกที่: ${data.filePath}` });
      loadData();
    } else {
      toast({ title: 'Upload ไม่สำเร็จ', description: data.error, variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePrint = () => {
    if (!selectedWP) return;
    const printUrl = `/api/print?wpNo=${encodeURIComponent(selectedWP.Work_Permit_No)}`;
    window.open(printUrl, '_blank');
  };

  const statusIcon = (s: string) => {
    if (s === 'Open') return <Clock size={14} className="text-blue-500" />;
    if (s === 'Approved') return <CheckCircle2 size={14} className="text-green-500" />;
    if (s === 'Expired') return <AlertTriangle size={14} className="text-red-500" />;
    return <CheckCheck size={14} className="text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a3a5c]">จัดการ Work Permit</h1>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => window.open('/api/export?table=workpermit', '_blank')} className="gap-1">
            <Download size={14} /> Export Excel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Search + List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหา WP No., Contractor, Safety Officer, วันที่..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    className="pl-8 !text-xs"
                  />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">กรองสถานะ:</span>
                  {STATUS_OPTIONS.map(s => (
                    <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={statusFilter.includes(s)}
                        onCheckedChange={() => toggleStatus(s)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs flex items-center gap-1">{statusIcon(s)} {s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 text-xs">
                      <TableHead>WP No.</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Request For</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Safety Officer</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workPermits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-400 py-6 text-sm">
                          ไม่พบข้อมูล
                        </TableCell>
                      </TableRow>
                    ) : (
                      workPermits.map(wp => (
                        <TableRow
                          key={wp.Work_Permit_No}
                          className={`text-xs cursor-pointer hover:bg-blue-50 ${selectedWP?.Work_Permit_No === wp.Work_Permit_No ? 'bg-blue-100 border-l-4 border-l-[#1a3a5c]' : ''}`}
                          onClick={() => handleSelectWP(wp)}
                        >
                          <TableCell className="font-semibold text-[#1a3a5c] whitespace-nowrap">
                            {wp.Work_Permit_No}
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate">{wp.Contractor}</TableCell>
                          <TableCell className="max-w-[100px] truncate">{wp.Request_For}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateShort(wp.Start_Date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateShort(wp.End_Date)}</TableCell>
                          <TableCell className="max-w-[80px] truncate text-xs">{wp.Safety_Officer || '-'}</TableCell>
                          <TableCell><StatusBadge status={getDisplayStatus(wp)} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Detail Panel */}
        <div className="space-y-4">
          {selectedWP ? (
            <Card className="border-2 border-[#1a3a5c]/30">
              <CardHeader className="bg-[#1a3a5c] text-white rounded-t-lg py-3">
                <CardTitle className="text-xs font-semibold">{selectedWP.Work_Permit_No}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Contractor</p>
                  <p className="font-medium text-xs">{selectedWP.Contractor}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Start Date</p>
                    <p className="font-medium">{formatDateDisplay(selectedWP.Start_Date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Date</p>
                    <p className="font-medium">{formatDateDisplay(selectedWP.End_Date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Days</p>
                    <p className="font-medium">{selectedWP.Days} วัน</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Workers</p>
                    <p className="font-medium">{selectedWP.Workers} คน</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Request For</p>
                  <p className="text-xs font-medium">{selectedWP.Request_For}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Area</p>
                  <p className="text-xs font-medium">{selectedWP.Area}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Controller</p>
                  <p className="text-xs font-medium">{selectedWP.Controller}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs font-semibold">Safety Officer</Label>
                  <Select value={safetyOfficer} onValueChange={setSafetyOfficer}>
                    <SelectTrigger className="mt-1 text-xs h-8">
                      <SelectValue placeholder="เลือก Safety Officer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shePersonnel.map(p => (
                        <SelectItem key={p.ID} value={p.Person_Name}>
                          {p.Person_Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">สถานะปัจจุบัน</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedWP.Status} />
                    {getDisplayStatus(selectedWP) === 'Expired' && (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-0.5">
                        <AlertTriangle size={12} className="text-red-500" />
                        <span className="text-xs text-red-600 font-semibold">หมดอายุ (Expired)</span>
                      </div>
                    )}
                  </div>
                </div>


                <Separator />

                <div className="space-y-2">
                  {isAdmin && selectedWP.Status === 'Completed' && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                      <CheckCheck size={14} className="text-gray-500" />
                      <span className="text-xs text-gray-500 font-medium">Work Permit เสร็จสิ้นแล้ว</span>
                    </div>
                  )}

                  {isAdmin && selectedWP.Status === 'Open' && (
                    <div className="space-y-1">
                      {!safetyOfficer && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          <span className="font-bold">!</span> ต้องเลือก Safety Officer ก่อนอนุมัติ
                        </p>
                      )}
                      <Button
                        className={`w-full text-white text-xs h-9 font-semibold gap-1 ${safetyOfficer ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300 cursor-not-allowed'}`}
                        onClick={handleApproveClick}
                        disabled={!safetyOfficer}
                      >
                        <CheckCircle2 size={14} /> อนุมัติ (Approved)
                      </Button>
                    </div>
                  )}

                  {isAdmin && selectedWP.Status === 'Approved' && (
                    <div className="space-y-1">
                      {!selectedWP.File_Path && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          <span className="font-bold">!</span> ต้อง Upload ไฟล์ PDF ก่อนเสร็จสิ้น
                        </p>
                      )}
                      <Button
                        className={`w-full text-white text-xs h-9 font-semibold gap-1 ${selectedWP.File_Path ? 'bg-[#1a3a5c] hover:bg-[#2a5a8c]' : 'bg-gray-300 cursor-not-allowed'}`}
                        onClick={handleCompleteClick}
                        disabled={!selectedWP.File_Path}
                      >
                        <CheckCheck size={14} /> เสร็จสิ้น (Completed)
                      </Button>
                      <div className="pt-1">
                        {(selectedWP.Extension_Count || 0) >= 2 && (
                          <p className="text-xs text-red-600 flex items-center gap-1 bg-red-50 border border-red-200 rounded px-2 py-1 mb-1">
                            <AlertTriangle size={12} /> ขยายเวลาครบ 2 ครั้งแล้ว ไม่สามารถขยายเพิ่มได้
                          </p>
                        )}
                        <Button
                          variant="outline"
                          className={`w-full text-xs h-8 gap-1 ${(selectedWP.Extension_Count || 0) >= 2 ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-orange-500 text-orange-600 hover:bg-orange-50'}`}
                          onClick={handleExtendClick}
                          disabled={(selectedWP.Extension_Count || 0) >= 2}
                        >
                          <Timer size={13} /> ขยายเวลา Work Permit
                          <span className="ml-auto bg-orange-100 text-orange-700 text-xs px-1.5 rounded font-semibold">
                            {selectedWP.Extension_Count || 0}/2
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isAdmin && (selectedWP.Status === 'Open' || selectedWP.Status === 'Approved') && (
                    <p className="text-xs text-gray-400 text-center bg-gray-50 rounded px-2 py-2">
                      กรุณา Login เพื่อเปลี่ยนสถานะ
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full text-xs h-8 gap-1"
                    onClick={handleSaveClick}
                    disabled={!isAdmin}
                  >
                    บันทึก/เปลี่ยนแปลง Safety Officer
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs h-8 gap-1"
                    onClick={handlePrint}
                  >
                    <Printer size={13} /> พิมพ์ PDF (A4)
                  </Button>
                </div>

                <Separator />

                {isAdmin && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold"> Upload PDF file to complete</Label>
                    <div>
                      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload size={13} />
                        {uploading ? 'กำลัง Upload...' : 'Upload PDF'}
                      </Button>
                    </div>
                  {selectedWP.File_Path && (
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <FileText size={12} /> File Path:
                      </p>
                      <p className="text-xs text-gray-700 break-all mb-2">{selectedWP.File_Path}</p>
                      <div className="flex gap-1">
                        <button
                          className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700"
                          title="เปิดไฟล์ (เฉพาะเครื่อง server)"
                          onClick={() => fetch('/api/open-file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath: selectedWP.File_Path }) })}
                        >
                          📂 เปิดไฟล์
                        </button>
                        <button
                          className="flex-1 text-xs bg-gray-600 text-white rounded px-2 py-1 hover:bg-gray-700"
                          onClick={() => navigator.clipboard.writeText(selectedWP.File_Path)}
                        >
                          📋 คัดลอก Path
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText size={40} className="mb-3" />
                <p className="text-sm">เลือก Work Permit จากรายการ</p>
                <p className="text-xs mt-1">เพื่อจัดการสถานะ</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Extension Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Timer size={16} className="text-orange-500" /> ขยายเวลา Work Permit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className={`rounded px-3 py-2 border ${(selectedWP?.Extension_Count || 0) >= 1 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-xs font-semibold ${(selectedWP?.Extension_Count || 0) >= 1 ? 'text-red-700' : 'text-amber-700'}`}>
                ครั้งที่ขยาย: {(selectedWP?.Extension_Count || 0) + 1} / 2
              </p>
              {(selectedWP?.Extension_Count || 0) >= 1 && (
                <p className="text-xs text-red-600 mt-0.5">⚠ นี่คือการขยายเวลาครั้งสุดท้ายที่อนุญาต</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-500">End Date ปัจจุบัน</Label>
              <p className="text-xs font-semibold text-gray-800 mt-1 bg-gray-50 rounded px-2 py-1.5 border">
                {formatDateDisplay(selectedWP?.End_Date || '')}
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium">End Date ใหม่ <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full mt-1 text-xs justify-start h-8', !extendEndDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {extendEndDate ? format(extendEndDate, 'EEE, dd/MM/yyyy', { locale: th }) : 'เลือกวันที่...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={extendEndDate}
                    onSelect={setExtendEndDate}
                    initialFocus
                    disabled={(date) => {
                      const currentEnd = selectedWP?.End_Date ? new Date(selectedWP.End_Date.split('T')[0]) : new Date();
                      return date <= currentEnd;
                    }}
                  />
                </PopoverContent>
              </Popover>
              {extendEndDate && selectedWP && (
                <p className="text-xs text-green-600 mt-1">
                  จำนวนวันใหม่: {differenceInDays(extendEndDate, new Date(selectedWP.Start_Date.split('T')[0])) + 1} วัน
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExtendOpen(false)} className="text-xs">ยกเลิก</Button>
            <Button
              size="sm"
              onClick={handleExtendSave}
              disabled={!extendEndDate}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1"
            >
              <Timer size={13} /> บันทึก End Date ใหม่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CaptchaDialog
        open={captchaOpen}
        title={
          captchaAction === 'approve'
            ? 'ยืนยันการอนุมัติ (Approved)'
            : captchaAction === 'complete'
            ? 'ยืนยันการเสร็จสิ้น (Completed)'
            : captchaAction === 'extend'
            ? `ยืนยันการขยายเวลา Work Permit (ครั้งที่ ${(selectedWP?.Extension_Count || 0) + 1}/2)`
            : 'ยืนยันการบันทึก'
        }
        onConfirm={handleCaptchaConfirm}
        onCancel={() => setCaptchaOpen(false)}
      />
    </div>
  );
}
