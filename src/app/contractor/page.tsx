'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Download, X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CaptchaDialog from '@/components/CaptchaDialog';
import { useToast } from '@/hooks/use-toast';

interface Contractor {
  ID: number;
  Contractor: string;
  Foreman_Name: string;
  Foreman_Tel: string;
}

const emptyForm = { Contractor: '', Foreman_Name: '', Foreman_Tel: '' };

export default function ContractorPage() {
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaAction, setCaptchaAction] = useState<'save' | 'delete'>('save');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const loadData = useCallback(async () => {
    const [cRes, authRes] = await Promise.all([fetch('/api/contractor'), fetch('/api/auth')]);
    const [c, auth] = await Promise.all([cRes.json(), authRes.json()]);
    setContractors(Array.isArray(c) ? c : []);
    setIsAdmin(auth.isAdmin || false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = contractors.filter(c =>
    c.Contractor.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.Foreman_Name.toLowerCase().includes(searchQ.toLowerCase())
  );

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (c: Contractor) => {
    setForm({ Contractor: c.Contractor, Foreman_Name: c.Foreman_Name, Foreman_Tel: c.Foreman_Tel });
    setEditingId(c.ID);
    setFormOpen(true);
  };

  const handleTelChange = (value: string) => {
    const numOnly = value.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, Foreman_Tel: numOnly }));
  };

  const handleSaveClick = () => {
    if (!form.Contractor.trim() || !form.Foreman_Name.trim() || !form.Foreman_Tel.trim()) {
      toast({ title: 'กรุณากรอกข้อมูลให้ครบถ้วน', variant: 'destructive' });
      return;
    }
    if (form.Foreman_Tel.length !== 10) {
      toast({ title: 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก', variant: 'destructive' });
      return;
    }
    setCaptchaAction('save');
    setCaptchaOpen(true);
  };

  const handleSaveConfirm = async () => {
    setCaptchaOpen(false);
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { ...form, ID: editingId } : form;
    const res = await fetch('/api/contractor', {
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
    const res = await fetch('/api/contractor', {
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
        <h1 className="text-xl font-bold text-[#1a3a5c]">ตั้งค่าผู้รับเหมา (Contractor)</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => window.open('/api/export?table=contractor', '_blank')} className="gap-1">
              <Download size={14} /> Export Excel
            </Button>
          )}
          <Button size="sm" onClick={openAddForm} className="bg-[#1a3a5c] hover:bg-[#2a5a8c] gap-1">
            <Plus size={14} /> เพิ่มผู้รับเหมา
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-[#1a3a5c]">รายการผู้รับเหมาทั้งหมด ({contractors.length} ราย)</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                placeholder="ค้นหาบริษัท หรือ Foreman..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border rounded-md w-60 focus:outline-none focus:ring-1 focus:ring-[#1a3a5c]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 text-xs">
                <TableHead>#</TableHead>
                <TableHead>ชื่อบริษัท (Contractor)</TableHead>
                <TableHead>หัวหน้างาน (Foreman)</TableHead>
                <TableHead>เบอร์โทร (Tel)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8 text-sm">
                    ยังไม่มีข้อมูลผู้รับเหมา
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c, i) => (
                  <TableRow key={c.ID} className="text-sm hover:bg-gray-50">
                    <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.Contractor}</TableCell>
                    <TableCell>{c.Foreman_Name}</TableCell>
                    <TableCell className="font-mono">{c.Foreman_Tel}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600" onClick={() => openEditForm(c)}>
                          <Pencil size={13} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteClick(c.ID)}>
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
            <DialogTitle>{editingId ? 'แก้ไขผู้รับเหมา' : 'เพิ่มผู้รับเหมา'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">ชื่อบริษัทผู้รับเหมา (Contractor) <span className="text-red-500">*</span></Label>
              <Input
                value={form.Contractor}
                onChange={e => setForm(f => ({ ...f, Contractor: e.target.value }))}
                maxLength={50}
                placeholder="ชื่อบริษัทผู้รับเหมา..."
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">หัวหน้างาน (Foreman Name) <span className="text-red-500">*</span></Label>
              <Input
                value={form.Foreman_Name}
                onChange={e => setForm(f => ({ ...f, Foreman_Name: e.target.value }))}
                maxLength={100}
                placeholder="ชื่อหัวหน้างาน..."
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-sm">เบอร์โทรศัพท์ (Tel) <span className="text-red-500">*</span></Label>
              <Input
                value={form.Foreman_Tel}
                onChange={e => handleTelChange(e.target.value)}
                maxLength={10}
                placeholder="ตัวเลข 10 หลัก เช่น 0812345678"
                className="mt-1 text-sm font-mono"
                inputMode="numeric"
              />
              <p className={`text-xs mt-1 ${form.Foreman_Tel.length === 10 ? 'text-green-500' : 'text-gray-400'}`}>
                กรอกเฉพาะตัวเลข 10 หลัก — {form.Foreman_Tel.length}/10
              </p>
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
        title={captchaAction === 'delete' ? 'ยืนยันการลบผู้รับเหมา' : editingId ? 'ยืนยันการแก้ไขผู้รับเหมา' : 'ยืนยันการเพิ่มผู้รับเหมา'}
        onConfirm={handleCaptchaConfirm}
        onCancel={() => setCaptchaOpen(false)}
      />
    </div>
  );
}
