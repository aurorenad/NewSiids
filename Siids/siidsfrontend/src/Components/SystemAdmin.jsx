import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { History, PersonAdd } from '@mui/icons-material';
import AppTable from './ui/AppTable.jsx';
import UserOnboardingForm from './admin/UserOnboardingForm.jsx';
import RoleSelectField from './admin/RoleSelectField.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import { hasPermission } from '../utils/authorization.js';
import { PERMISSIONS } from '../constants/permissions';
import { adminApi } from '../api/adminApi.js';

const ROWS_PER_PAGE = 10;

const SystemAdmin = () => {
  const { authState } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [openRegister, setOpenRegister] = useState(false);
  const [openRole, setOpenRole] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleHistory, setRoleHistory] = useState([]);
  const [accountAudit, setAccountAudit] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    givenName: '',
    familyName: '',
    workEmail: '',
    phoneNumber: '',
    role: '',
  });
  const [newRole, setNewRole] = useState('');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const canCreateUser = hasPermission(authState, PERMISSIONS.USER_CREATE);
  const canUpdateRole = hasPermission(authState, PERMISSIONS.USER_ROLE_UPDATE);
  const canUpdateStatus = hasPermission(authState, PERMISSIONS.USER_STATUS_UPDATE);
  const canViewUserHistory = hasPermission(authState, PERMISSIONS.USER_VIEW);
  const hasActions = canUpdateRole || canUpdateStatus || canViewUserHistory;

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({
        page,
        size: ROWS_PER_PAGE,
        search: searchQuery,
      });
      const pageData = response.data || {};
      setUsers(pageData.content || []);
      setTotalUsers(pageData.totalElements || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterToggle = () => setOpenRegister(!openRegister);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await adminApi.registerUser(formData);
      alert('User created successfully. A password setup token has been emailed to the user.');
      handleRegisterToggle();
      fetchUsers();
      setFormData({
        employeeId: '',
        givenName: '',
        familyName: '',
        workEmail: '',
        phoneNumber: '',
        role: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error registering user.');
    }
  };

  const toggleStatus = async (id) => {
    try {
      await adminApi.deactivateUser(id);
      fetchUsers();
    } catch {
      setError('Error updating status.');
    }
  };

  const handleRoleUpdateOpen = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleChangeReason('');
    setOpenRole(true);
  };

  const handleRoleUpdateSubmit = async () => {
    if (!selectedUser) return;
    if (!roleChangeReason.trim()) {
      setError('Role change reason is required.');
      return;
    }

    try {
      await adminApi.updateUserRole(selectedUser.id, { role: newRole, reason: roleChangeReason.trim() });
      setOpenRole(false);
      setRoleChangeReason('');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error updating role.');
    }
  };

  const handleHistoryOpen = async (user) => {
    setSelectedUser(user);
    setOpenHistory(true);
    setHistoryLoading(true);
    setError('');

    try {
      const [roleHistoryResponse, accountAuditResponse] = await Promise.all([
        adminApi.getRoleHistory(user.username),
        adminApi.getAccountAuditLogs(user.username),
      ]);
      setRoleHistory(roleHistoryResponse.data || []);
      setAccountAudit(accountAuditResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error loading user history.');
      setRoleHistory([]);
      setAccountAudit([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setPage(0);
  };

  const userColumns = useMemo(() => {
    const columns = [
      { key: 'id', label: 'ID', render: (user) => user.id },
      { key: 'username', label: 'Employee ID', render: (user) => user.username || '-' },
      { key: 'role', label: 'Role', render: (user) => user.role || '-' },
      {
        key: 'status',
        label: 'Status',
        render: (user) => (
          <Chip
            label={user.active !== false ? 'Active' : 'Deactivated'}
            color={user.active !== false ? 'success' : 'error'}
            size="small"
          />
        )
      }
    ];

    if (hasActions) {
      columns.push({
        key: 'actions',
        label: 'Actions',
        cellStyle: { minWidth: 280 },
        render: (user) => (
          <Box display="flex" gap={1} flexWrap="wrap">
            {canUpdateRole && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleRoleUpdateOpen(user)}
              >
                Edit Role
              </Button>
            )}
            {canUpdateStatus && (
              <Button
                variant="contained"
                color={user.active !== false ? 'error' : 'success'}
                size="small"
                onClick={() => toggleStatus(user.id)}
              >
                {user.active !== false ? 'Deactivate' : 'Activate'}
              </Button>
            )}
            {canViewUserHistory && (
              <Button
                variant="text"
                size="small"
                startIcon={<History />}
                onClick={() => handleHistoryOpen(user)}
              >
                History
              </Button>
            )}
          </Box>
        )
      });
    }

    return columns;
  }, [hasActions, canUpdateRole, canUpdateStatus, canViewUserHistory]);

  const roleHistoryColumns = useMemo(() => [
    { key: 'changedAt', label: 'Changed At', render: (entry) => formatDateTime(entry.changedAt) },
    { key: 'previousRole', label: 'Previous Role', render: (entry) => entry.previousRole || '-' },
    { key: 'newRole', label: 'New Role', render: (entry) => entry.newRole || '-' },
    { key: 'changedBy', label: 'Changed By', render: (entry) => entry.changedBy || '-' },
    { key: 'reason', label: 'Reason', render: (entry) => entry.reason || '-' },
  ], []);

  const accountAuditColumns = useMemo(() => [
    { key: 'performedAt', label: 'Performed At', render: (entry) => formatDateTime(entry.performedAt) },
    { key: 'action', label: 'Action', render: (entry) => entry.action || '-' },
    { key: 'performedBy', label: 'Performed By', render: (entry) => entry.performedBy || '-' },
    { key: 'details', label: 'Details', render: (entry) => entry.details || '-' },
  ], []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          System Admin - User Management
        </Typography>
        {canCreateUser && (
          <Button startIcon={<PersonAdd />} onClick={handleRegisterToggle}>
            Add New User
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box mb={2}>
        <TextField
          size="small"
          placeholder="Search employee ID, role, or status..."
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          sx={{ width: { xs: '100%', sm: 360 } }}
        />
      </Box>

      <AppTable
        columns={userColumns}
        rows={users}
        loading={loading}
        emptyMessage="No users found"
        page={page}
        rowsPerPage={ROWS_PER_PAGE}
        totalRows={totalUsers}
        onPageChange={(event, nextPage) => setPage(nextPage)}
        minWidth={900}
      />

      {/* Register Dialog */}
      <Dialog
        open={openRegister}
        onClose={handleRegisterToggle}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            overflow: 'visible',
            width: { xs: 'calc(100% - 24px)', sm: '100%' },
            m: { xs: 1.5, sm: 4 },
          },
        }}
      >
        <DialogTitle>Register New User</DialogTitle>
        <form onSubmit={handleRegisterSubmit}>
          <DialogContent sx={{ overflow: 'visible', px: { xs: 2, sm: 3 } }}>
            <UserOnboardingForm formData={formData} onChange={handleFormChange} />
          </DialogContent>
          <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={handleRegisterToggle} variant="outlined">
              Cancel
            </Button>
            <Button type="submit">Register</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={openRole}
        onClose={() => {
          setOpenRole(false);
          setRoleChangeReason('');
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            overflow: 'visible',
            width: { xs: 'calc(100% - 24px)', sm: '100%' },
            m: { xs: 1.5, sm: 4 },
          },
        }}
      >
        <DialogTitle>Update User Role</DialogTitle>
        <DialogContent sx={{ overflow: 'visible', px: { xs: 2, sm: 3 } }}>
          <RoleSelectField
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            label="Reason for role change"
            value={roleChangeReason}
            onChange={(e) => setRoleChangeReason(e.target.value)}
            required
            multiline
            minRows={3}
            fullWidth
            margin="normal"
            placeholder="Example: Employee transferred from Investigation to Legal unit."
          />
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, flexWrap: 'wrap', gap: 1 }}>
          <Button
            onClick={() => {
              setOpenRole(false);
              setRoleChangeReason('');
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button onClick={handleRoleUpdateSubmit} disabled={!newRole || !roleChangeReason.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openHistory}
        onClose={() => setOpenHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User History {selectedUser?.username ? `- ${selectedUser.username}` : ''}
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Role Changes
              </Typography>
              <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
                <AppTable
                  columns={roleHistoryColumns}
                  rows={roleHistory}
                  emptyMessage="No role history found."
                  totalRows={roleHistory.length}
                  minWidth={760}
                  showPagination={false}
                />
              </Paper>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Account Audit
              </Typography>
              <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <AppTable
                  columns={accountAuditColumns}
                  rows={accountAudit}
                  emptyMessage="No account audit logs found."
                  totalRows={accountAudit.length}
                  minWidth={720}
                  showPagination={false}
                />
              </Paper>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemAdmin;
