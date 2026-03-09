'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CaptchaDialogProps {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CaptchaDialog({ open, title, onConfirm, onCancel }: CaptchaDialogProps) {
  const [captcha, setCaptcha] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setCaptcha(code);
      setInput('');
      setError('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (input === captcha) {
      onConfirm();
    } else {
      setError('รหัสไม่ถูกต้อง กรุณาลองใหม่');
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setCaptcha(code);
      setInput('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">กรุณากรอกรหัสยืนยันด้านล่างเพื่อดำเนินการต่อ</p>
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg px-8 py-4 select-none">
              <span className="text-3xl font-bold tracking-[0.5em] text-gray-700 font-mono">{captcha}</span>
            </div>
          </div>
          <Input
            placeholder="กรอกรหัส 4 หลัก"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            maxLength={4}
            className="text-center text-xl tracking-widest font-mono"
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>ยกเลิก</Button>
          <Button onClick={handleConfirm} disabled={input.length !== 4}>ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
