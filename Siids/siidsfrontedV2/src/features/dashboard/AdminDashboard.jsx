import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { SplitWorkspaceLayout } from '../../components/ui/SplitWorkspaceLayout';
import { GlassMetricCard } from '../../components/ui/GlassMetricCard';
import { StatusBadgeSystem } from '../../components/ui/StatusBadgeSystem';
import { AppShell } from '../../components/layout/AppShell';
import { 
  Users, UserPlus, ShieldAlert, Check, X, 
  Settings, Key, AlertCircle, Edit, RefreshCw 
} from 'lucide-react';
import './AdminDashboard.css';

const ROLE_OPTIONS = [
  { value: 'Admin', label: 'Administrator' },
  { value: 'SURVEILLANCE_OFFICER', label: 'Surveillance Officer' },
  { value: 'STOCK_MANAGER', label: 'Stock Manager' },
  { value: 'PRSO', label: 'PRSO' },
  { value: 'DEPUTY_PRSO', label: 'Deputy PRSO' },
  { value: 'INTELLIGENCE_OFFICER', label: 'Intelligence Officer' },
  { value: 'ASSISTANT_COMMISSIONER', label: 'Assistant Commissioner' },
  { value: 'DIRECTOR_OF_INTELLIGENCE', label: 'Director of Intelligence' },
  { value: 'DIRECTOR_OF_INVESTIGATION', label: 'Director of Investigation' },
  { value: 'INVESTIGATION_OFFICER', label: 'Investigation Officer' }
];

