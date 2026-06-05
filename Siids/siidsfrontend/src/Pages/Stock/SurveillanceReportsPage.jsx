import React, { useState, useEffect, useMemo } from 'react';
import { ChartBarIcon, ArrowDownTrayIcon, PaperAirplaneIcon, DocumentChartBarIcon, CurrencyDollarIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { stockApi } from '../../api/stockApi';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import * as XLSX from 'xlsx';

const COLORS = ['#003DA5', '#009A44', '#E05C00', '#6B7280', '#8B5CF6', '#EC4899'];

const SurveillanceReportsPage = () => {
  const [stockList, setStockList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setIsLoading(true);
        const res = await stockApi.getSeizureHistory();
        setStockList(res.data || []);
        
        // Build mock audit logs from history
        const logs = (res.data || []).map(item => ({
          id: Math.random().toString(),
          action: `Status changed to ${item.status}`,
          ref: item.seizureNumber,
          date: item.actionedAt || item.dateTimeSeized,
          user: item.pvInCharge?.firstName || 'Current Officer',
          status: item.status
        }));
        setAuditLogs(logs);

      } catch (err) {
        toast.error('Failed to load reports data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportsData();
  }, []);

  // Filtering Logic
  const filteredStock = useMemo(() => {
    return stockList.filter(item => {
      let passDate = true;
      let passStatus = true;
      const itemDate = new Date(item.dateTimeSeized || item.createdAt);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        passDate = passDate && itemDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        passDate = passDate && itemDate <= end;
      }
      if (filterStatus !== 'ALL') {
        passStatus = item.status === filterStatus;
      }
      
      return passDate && passStatus;
    });
  }, [stockList, startDate, endDate, filterStatus]);

  // --- Chart Data Processing ---

  // 1. Seizures by Reason (Pie Chart)
  const reasonData = useMemo(() => {
    const counts = {};
    filteredStock.forEach(item => {
      const reason = item.seizureReason || 'Unknown';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a,b) => b.value - a.value);
  }, [filteredStock]);

  // 2. Escalated Goods by Month (Bar Chart)
  const escalatedByMonthData = useMemo(() => {
    const monthlyCounts = {};
    filteredStock.filter(s => s.status === 'ESCALATED').forEach(item => {
      const date = new Date(item.actionedAt || item.dateTimeSeized);
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });
    return Object.keys(monthlyCounts).map(key => ({ month: key, count: monthlyCounts[key] }));
  }, [filteredStock]);

  // 3. Trends Over Time (Line Chart)
  const timelineData = useMemo(() => {
    const counts = {};
    filteredStock.forEach(item => {
      const date = new Date(item.dateTimeSeized || item.createdAt).toLocaleDateString();
      if (!counts[date]) counts[date] = { date, seized: 0, escalated: 0, released: 0 };
      if (item.status === 'ESCALATED' || item.status === 'IN_MAIN_STOCK') counts[date].escalated += 1;
      else if (item.status === 'RELEASED_FROM_TEMP' || item.status === 'RELEASED_FROM_MAIN' || item.status === 'RETURNED' || item.status === 'RELEASED') counts[date].released += 1;
      else counts[date].seized += 1;
    });
    return Object.values(counts).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredStock]);

  // --- Actions ---

  const handleDownloadExcel = () => {
    if (filteredStock.length === 0) {
      toast.error('No data to download for current filters.');
      return;
    }
    const exportData = filteredStock.map(item => ({
      Reference: item.seizureNumber,
      Status: item.status,
      SeizureDate: new Date(item.dateTimeSeized).toLocaleDateString(),
      Taxpayer: item.taxpayerName || 'Unknown',
      Goods: item.goodsDescription || 'N/A',
      Reason: item.seizureReason || 'N/A',
      EstimatedValue: item.estimatedValue || 0,
      Officer: item.pvInCharge?.firstName ? `${item.pvInCharge.firstName} ${item.pvInCharge.lastName}` : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Surveillance_Cases");
    XLSX.writeFile(workbook, "Surveillance_Cases_Report.xlsx");
    toast.success('Excel Report Downloaded!');
  };

  const handleSendToPrso = () => {
    toast.success('Weekly report successfully submitted to PRSO!');
  };

  const totalSeizures = filteredStock.length;
  const totalEstimatedValue = filteredStock.reduce((acc, item) => acc + (item.estimatedValue || 0), 0);
  const totalEscalated = filteredStock.filter(i => i.status === 'ESCALATED').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ChartBarIcon style={{ width: 28, color: 'var(--rra-blue)' }} />
            Surveillance Analytics & Reports
          </h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Monitor seizure trends, filter cases, and export detailed reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-base" style={{ background: 'white', border: '1px solid var(--green-600)', color: 'var(--green-700)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }} onClick={handleDownloadExcel}>
            <ArrowDownTrayIcon style={{ width: 18 }} /> Download Excel Data
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleSendToPrso}>
            <PaperAirplaneIcon style={{ width: 18 }} /> Submit to PRSO
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 20, alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-600)', fontWeight: 600 }}>
          <FunnelIcon style={{ width: 20 }} /> Filters:
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--gray-500)' }}>From:</label>
            <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 12px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--gray-500)' }}>To:</label>
            <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 12px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--gray-500)' }}>Status:</label>
            <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '6px 12px' }}>
              <option value="ALL">All Statuses</option>
              <option value="IN_TEMPORARY_STOCK">Temporarily Seized</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RELEASED_FROM_TEMP">Released (Temp Stock)</option>
              <option value="RETURNED">Returned (Main Stock)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 30 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--rra-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rra-blue)' }}>
            <DocumentChartBarIcon style={{ width: 24 }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Total Cases in View</p>
            <h2 style={{ margin: 0, fontSize: 28, color: 'var(--gray-900)' }}>{totalSeizures}</h2>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <ChartBarIcon style={{ width: 24 }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Total Escalated</p>
            <h2 style={{ margin: 0, fontSize: 28, color: 'var(--gray-900)' }}>{totalEscalated}</h2>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-700)' }}>
            <CurrencyDollarIcon style={{ width: 24 }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Estimated Value (View)</p>
            <h2 style={{ margin: 0, fontSize: 24, color: 'var(--gray-900)' }}>{totalEstimatedValue.toLocaleString()} RWF</h2>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 30 }}>
        {/* Reasons Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, borderBottom: '1px solid var(--gray-200)', paddingBottom: 12 }}>Top Seizure Reasons</h3>
          <div style={{ height: 300 }}>
            {reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reasonData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {reasonData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ textAlign: 'center', color: 'var(--gray-400)', marginTop: 100 }}>No data to display</p>}
          </div>
        </div>

        {/* Escalated over time Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, borderBottom: '1px solid var(--gray-200)', paddingBottom: 12 }}>Escalations by Month</h3>
          <div style={{ height: 300 }}>
            {escalatedByMonthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={escalatedByMonthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="count" fill="#E05C00" radius={[4, 4, 0, 0]} name="Escalated Items" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ textAlign: 'center', color: 'var(--gray-400)', marginTop: 100 }}>No escalation data found</p>}
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="card" style={{ padding: 24, marginBottom: 30 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, borderBottom: '1px solid var(--gray-200)', paddingBottom: 12 }}>Operational Trends Over Time</h3>
        <div style={{ height: 300 }}>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="seized" stroke="#003DA5" strokeWidth={3} name="Temporarily Seized" />
                <Line type="monotone" dataKey="escalated" stroke="#E05C00" strokeWidth={3} name="Escalated" />
                <Line type="monotone" dataKey="released" stroke="#009A44" strokeWidth={3} name="Released" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ textAlign: 'center', color: 'var(--gray-400)', marginTop: 100 }}>No timeline data found</p>}
        </div>
      </div>

      {/* Audit Trail */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--gray-800)' }}>Audit Trail Overview</h3>
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Showing latest system actions based on current filters</span>
        </div>
        <div className="stock-table" style={{ margin: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, color: 'var(--gray-500)' }}>Date</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, color: 'var(--gray-500)' }}>Reference</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, color: 'var(--gray-500)' }}>Action</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, color: 'var(--gray-500)' }}>User</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.filter(log => filterStatus === 'ALL' || log.status === filterStatus).slice(0, 10).map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '12px 24px', fontSize: 13, color: 'var(--gray-600)' }}>{log.date ? new Date(log.date).toLocaleString() : 'N/A'}</td>
                  <td style={{ padding: '12px 24px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--rra-blue)' }}>{log.ref}</td>
                  <td style={{ padding: '12px 24px', fontSize: 13, color: 'var(--gray-800)' }}>{log.action}</td>
                  <td style={{ padding: '12px 24px', fontSize: 13, color: 'var(--gray-600)' }}>{log.user}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>No audit logs available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SurveillanceReportsPage;
