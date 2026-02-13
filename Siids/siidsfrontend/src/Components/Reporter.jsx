const TaxReportView = ({ formData, handleEdit, handlePrint }) => {
    const currentDate = new Date().toLocaleDateString('en-US');

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
                <table className="w-full border-collapse">
                    <tbody>
                    <tr className="border-b">
                        <td className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-600 w-1/3">Case ID</td>
                        <td className="py-3 px-4">{formData.caseNumber || 'FR00123456789'}</td>
                    </tr>
                    <tr className="border-b">
                        <td className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-600">Informer ID</td>
                        <td className="py-3 px-4">{formData.informerId || 'INF01234567890'}</td>
                    </tr>
                    <tr className="border-b">
                        <td className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-600">Reported Date</td>
                        <td className="py-3 px-4">{formData.reportedDate ? new Date(formData.reportedDate).toLocaleDateString() : '03/28/2025'}</td>
                    </tr>
                    <tr className="border-b">
                        <td className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-600">Tax Payer TIN</td>
                        <td className="py-3 px-4">{formData.taxPayerTin || '6789-012-345'}</td>
                    </tr>
                    <tr className="border-b">
                        <td className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-600">Investigation Officer</td>
                        <td className="py-3 px-4">{formData.intelliceOfficer || 'Agent Smith'}</td>
                    </tr>
                    <tr>
                        <td className="py-3 px-4 bg-gray-100 text-sm font-medium text-gray-600">Issue Description</td>
                        <td className="py-3 px-4">{formData.issueDescription || 'Tax Filing Evasion: Suspect failed to report income from overseas assets'}</td>
                    </tr>
                    </tbody>
                </table>

                <div className="mt-8 text-right text-sm text-gray-600">
                    <p>Issued At: Flagship Data Center</p>
                    <p>Date: {currentDate}</p>
                </div>
            </div>
        </div>
    );
};

export default TaxReportSystem;