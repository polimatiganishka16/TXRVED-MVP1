import AdminSidebar from '../../../components/admin/AdminSidebar';
import AdminHeader from '../../../components/admin/AdminHeader';
export const metadata = {
  title: 'Admin — IECBP Evaluation System | txrV.ed',
};

export default function AdminLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1623 0%, #121826 40%, #182235 70%, #1a2540 100%)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Fixed sidebar */}
      <AdminSidebar />

      {/* Main content — offset by sidebar width */}
      <div style={{
        marginLeft: '240px',
        flex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <header style={{
          height: '60px',
          background: 'rgba(18,24,38,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#6366F1',
              boxShadow: '0 0 8px #6366F1',
            }} />
            <span style={{
              fontSize: '12px', color: '#64748B',
              fontWeight: 500, letterSpacing: '0.5px',
            }}>
              IECBP EVALUATION SYSTEM — ADMIN PANEL
            </span>
          </div>

          <AdminHeader />
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}