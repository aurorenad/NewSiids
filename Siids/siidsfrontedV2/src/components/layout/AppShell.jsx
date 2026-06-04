import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  Bell, LogOut, Search, User, Shield, Package, 
  FileText, Activity, AlertTriangle, Layers, UserCheck, Award,
  Briefcase, ClipboardList, Settings
} from 'lucide-react';
import './AppShell.css';

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, toasts, removeToast } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Command Palette keydown listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getNavClass = (path) => {
    return location.pathname === path ? 'nav-item active' : 'nav-item';
  };

  const getNavLinks = () => {
    if (!user) return [];
    const links = [];
    if (user.role === 'SURVEILLANCE_OFFICER') {
      links.push({ path: '/surveillance', label: 'Surveillance Intake', icon: <Package size={18} /> });
    } else if (user.role === 'STOCK_MANAGER') {
      links.push({ path: '/stock-manager', label: 'Stock Manager', icon: <Layers size={18} /> });
    } else if (user.role === 'PRSO' || user.role === 'DEPUTY_PRSO') {
      links.push({ path: '/prso', label: 'PRSO Approvals', icon: <Shield size={18} /> });
    } else if (user.role === 'ASSISTANT_COMMISSIONER') {
      links.push({ path: '/ac', label: 'AC Cases Hub', icon: <FileText size={18} /> });
      links.push({ path: '/ac/analytics', label: 'Operational Analytics', icon: <Activity size={18} /> });
    } else if (user.role === 'DIRECTOR_OF_INTELLIGENCE') {
      links.push({ path: '/doi', label: 'DOI Approvals', icon: <FileText size={18} /> });
      links.push({ path: '/doi/reports', label: 'Reports & Metrics', icon: <FileText size={18} /> });
    } else if (user.role === 'INTELLIGENCE_OFFICER') {
      links.push({ path: '/intelligence-officer', label: 'Intelligence', icon: <ClipboardList size={18} /> });
      links.push({ path: '/intelligence-officer/reports', label: 'Reports & Metrics', icon: <FileText size={18} /> });
    } else if (user.role === 'INVESTIGATION_OFFICER') {
      links.push({ path: '/investigation-officer', label: 'Investigation Cases', icon: <ClipboardList size={18} /> });
    } else if (user.role === 'DIRECTOR_OF_INVESTIGATION') {
      links.push({ path: '/investigation-director', label: 'Command Center', icon: <Briefcase size={18} /> });
    } else if (user.role === 'Admin') {
      links.push({ path: '/admin', label: 'System Admin', icon: <Settings size={18} /> });
    }
    return links;
  };

  const handlePaletteCommand = (action) => {
    setShowCommandPalette(false);
    setPaletteSearch('');
    if (action.startsWith('/')) {
      navigate(action);
    } else if (action === 'logout') {
      logout();
    }
  };

  // List of available commands in palette
  const commands = [
    { label: 'Go to Surveillance Dashboard', action: '/surveillance', roles: ['SURVEILLANCE_OFFICER'] },
    { label: 'Go to Stock Manager Dashboard', action: '/stock-manager', roles: ['STOCK_MANAGER'] },
    { label: 'Go to PRSO Approvals Workspace', action: '/prso', roles: ['PRSO', 'DEPUTY_PRSO'] },
    { label: 'Go to AC Cases Hub', action: '/ac', roles: ['ASSISTANT_COMMISSIONER'] },
    { label: 'Go to AC Operational Analytics', action: '/ac/analytics', roles: ['ASSISTANT_COMMISSIONER'] },
    { label: 'Go to DOI Signature Workspace', action: '/doi', roles: ['DIRECTOR_OF_INTELLIGENCE'] },
    { label: 'Go to DOI Reports & Metrics', action: '/doi/reports', roles: ['DIRECTOR_OF_INTELLIGENCE'] },
    { label: 'Go to Intelligence Investigations', action: '/intelligence-officer', roles: ['INTELLIGENCE_OFFICER'] },
    { label: 'Go to Intelligence Reports & Metrics', action: '/intelligence-officer/reports', roles: ['INTELLIGENCE_OFFICER'] },
    { label: 'Go to Investigation Officer Workspace', action: '/investigation-officer', roles: ['INVESTIGATION_OFFICER'] },
    { label: 'Go to Investigation Director Cases', action: '/investigation-director', roles: ['DIRECTOR_OF_INVESTIGATION'] },
    { label: 'Go to Investigation Director Reports', action: '/investigation-director/reports', roles: ['DIRECTOR_OF_INVESTIGATION'] },
    { label: 'Go to Admin Console', action: '/admin', roles: ['Admin'] },
    { label: 'System Sign Out / Logout', action: 'logout', roles: ['SURVEILLANCE_OFFICER', 'STOCK_MANAGER', 'PRSO', 'DEPUTY_PRSO', 'ASSISTANT_COMMISSIONER', 'DIRECTOR_OF_INTELLIGENCE', 'INTELLIGENCE_OFFICER', 'INVESTIGATION_OFFICER', 'DIRECTOR_OF_INVESTIGATION', 'Admin'] }
  ].filter(cmd => !user || cmd.roles.includes(user.role));

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  return (
    <div className="siids-app-shell">
      {/* Global Toast Alert Overlay */}
      <div className="siids-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.severity.toLowerCase()} glass-panel`}>
            <div className="toast-body">
              <span className="toast-icon">
                {toast.severity === 'DANGER' && <AlertTriangle size={16} />}
                {toast.severity === 'WARNING' && <AlertTriangle size={16} />}
                {toast.severity === 'SUCCESS' && <UserCheck size={16} />}
                {toast.severity === 'INFO' && <Activity size={16} />}
              </span>
              <p className="toast-text">{toast.message}</p>
            </div>
            <button className="toast-close-btn" onClick={() => removeToast(toast.id)}>×</button>
          </div>
        ))}
      </div>

      {/* Ctrl + K Command Palette Modal overlay */}
      {showCommandPalette && (
        <div className="command-palette-backdrop" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette-container glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="palette-input-row">
              <Search size={18} className="palette-search-icon" />
              <input 
                type="text" 
                placeholder="Search commands and actions..." 
                autoFocus
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
              />
              <span className="palette-escape-tip">ESC</span>
            </div>
            
            <div className="palette-results-list">
              {filteredCommands.length === 0 ? (
                <div className="palette-empty-state">No commands found.</div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    className="palette-result-item"
                    onClick={() => handlePaletteCommand(cmd.action)}
                  >
                    <Layers size={14} className="cmd-item-icon" />
                    <span>{cmd.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation Column */}
      <aside className="siids-sidebar">
        <div className="sidebar-brand-header">
          <img src="/Images/HomeLogo.jpeg" alt="RRA Logo" className="brand-logo-img" />
          <div className="brand-meta-wrapper">
            <span className="brand-title">SIIDS</span>
            <span className="brand-subtitle">RRA Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav-menu">
          {getNavLinks().map((link) => (
            <button
              key={link.path}
              className={getNavClass(link.path)}
              onClick={() => navigate(link.path)}
            >
              {link.icon}
              <span className="nav-label">{link.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer-profile">
          <div className="user-profile-summary">
            <div className="user-avatar-badge">
              <User size={16} />
            </div>
            <div className="user-text-meta">
              <span className="user-display-name">{user?.name || 'Guest User'}</span>
              <span className="user-role-badge">{user?.role?.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <button className="logout-action-btn" title="Log Out" onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Body Workspace Container */}
      <div className="siids-workspace-container">
        {/* Top Header Panel */}
        <header className="siids-top-header">
          <div className="header-search-box glass-panel" onClick={() => setShowCommandPalette(true)}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search files, cases, or actions... (Ctrl + K)" 
              className="search-input" 
              readOnly 
            />
          </div>

          <div className="header-actions-group">
            <div className="notification-bell-wrapper">
              <button 
                className={`bell-trigger-btn ${notifications.length > 0 ? 'has-unread' : ''}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {notifications.length > 0 && <span className="bell-badge-count">{notifications.length}</span>}
              </button>

              {showNotifications && (
                <div className="notification-bell-dropdown glass-panel">
                  <div className="dropdown-meta-header">
                    <h4>Notifications ({notifications.length})</h4>
                  </div>
                  <div className="dropdown-list-container">
                    {notifications.length === 0 ? (
                      <div className="dropdown-empty-state">No new alerts received.</div>
                    ) : (
                      notifications.map((item, idx) => (
                        <div key={idx} className={`dropdown-item-card severity-${item.severity.toLowerCase()}`}>
                          <p className="dropdown-item-text">{item.message}</p>
                          <span className="dropdown-item-time">Just now</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Core Screen View Port */}
        <main className="siids-viewport-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