export const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Registration Form State
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('INTELLIGENCE_OFFICER');

  // Role Edit Form State
  const [editRole, setEditRole] = useState('');
  const [showEditRoleForm, setShowEditRoleForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch Users
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').catch(() => ({ data: [] }))
  });
  const usersList = Array.isArray(usersResponse?.data)
    ? usersResponse.data
    : (usersResponse?.data?.data || []);

  // KPI Metrics
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter(u => u.active !== false).length;
  const adminCount = usersList.filter(u => u.role === 'Admin').length;

  // Register User Mutation
  const registerUserMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/admin/register-user', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setNewUsername('');
      setSuccessMsg('User account successfully registered. Welcome invitation dispatched.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err) => {
      setErrorMsg(err.error?.message || 'Failed to register new user. Verify employee ID holds matching records.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  // Toggle Deactivation Mutation
  const toggleDeactivateMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/users/${id}/deactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setSelectedUser(null);
    }
  });

  // Edit Role Mutation
  const editRoleMutation = useMutation({
    mutationFn: ({ id, role }) => apiClient.put(`/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setSelectedUser(null);
      setShowEditRoleForm(false);
    }
  });

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!newUsername) return;
    registerUserMutation.mutate({
      username: newUsername.trim(),
      role: newRole
    });
  };

  const handleToggleStatus = (id) => {
    toggleDeactivateMutation.mutate(id);
  };

  const handleRoleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    editRoleMutation.mutate({
      id: selectedUser.id,
      role: editRole
    });
  };

  // LEFT COLUMN VIEW
  const leftPaneView = (
    <div className="admin-left-workspace">
      {/* Metric Cards */}
      <div className="metrics-grid-row">
        <GlassMetricCard title="System Personnel" value={totalUsers} icon={<Users size={16} />} />
        <GlassMetricCard title="Active Sessions" value={activeUsers} icon={<Check size={16} />} />
        <GlassMetricCard title="System Admins" value={adminCount} icon={<Settings size={16} />} />
      </div>

      {/* User Table Grid */}
      <div className="main-stock-table-card glass-panel">
        <div className="table-header-row">
          <h3>User Management Accounts</h3>
        </div>
        {isLoading ? (
          <div className="table-loading-msg">Loading credentials directory...</div>
        ) : (
          <table className="siids-virtual-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Employee ID</th>
                <th>Assigned Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usersList.length === 0 ? (
                <tr><td colSpan={4} className="table-empty-cell">No registered users in the database directory.</td></tr>
              ) : (
                usersList.map(item => (
                  <tr 
                    key={item.id} 
                    className={`virtual-row-item ${selectedUser?.id === item.id ? 'row-selected' : ''}`}
                    onClick={() => {
                      setSelectedUser(item);
                      setEditRole(item.role);
                      setShowEditRoleForm(false);
                    }}
                  >
                    <td>{item.id}</td>
                    <td className="desc-cell-title">{item.username}</td>
                    <td><span className="warning-text-badge">{item.role}</span></td>
                    <td>
                      <span className={`status-badge ${item.active !== false ? 'status-active' : 'status-inactive'}`}>
                        {item.active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // RIGHT COLUMN VIEW
  const rightPaneView = (
    <div className="admin-right-workspace">
      {selectedUser ? (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header">
            <h3>Account Controls Pane</h3>
            <button className="panel-close-trigger" onClick={() => setSelectedUser(null)}><X size={16} /></button>
          </div>

          <div className="inspector-details-card">
            <h2>User Account ID: #{selectedUser.id}</h2>
            <div className="detail-meta-table">
              <div className="meta-row"><span className="meta-lbl">Employee ID:</span> <span>{selectedUser.username}</span></div>
              <div className="meta-row"><span className="meta-lbl">Current Role:</span> <strong>{selectedUser.role}</strong></div>
              <div className="meta-row">
                <span className="meta-lbl">System Status:</span> 
                <span className={`status-badge ${selectedUser.active !== false ? 'status-active' : 'status-inactive'}`}>
                  {selectedUser.active !== false ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Actions Block */}
            <div className="admin-actions-section">
              <button 
                type="button"
                className="btn-admin-edit-role"
                onClick={() => setShowEditRoleForm(!showEditRoleForm)}
              >
                <Edit size={14} />
                <span>Change User Role</span>
              </button>

              <button 
                type="button"
                className={`btn-admin-status-toggle ${selectedUser.active !== false ? 'btn-deactivate' : 'btn-activate'}`}
                onClick={() => handleToggleStatus(selectedUser.id)}
              >
                <RefreshCw size={14} />
                <span>{selectedUser.active !== false ? 'Deactivate Account' : 'Activate Account'}</span>
              </button>
            </div>

            {/* Edit Role Inline Form */}
            {showEditRoleForm && (
              <form onSubmit={handleRoleSubmit} className="edit-role-form-inline glass-panel">
                <h4>Modify Assigned Role</h4>
                <div className="form-input-group">
                  <label>Role</label>
                  <select 
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="action-form-buttons">
                  <button type="submit" className="btn-form-confirm">Update Role</button>
                  <button type="button" className="btn-form-cancel" onClick={() => setShowEditRoleForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="workspace-inspector-panel">
          <div className="inspector-panel-header">
            <h3>Register New User Account</h3>
          </div>

          <form onSubmit={handleRegisterSubmit} className="admin-register-form">
            <p className="register-form-subtitle">Provision account access by matching employee records with organizational roles.</p>
            
            {successMsg && <div className="admin-success-banner">{successMsg}</div>}
            {errorMsg && <div className="admin-error-banner">{errorMsg}</div>}

            <div className="form-input-group">
              <label>Employee ID / Username</label>
              <input 
                type="text" 
                required
                placeholder="Enter RRA username (e.g. 00763)"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>

            <div className="form-input-group">
              <label>Assigned Operational Role</label>
              <select 
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-admin-submit-register">
              <UserPlus size={16} />
              <span>Register User Account</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <AppShell>
      <SplitWorkspaceLayout 
        leftPane={leftPaneView} 
        rightPane={rightPaneView} 
        isItemSelected={!!selectedUser}
      />
    </AppShell>
  );
};

export default AdminDashboard;
