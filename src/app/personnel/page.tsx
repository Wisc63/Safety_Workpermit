'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Download, X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CaptchaDialog from '@/components/CaptchaDialog';
import { useToast } from '@/hooks/use-toast';

interface Personnel {
  ID: number;
  Department: string;
  Person_Name: string;
  Personnel_Tel: string | null;
  Personnel_Position: string | null;
}

const PERSONNEL_POSITIONS = ['พนักงาน', 'หัวหน้าแผนก/ส่วน', 'วิศวกร', 'ผู้บริหาร'];
const emptyForm = { Department: '', Person_Name: '', Personnel_Tel: '', Personnel_Position: 'พนักงาน' };

export default function PersonnelPage() {
  const { toast } = useToast();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<'save' | 'delete'>('save');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const loadData = useCallback(async () => {
    const [pRes, authRes] = await Promise.all([fetch('/api/personnel'), fetch('/api/auth')]);
    const [p, auth] = await Promise.all([pRes.json(), authRes.json()]);
    setPersonnel(Array.isArray(p) ? p : []);
    setIsAdmin(auth.isAdmin || false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleAuthChange = () => { loadData(); };
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, [loadData]);

  const filtered = personnel.filter(p =>
    p.Department.toLowerCase().includes(searchQ.toLowerCase()) ||
    p.Person_Name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (p.Personnel_Tel || '').includes(searchQ)
  );

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (p: Personnel) => {
    setForm({
      Department: p.Department,
      Person_Name: p.Person_Name,
      Personnel_Tel: p.Personnel_Tel || '',
      Personnel_Position: p.Personnel_Position || 'พนักงาน',
    });
    setEditingId(p.ID);
    setFormOpen(true);
  };

  const handleSaveClick = () => {
    if (!form.Department.trim() || !form.Person_Name.trim()) {
      toast({ title: 'กรุณากรอกข้อมูลให้ครบถ้วน', variant: 'destructive' });
      return;
    }
    setCaptchaAction('save');
    setCaptchaOpen(true);
  };

  const handleSaveConfirm = async () => {
    setCaptchaOpen(false);
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId
      ? { ID: editingId, Department: form.Department, Person_Name: form.Person_Name, Personnel_Tel: form.Personnel_Tel || null, Personnel_Position: form.Personnel_Position }
      : { Department: form.Department, Person_Name: form.Person_Name, Personnel_Tel: form.Personnel_Tel || null, Personnel_Position: form.Personnel_Position };
    const res = await fetch('/api/personnel', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: editingId ? 'อัปเดตสำเร็จ' : 'เพิ่มสำเร็จ' });
      setFormOpen(false);
      loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (id: number) => {
    setPendingDeleteId(id);
    setCaptchaAction('delete');
    setCaptchaOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setCaptchaOpen(false);
    if (!pendingDeleteId) return;
    const res = await fetch('/api/personnel', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ID: pendingDeleteId }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'ลบสำเร็จ' });
      loadData();
    } else {
      toast({ title: 'เกิดข้อผิดพลาด', description: data.error, variant: 'destructive' });
    }
  };

  const handleCaptchaConfirm = () => {
    if (captchaAction === 'delete') handleDeleteConfirm();
    else handleSaveConfirm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a3a5c]">ตั้งค่าบุคลากร (Personnel)</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => window.open('/api/export?table=personnel', '_blank')} className="gap-1">
              <Download size={14} /> Export Excel
            </Button>
          )}
          <Button size="sm" onClick={openAddForm} className="bg-[#1a3a5c] hover:bg-[#2a5a8c] gap-1">
            <Plus size={14} /> เพิ่มบุคลากร
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-[#1a3a5c]">รายการบุคลากรทั้งหมด ({personnel.length} คน)</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                placeholder="ค้นหา Department หรือ ชื่อ-นามสกุล..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 text-xs">
                <TableHead>#</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>ตำแหน่งงาน</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8 text-sm">
                    ยังไม่มีข้อมูลบุคลากร
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p, i) => (
                  <TableRow key={p.ID} className="text-sm hover:bg-gray-50">
                    <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                    <TableCell>
                      <span className="bg-[#1a3a5c] text-white text-xs px-2 py-0.5 rounded font-medium">
                        {p.Department}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{p.Person_Name}</TableCell>
                    <TableCell className="text-xs text-gray-700">{p.Personnel_Position || '-'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{p.Personnel_Tel || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600" onClick={() => openEditForm(p)}>
                          <Pencil size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteClick(p.ID)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'แก้ไขบุคลากร' : 'เพิ่มบุคลากร'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Department <span className="text-red-500">*</span></Label>
              <Input
                value={form.Department}
                onChange={e => setForm(f => ({ ...f, Department: e.target.value.slice(0, 5).toUpperCase() }))}
                maxLength={5}
                placeholder="เช่น SHE, HR, ENG"
                className="mt-1 text-sm uppercase"
              />
              <p className="text-xs text-gray-400 mt-1">ตัวอักษรสูงสุด 5 ตัว</p>
            </div>
            <div>
              <Label className="text-sm">ชื่อ-นามสกุล <span className="text-red-500">*</span></Label>
              <Input
                value={form.Person_Name}
                onChange={e => setForm(f => ({ ...f, Person_Name: e.target.value }))}
                maxLength={200}
                placeholder="ชื่อ-นามสกุล..."
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{form.Person_Name.length}/200</p>
            </div>
            <div>
              <Label className="text-sm">ตำแหน่งงาน <span className="text-red-500">*</span></Label>
              <Select value={form.Personnel_Position} onValueChange={v => setForm(f => ({ ...f, Personnel_Position: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONNEL_POSITIONS.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">เบอร์โทร (Personnel Tel)</Label>
              <Input
                value={form.Personnel_Tel}
                onChange={e => setForm(f => ({ ...f, Personnel_Tel: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                maxLength={10}
                placeholder="0812345678"
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">ตัวเลขสูงสุด 10 หลัก (ไม่บังคับ)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              <X size={14} className="mr-1" /> ยกเลิก
            </Button>
            <Button onClick={handleSaveClick} className="bg-[#1a3a5c] hover:bg-[#2a5a8c]">
              <Check size={14} className="mr-1" /> บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CaptchaDialog
        open={captchaOpen}
        title={captchaAction === 'delete' ? 'ยืนยันการลบบุคลากร' : editingId ? 'ยืนยันการแก้ไขบุคลากร' : 'ยืนยันการเพิ่มบุคลากร'}
        onConfirm={handleCaptchaConfirm}
        onCancel={() => setCaptchaOpen(false)}
      />
    </div>
  );
}
