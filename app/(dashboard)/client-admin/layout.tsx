'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  Users,
  PawPrint,
  Calendar,
  LayoutDashboard,
  Settings,
  Activity,
} from 'lucide-react';

// BUG FIX: useSearchParams must be inside a Suspense boundary in Next.js 13+.
// Moved the nav logic into a child component wrapped in Suspense.
function ClientAdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'clients';
  // BUG FIX: was checking === '/client-admin' but the actual path in the
  // (dashboard) route group is resolved differently. Check that it ends with
  // 'client-admin' with no further segments.
  const isMainPage = /\/client-admin\/?$/.test(pathname);

  const handleTabClick = (tab: string) => {
    router.push(`/client-admin?tab=${tab}`);
  };

  const navItems = [
    {
      name: 'Dashboard',
      value: 'dashboard',
      icon: LayoutDashboard,
      active: currentTab === 'dashboard' && isMainPage,
    },
    {
      name: 'Clients',
      value: 'clients',
      icon: Users,
      // BUG FIX: was always marking Clients as active on sub-pages, which
      // caused all nav items to appear active simultaneously.
      active: (currentTab === 'clients' || !isMainPage) && isMainPage
        ? currentTab === 'clients'
        : false,
    },
    {
      name: 'Pets',
      value: 'pets',
      icon: PawPrint,
      active: currentTab === 'pets' && isMainPage,
    },
    {
      name: 'Appointments',
      value: 'appointments',
      icon: Calendar,
      active: currentTab === 'appointments' && isMainPage,
    },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="nav-bar">
        <div className="nav-container">
          <div className="nav-inner">
            <div className="nav-left">
              <Link href="/client-admin" className="brand-link">
                <div className="brand-icon">
                  <PawPrint size={20} />
                </div>
                <span className="brand-name">PAWS <span className="brand-suffix">CMS</span></span>
              </Link>

              {/* Tabs — only on main page */}
              {isMainPage && (
                <nav className="nav-tabs">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        onClick={() => handleTabClick(item.value)}
                        className={`nav-tab ${item.active ? 'nav-tab--active' : ''}`}
                      >
                        <Icon size={16} />
                        {item.name}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Right side controls */}
            <div className="nav-right">
              <div className="status-dot" title="System online">
                <Activity size={14} />
                <span></span>
              </div>
              <button className="icon-btn" aria-label="Settings">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMainPage && (
        <div className="mobile-nav">
          <nav className="mobile-nav-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  onClick={() => handleTabClick(item.value)}
                  className={`mobile-tab ${item.active ? 'mobile-tab--active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

export default function ClientAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        :root {
          --navy: #0f172a;
          --navy-800: #1e293b;
          --navy-700: #334155;
          --teal: #0d9488;
          --teal-light: #14b8a6;
          --teal-pale: #f0fdfa;
          --slate: #64748b;
          --slate-light: #94a3b8;
          --white: #ffffff;
          --off-white: #f8fafc;
          --border: #e2e8f0;
          --red: #ef4444;
          --red-pale: #fef2f2;
          --yellow: #f59e0b;
          --yellow-pale: #fffbeb;
          --green: #10b981;
          --green-pale: #f0fdf4;
          --blue: #3b82f6;
          --blue-pale: #eff6ff;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04);
          --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04);
          --radius: 10px;
          --radius-sm: 6px;
          --radius-lg: 14px;
          --font: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
        }

        * { box-sizing: border-box; }

        body {
          font-family: var(--font);
          background: var(--off-white);
          color: var(--navy);
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        /* ── NAV ── */
        .nav-bar {
          background: var(--navy);
          border-bottom: 1px solid var(--navy-700);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .nav-container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
        }
        .nav-left { display: flex; align-items: center; gap: 32px; }
        .nav-right { display: flex; align-items: center; gap: 12px; }

        .brand-link {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .brand-icon {
          width: 34px; height: 34px;
          background: var(--teal);
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .brand-name {
          font-size: 17px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }
        .brand-suffix {
          color: var(--teal-light);
          font-weight: 500;
          font-size: 14px;
          margin-left: 2px;
        }

        .nav-tabs { display: none; gap: 4px; }
        @media (min-width: 768px) { .nav-tabs { display: flex; } }

        .nav-tab {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--slate-light);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          font-family: var(--font);
        }
        .nav-tab:hover { background: var(--navy-700); color: white; }
        .nav-tab--active {
          background: rgba(13,148,136,0.2);
          color: var(--teal-light);
        }
        .nav-tab--active:hover {
          background: rgba(13,148,136,0.3);
          color: var(--teal-light);
        }

        .status-dot {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 500;
          color: var(--green);
          background: rgba(16,185,129,0.12);
          padding: 5px 10px;
          border-radius: 100px;
        }
        .icon-btn {
          width: 36px; height: 36px;
          border: none;
          background: var(--navy-700);
          color: var(--slate-light);
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .icon-btn:hover { background: var(--navy-800); color: white; }

        /* ── MOBILE NAV ── */
        .mobile-nav {
          background: var(--navy-800);
          border-bottom: 1px solid var(--navy-700);
          display: block;
        }
        @media (min-width: 768px) { .mobile-nav { display: none; } }
        .mobile-nav-inner {
          max-width: 1400px; margin: 0 auto; padding: 0 16px;
          display: flex; gap: 2px; overflow-x: auto;
          padding-bottom: 8px; padding-top: 8px;
        }
        .mobile-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--slate-light);
          font-size: 13px; font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          font-family: var(--font);
        }
        .mobile-tab:hover { background: var(--navy-700); color: white; }
        .mobile-tab--active { background: rgba(13,148,136,0.2); color: var(--teal-light); }

        /* ── GLOBAL PAGE STYLES ── */
        main { min-height: calc(100vh - 60px); }

        .page { max-width: 1400px; margin: 0 auto; padding: 32px 24px; }

        /* ── CARDS ── */
        .card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        .card-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .card-body { padding: 24px; }
        .card-title { font-size: 17px; font-weight: 650; color: var(--navy); margin: 0; }

        /* ── BUTTONS ── */
        .btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px;
          border-radius: var(--radius-sm);
          border: none;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font);
          text-decoration: none;
          white-space: nowrap;
        }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; pointer-events: none; }

        .btn-primary {
          background: var(--teal);
          color: white;
        }
        .btn-primary:hover { background: var(--teal-light); }

        .btn-outline {
          background: white;
          color: var(--navy-700);
          border: 1px solid var(--border);
        }
        .btn-outline:hover { background: var(--off-white); border-color: var(--slate-light); }

        .btn-ghost {
          background: transparent;
          color: var(--slate);
          border: 1px solid transparent;
        }
        .btn-ghost:hover { background: var(--off-white); }

        .btn-danger {
          background: var(--red);
          color: white;
        }
        .btn-danger:hover { background: #dc2626; }

        .btn-sm { padding: 6px 12px; font-size: 13px; }
        .btn-icon { padding: 8px; }

        /* ── BADGES / STATUS ── */
        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px;
          border-radius: 100px;
          font-size: 12px; font-weight: 600;
          text-transform: capitalize;
        }
        .badge-green { background: var(--green-pale); color: #059669; }
        .badge-red { background: var(--red-pale); color: #dc2626; }
        .badge-yellow { background: var(--yellow-pale); color: #b45309; }
        .badge-blue { background: var(--blue-pale); color: #2563eb; }
        .badge-gray { background: #f1f5f9; color: var(--slate); }
        .badge-teal { background: var(--teal-pale); color: var(--teal); }

        /* ── FORM ELEMENTS ── */
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-label {
          font-size: 13px; font-weight: 600; color: var(--navy-700);
        }
        .form-input {
          padding: 9px 12px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 14px;
          color: var(--navy);
          background: white;
          font-family: var(--font);
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(13,148,136,0.1);
        }
        .form-input:disabled {
          background: var(--off-white);
          color: var(--slate);
          cursor: not-allowed;
        }
        .form-hint { font-size: 12px; color: var(--slate); }
        .form-error { font-size: 12px; color: var(--red); }

        /* ── TABLE ── */
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--slate);
          background: var(--off-white);
          border-bottom: 1px solid var(--border);
        }
        td {
          padding: 14px 16px;
          font-size: 14px;
          color: var(--navy-700);
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        tr:last-child td { border-bottom: none; }
        tbody tr { transition: background 0.1s; }
        tbody tr:hover { background: #fafcff; }

        /* ── GRID HELPERS ── */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 768px) {
          .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
        }
        @media (min-width: 640px) and (max-width: 1024px) {
          .grid-3 { grid-template-columns: 1fr 1fr; }
          .grid-4 { grid-template-columns: 1fr 1fr; }
        }

        /* ── STAT CARDS ── */
        .stat-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
        }
        .stat-value { font-size: 32px; font-weight: 800; color: var(--navy); line-height: 1; }
        .stat-label { font-size: 13px; color: var(--slate); margin-bottom: 6px; }
        .stat-sub { font-size: 12px; color: var(--slate-light); margin-top: 4px; }
        .stat-icon {
          width: 52px; height: 52px;
          border-radius: var(--radius);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ── LOADING ── */
        .loading-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 80px 24px; gap: 16px;
          color: var(--slate);
        }
        .spinner {
          width: 32px; height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── EMPTY STATE ── */
        .empty-state {
          padding: 60px 24px;
          text-align: center;
          color: var(--slate);
        }
        .empty-state-icon {
          width: 56px; height: 56px;
          background: var(--off-white);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          color: var(--slate-light);
        }
        .empty-state h3 { font-size: 16px; font-weight: 650; color: var(--navy-700); margin: 0 0 6px; }
        .empty-state p { font-size: 14px; margin: 0; }

        /* ── ALERT / TOAST STYLES ── */
        .alert {
          padding: 14px 18px;
          border-radius: var(--radius);
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px;
        }
        .alert-error { background: var(--red-pale); color: #b91c1c; border: 1px solid #fca5a5; }
        .alert-success { background: var(--green-pale); color: #047857; border: 1px solid #6ee7b7; }
        .alert-warning { background: var(--yellow-pale); color: #92400e; border: 1px solid #fcd34d; }
        .alert-info { background: var(--blue-pale); color: #1d4ed8; border: 1px solid #93c5fd; }

        /* ── MISC ── */
        .page-header { margin-bottom: 28px; }
        .page-header h1 {
          font-size: 26px; font-weight: 750; color: var(--navy);
          margin: 0 0 4px; letter-spacing: -0.5px;
        }
        .page-header p { font-size: 14px; color: var(--slate); margin: 0; }

        .divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

        .info-row { display: flex; flex-direction: column; gap: 2px; }
        .info-label { font-size: 12px; color: var(--slate); font-weight: 500; }
        .info-value { font-size: 14px; color: var(--navy); font-weight: 500; }

        .tag {
          display: inline-block;
          padding: 2px 8px;
          background: var(--teal-pale);
          color: var(--teal);
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        a { color: inherit; }
        .link-blue { color: var(--blue); text-decoration: none; }
        .link-blue:hover { text-decoration: underline; }

        /* ── TABS (for detail pages) ── */
        .tab-bar {
          display: flex; gap: 0;
          border-bottom: 2px solid var(--border);
          margin-bottom: 24px;
        }
        .tab-item {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 20px;
          font-size: 14px; font-weight: 600;
          color: var(--slate);
          border: none; background: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: color 0.15s, border-color 0.15s;
          font-family: var(--font);
        }
        .tab-item:hover { color: var(--navy); }
        .tab-item--active { color: var(--teal); border-bottom-color: var(--teal); }
        .tab-count {
          background: var(--off-white);
          color: var(--slate);
          font-size: 11px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 100px;
          border: 1px solid var(--border);
        }
        .tab-item--active .tab-count { background: var(--teal-pale); color: var(--teal); border-color: var(--teal); }

        /* ── SECTION ── */
        .section { margin-bottom: 24px; }
        .section-title {
          font-size: 15px; font-weight: 700; color: var(--navy);
          margin: 0 0 16px; display: flex; align-items: center; gap: 8px;
        }
        .section-title svg { color: var(--teal); }

        /* ── ANIMATIONS ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fadeUp 0.25s ease both; }
        .animate-in-delay-1 { animation-delay: 0.05s; }
        .animate-in-delay-2 { animation-delay: 0.1s; }
        .animate-in-delay-3 { animation-delay: 0.15s; }

        /* ── CHECKBOX ── */
        .checkbox-label {
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; font-size: 14px; color: var(--navy-700);
          font-weight: 500;
        }
        input[type="checkbox"] {
          width: 16px; height: 16px;
          accent-color: var(--teal);
          cursor: pointer;
        }

        /* ── SELECT ── */
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
          cursor: pointer;
        }

        /* ── EMERGENCY BADGE ── */
        .emergency-alert {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: var(--radius-sm);
          color: #b91c1c;
          font-size: 14px; font-weight: 600;
        }

        /* ── TEXTAREA ── */
        textarea.form-input {
          resize: vertical;
          min-height: 88px;
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* BUG FIX: Wrap in Suspense so useSearchParams doesn't cause build error */}
        <Suspense fallback={
          <div className="nav-bar" style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 24 }}>
            <div className="brand-name" style={{ color: 'white' }}>PAWS CMS</div>
          </div>
        }>
          <ClientAdminNav />
        </Suspense>

        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </>
  );
}
