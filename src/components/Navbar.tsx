'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Users, Building2, Calendar, LogOut, LogIn, User } from 'lucide-react';
import LoginModal from './LoginModal';

const APP_VERSION = 'Rev.3';
const APP_DATE    = '28/03/2026';
const APP_AUTHOR  = 'Wis';
const APP_COPYRIGHT = 'SMPC';

const NAV_ITEMS = [
  { href: '/weekend', label: 'ใบขอทำงานวันหยุด', icon: <Calendar size={20} /> },
  { href: '/create',  label: 'ใบขออนุญาติทำงาน',      icon: <FileText size={20} /> },
  { href: '/manage',  label: 'จัดการ',           icon: <ShieldCheck size={20} /> },
  { href: '/personnel',label: 'บุคลากร',         icon: <Users size={20} /> },
  { href: '/contractor',label:'ผู้รับเหมา',      icon: <Building2 size={20} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => setIsAdmin(d.isAdmin));
  }, []);

  const broadcastAuth = (admin: boolean) => {
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { isAdmin: admin } }));
  };

  const handleLoginSuccess = (admin: boolean) => {
    setIsAdmin(admin);
    broadcastAuth(admin);
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsAdmin(false);
    broadcastAuth(false);
  };

  const navLinks = (showLabel: boolean) => NAV_ITEMS.map(({ href, label, icon }) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[15px] font-medium transition-colors duration-150 ${
          active ? 'bg-[#1a3a5c] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        {icon}
        {showLabel && <span>{label}</span>}
      </Link>
    );
  });

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">

        {/* Row 1: Logo + Nav (desktop) + Auth */}
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-14 gap-3">

          {/* SMPC Logo */}
          <div
            className="hidden sm:flex items-center pr-3 border-r border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => { window.location.href = 'http://192.168.42.103:3000'; }}
            title="กลับ Portal"
          >
            <Image
              src="/SMPC_logo_NOBG.png"
              alt="SMPC Logo"
              height={35}
              width={90}
              className="object-contain"
              priority
            />
          </div>

          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex items-center justify-center w-9 h-9 bg-[#1a3a5c] rounded-lg flex-shrink-0">
              <ShieldCheck size={23} className="text-white" />
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-[18px] font-bold text-gray-800 whitespace-nowrap">สหมิตรถังแก๊ส จำกัด (มหาชน)</p>
              <p className="text-[11px] text-gray-800 tracking-wider whitespace-nowrap">{APP_VERSION} , {APP_DATE} , Dev by {APP_AUTHOR} , © {APP_COPYRIGHT}</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Navigation - desktop only (lg+) */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks(true)}
          </nav>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 flex-shrink-0" />

          {/* Auth area */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin ? (
              <>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1a3a5c]/10 text-[#1a3a5c] border border-[#1a3a5c]/20">
                  <ShieldCheck size={13} />
                  Admin
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </>
            ) : (
              <>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                  <User size={13} />
                  Guest
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1a3a5c] text-white hover:bg-[#2a5a8c] transition-colors"
                >
                  <LogIn size={15} />
                  <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                </button>
              </>
            )}
          </div>

        </div>

        {/* Row 2: Nav (tablet/iPad only, below lg) */}
        <div className="lg:hidden bg-gray-50 border-b border-gray-100">
          <div className="max-w-screen-2xl mx-auto px-4 flex items-center py-0.5">
            <nav className="flex items-center gap-0.5">
              {navLinks(true)}
            </nav>
          </div>
        </div>


      </header>

      {/* Login Modal */}
      {showModal && (
        <LoginModal
          onClose={() => setShowModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
