import { useEffect, useState } from 'react';
import './../Styles/History.css';
import {AuditApi} from "../api/Axios/caseApi.jsx";

const History = () => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                const response = await AuditApi.getAuditLogs();
                setAuditLogs(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch audit logs:', err);
                setError(err.response?.data?.message || 'Failed to fetch audit logs');
                setLoading(false);
            }
        };

        fetchAuditLogs();
    }, []);

    const formatDateTime = (dateTimeString) => {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        return new Date(dateTimeString).toLocaleDateString(undefined, options);
    };

    if (loading) {
        return <div className="page-container">Loading audit logs...</div>;
    }

    if (error) {
        return <div className="page-container">Error: {error}</div>;
    }

    return (
        <div className="page-container">
            <h2>Audit Logs</h2>

            <section>
                {auditLogs.length === 0 ? (
                    <p>No audit logs found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Description</th>
                                <th>Performed By</th>
                            </tr>
                            </thead>
                            <tbody>
                            {auditLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>{formatDateTime(log.timestamp)}</td>
                                    <td>{log.action}</td>
                                    <td>{log.description}</td>
                                    <td>
                                        {log.performedBy?.firstName} {log.performedBy?.lastName}
                                        {log.performedBy?.employeeId && ` (${log.performedBy.employeeId})`}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default History;