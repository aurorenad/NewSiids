import AppTable from './ui/AppTable.jsx';

const detailColumns = [
    {
        key: 'label',
        label: 'Field',
        cellStyle: { fontWeight: 600, width: '33%', background: 'var(--gray-50)' },
    },
    {
        key: 'value',
        label: 'Value',
        render: (row) => row.value,
    },
];

const TaxReportView = ({ formData, handleEdit, handlePrint }) => {
    const currentDate = new Date().toLocaleDateString('en-US');
    const rows = [
        { label: 'Case ID', value: formData.caseNumber || 'FR00123456789' },
        { label: 'Informer ID', value: formData.informerId || 'INF01234567890' },
        { label: 'Reported Date', value: formData.reportedDate ? new Date(formData.reportedDate).toLocaleDateString() : '03/28/2025' },
        { label: 'Tax Payer TIN', value: formData.taxPayerTin || '6789-012-345' },
        { label: 'Investigation Officer', value: formData.intelliceOfficer || 'Agent Smith' },
        { label: 'Issue Description', value: formData.issueDescription || 'Tax Filing Evasion: Suspect failed to report income from overseas assets' },
    ];

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-100 p-4 border-b flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-800">Tax Report</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleEdit}
                        className="px-3 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-md text-sm transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm transition-colors"
                    >
                        Print
                    </button>
                </div>
            </div>

            <div className="p-6">
                <AppTable
                    columns={detailColumns}
                    rows={rows}
                    rowKey={(row) => row.label}
                    totalRows={rows.length}
                    minWidth={520}
                    showHeader={false}
                    showPagination={false}
                    emptyMessage="No report details available"
                />

                <div className="mt-8 text-right text-sm text-gray-600">
                    <p>Issued At: Flagship Data Center</p>
                    <p>Date: {currentDate}</p>
                </div>
            </div>
        </div>
    );
};

export default TaxReportView;
