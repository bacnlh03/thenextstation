import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Users, LogOut, GraduationCap, HeartHandshake, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/stores/useAuthStore'

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  
  const isActive = (path: string) => location.pathname === path 
    ? 'bg-white/10 text-white' 
    : 'text-slate-400 hover:text-white hover:bg-white/5'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-emerald-400" size={20} />
          <span className="font-bold text-sm tracking-tight">Thiệp tốt nghiệp</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={clsx(
          "bg-slate-900 text-white flex flex-col shrink-0 h-screen z-50 transition-transform duration-200 ease-in-out",
          // Desktop
          "md:w-60 md:sticky md:top-0 md:translate-x-0 md:flex",
          // Mobile drawer
          "fixed top-0 bottom-0 left-0 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand header */}
        <div className="px-5 py-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="text-emerald-400" size={22} />
            <p className="text-white font-bold text-base leading-tight tracking-tight">Thiệp tốt nghiệp</p>
          </div>
          <button 
            onClick={closeMobile}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Quản lý</p>
          <Link 
            to="/" 
            onClick={closeMobile}
            className={clsx("flex items-center gap-3 py-2.5 px-3 rounded-lg font-medium transition-all text-sm", isActive('/'))}
          >
            <Users size={17}/> Khách mời
          </Link>

          <Link 
            to="/wishes" 
            onClick={closeMobile}
            className={clsx("flex items-center gap-3 py-2.5 px-3 rounded-lg font-medium transition-all text-sm", isActive('/wishes'))}
          >
            <HeartHandshake size={17} /> Lời chúc
          </Link>

          <Link 
            to="/design" 
            onClick={closeMobile}
            className={clsx("flex items-center gap-3 py-2.5 px-3 rounded-lg font-medium transition-all text-sm", isActive('/design'))}
          >
            <GraduationCap size={17} /> Thiết kế thiệp
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={17} /> Đăng xuất
          </button>
          <p className="text-[10px] text-slate-700 text-center leading-relaxed">
            v1.0 &nbsp;·&nbsp; © 2025 Kenyo &amp; Mei
          </p>
        </div>
      </aside>
    </>
  )
}
