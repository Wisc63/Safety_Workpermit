'use client';
import { useState, useEffect, FormEvent } from 'react';
import { LogIn, X, ShieldCheck, User } from 'lucide-react';

interface Props {
  onClose: () => void;
  onLoginSuccess: (isAdmin: boolean) => void;
}

export default function LoginModal({ onClose, onLoginSuccess }: Props) {
  const [selectedUser, setSelectedUser] = useState<'guest' | 'admin'>('guest');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (selectedUser === 'guest') {
      await fetch('/api/auth', { method: 'DELETE' });
      onLoginSuccess(false);
      onClose();
      return;
    }
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Admin', password }),
    });
    const data = await res.json();
    if (data.success) {
      onLoginSuccess(true);
      onClose();
    } else {
      setError(data.message || 'รหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#1a3a5c]">
          <div className="flex items-center gap-2.5">
            <LogIn size={18} className="text-white" />
            <span className="text-white font-semibold text-base">เข้าสู่ระบบ</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* User type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              ประเภทผู้ใช้
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setSelectedUser('guest'); setPassword(''); setError(''); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedUser === 'guest'
                    ? 'border-[#1a3a5c] bg-[#1a3a5c]/5 text-[#1a3a5c]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User size={16} /> Guest
              </button>
              <button
                type="button"
                onClick={() => { setSelectedUser('admin'); setError(''); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedUser === 'admin'
                    ? 'border-[#1a3a5c] bg-[#1a3a5c]/5 text-[#1a3a5c]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShieldCheck size={16} /> Admin
              </button>
            </div>
          </div>

          {/* Password (admin only) */}
          {selectedUser === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                รหัสผ่าน
              </label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="กรอกรหัสผ่าน Admin"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30 focus:border-[#1a3a5c]"
              />
            </div>
          )}

          {/* Guest note */}
          {selectedUser === 'guest' && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
              Guest สามารถดูข้อมูลและสร้าง Work Permit ได้ แต่ไม่สามารถ Approve/Complete ได้
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1a3a5c] text-white text-sm font-medium hover:bg-[#2a5a8c] transition-colors"
            >
              <LogIn size={15} />
              {selectedUser === 'admin' ? 'เข้าสู่ระบบ' : 'เข้าระบบ Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

