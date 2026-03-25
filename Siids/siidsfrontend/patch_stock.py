import sys
import re

file_path = "d:/PROGRAMMING/RRA/siids/Siids/Siids/siidsfrontend/src/Components/StockManagement.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update downloadGeneratedReleaseDoc
content = content.replace(
    "const downloadGeneratedReleaseDoc = async (id) => {\n        try {\n            const response = await fetchWithAuth(`${API_URL}/${id}/release-document`);",
    "const downloadGeneratedReleaseDoc = async (id, index = 0) => {\n        try {\n            const response = await fetchWithAuth(`${API_URL}/${id}/release-document/${index}`);"
)

content = content.replace(
    "link.setAttribute('download', `ReleaseNote-${id}.pdf`);",
    "link.setAttribute('download', `ReleaseNote-${id}-Release${index + 1}.pdf`);"
)

# 2. Update handleSubmit to send releases
old_submission = """            items: formData.items.map(item => {
                const category = item.item === 'OTHER' ? (item.newCategory || 'OTHER').toUpperCase() : item.item;
                return {
                    itemName: item.itemName,
                    item: category,
                    quantity: parseInt(item.quantity) || 0,
                    measurementUnit: item.measurementUnit,
                    plateNumber: category === 'VEHICLE' ? item.plateNumber : null,
                    chassisNumber: category === 'VEHICLE' ? item.chassisNumber : null,
                    vehicleType: category === 'VEHICLE' ? item.vehicleType : null
                };
            }),
            dateReleased: formData.dateReleased || null,
            releasedItem: formData.dateReleased ? (formData.releasedItem || null) : null,
            quantityReleased: formData.dateReleased ? (parseInt(formData.quantityReleased) || null) : null,
            soldAmount: formData.dateReleased && formData.releaseReason === 'CYAMUNARA' ? (parseFloat(formData.soldAmount) || null) : null,
            reason: formData.reason,
            releaseReason: formData.releaseReason,
            newPlateNumber: formData.releaseReason === 'MUTATION' ? formData.newPlateNumber : null,
            newOwner: formData.releaseReason === 'MUTATION' ? formData.newOwner : null,
            releasedBy: formData.dateReleased ? (localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || '') : null,
            addedBy: currentStock ? currentStock.addedBy : (localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || '')"""

new_submission = """            items: formData.items.map(item => {
                const category = item.item === 'OTHER' ? (item.newCategory || 'OTHER').toUpperCase() : item.item;
                return {
                    itemName: item.itemName,
                    item: category,
                    quantity: parseInt(item.quantity) || 0,
                    measurementUnit: item.measurementUnit,
                    plateNumber: category === 'VEHICLE' ? item.plateNumber : null,
                    chassisNumber: category === 'VEHICLE' ? item.chassisNumber : null,
                    vehicleType: category === 'VEHICLE' ? item.vehicleType : null
                };
            }),
            releases: [
                ...(currentStock?.releases || []),
                ...(formData.dateReleased ? [{
                    dateReleased: formData.dateReleased,
                    releasedItemName: formData.releasedItem,
                    quantityReleased: parseInt(formData.quantityReleased) || null,
                    soldAmount: formData.releaseReason === 'CYAMUNARA' ? (parseFloat(formData.soldAmount) || null) : null,
                    reason: formData.reason,
                    releaseReason: formData.releaseReason,
                    newPlateNumber: formData.releaseReason === 'MUTATION' ? formData.newPlateNumber : null,
                    newOwner: formData.releaseReason === 'MUTATION' ? formData.newOwner : null,
                    releasedBy: localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || ''
                }] : [])
            ],
            addedBy: currentStock ? currentStock.addedBy : (localStorage.getItem('name') || sessionStorage.getItem('name') || authState.name || '')"""

content = content.replace(old_submission, new_submission)


# 3. Update downloadGeneratedReleaseDoc call in handleSubmit
content = content.replace(
    "if (formData.dateReleased) {\n                    downloadGeneratedReleaseDoc(savedStock.id);\n                }",
    "if (formData.dateReleased) {\n                    downloadGeneratedReleaseDoc(savedStock.id, (savedStock.releases?.length || 1) - 1);\n                }"
)


# 4. Update the Table body rendering (dates, quantities, amounts, download action)
old_table_cells = """                                        <td>
                                            {stock.dateReleased ? (
                                                <span className="released-badge">{stock.dateReleased}</span>
                                            ) : (
                                                <span className="not-released-badge">Not Released</span>
                                            )}
                                        </td>
                                        <td>{stock.quantityReleased || '-'}</td>
                                        <td>{stock.soldAmount ? `${stock.soldAmount} RWF` : '-'}</td>
                                        <td>
                                            {stock.documentPaths && stock.documentPaths.map((path, idx) => (
                                                <button key={idx} className="link-btn" onClick={() => downloadDocument(stock.id, idx)}>Doc {idx + 1}</button>
                                            ))}
                                        </td>
                                        <td className="actions-cell">
                                            <button className="icon-btn edit-btn" onClick={() => openEditModal(stock)} title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button className="icon-btn delete-btn" onClick={() => handleDelete(stock.id)} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                            <button 
                                                className="icon-btn download-btn" 
                                                onClick={() => stock.dateReleased ? downloadGeneratedReleaseDoc(stock.id) : generateStockPdf(stock)} 
                                                title={stock.dateReleased ? "Download Release Note" : "Download Stock Info"}
                                            >
                                                <Download size={18} />
                                            </button>
                                        </td>"""

new_table_cells = """                                        <td>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    {stock.releases.map((r, i) => (
                                                        <span key={i} className="released-badge" style={{fontSize: '0.75rem', padding: '2px 6px'}}>{r.dateReleased}</span>
                                                    ))}
                                                </div>
                                            ) : stock.dateReleased ? (
                                                <span className="released-badge">{stock.dateReleased}</span>
                                            ) : (
                                                <span className="not-released-badge">Not Released</span>
                                            )}
                                        </td>
                                        <td>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    {stock.releases.map((r, i) => <div key={i}>{r.quantityReleased}</div>)}
                                                </div>
                                            ) : stock.quantityReleased || '-'}
                                        </td>
                                        <td>
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    {stock.releases.map((r, i) => <div key={i}>{r.soldAmount ? `${r.soldAmount} RWF` : '-'}</div>)}
                                                </div>
                                            ) : stock.soldAmount ? `${stock.soldAmount} RWF` : '-'}
                                        </td>
                                        <td>
                                            {stock.documentPaths && stock.documentPaths.map((path, idx) => (
                                                <button key={idx} className="link-btn" onClick={() => downloadDocument(stock.id, idx)}>Doc {idx + 1}</button>
                                            ))}
                                        </td>
                                        <td className="actions-cell">
                                            <button className="icon-btn edit-btn" onClick={() => openEditModal(stock)} title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button className="icon-btn delete-btn" onClick={() => handleDelete(stock.id)} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                            
                                            {stock.releases && stock.releases.length > 0 ? (
                                                <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                                                    {stock.releases.map((r, i) => (
                                                        <button key={i} className="icon-btn download-btn" onClick={() => downloadGeneratedReleaseDoc(stock.id, i)} title={`Download Release ${i + 1}`}>
                                                            <Download size={16} /><span style={{fontSize: '9px', fontWeight:'bold'}}>{i+1}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : stock.dateReleased ? (
                                                <button className="icon-btn download-btn" onClick={() => downloadGeneratedReleaseDoc(stock.id)} title="Download Release Note">
                                                    <Download size={18} />
                                                </button>
                                            ) : (
                                                <button className="icon-btn download-btn" onClick={() => generateStockPdf(stock)} title="Download Stock Info">
                                                    <Download size={18} />
                                                </button>
                                            )}
                                        </td>"""

content = content.replace(old_table_cells, new_table_cells)

# 5. Add Existing Releases section into Modal
existing_releases_jsx = """                            {/* Existing Releases Section */}
                            {currentStock && currentStock.releases && currentStock.releases.length > 0 && (
                                <div className="existing-releases-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                    <h4 style={{marginBottom: '10px'}}>Past Releases</h4>
                                    <table className="content-table" style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
                                        <thead>
                                            <tr>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Date</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Item</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Qty</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Reason</th>
                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentStock.releases.map((r, i) => (
                                                <tr key={i}>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.dateReleased}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releasedItemName}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.quantityReleased}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releaseReason}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releasedBy}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Release Section (For Adding New) */}
                            <div className="release-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>"""

content = content.replace("                            {/* Release Section */}\n                            <div className=\"release-section\" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>", existing_releases_jsx)

# 6. Change "Do you want to release an item?" text to "Add a new partial release of items?" to make it clear this adds another release
content = content.replace(
    '<label htmlFor="releaseCheckbox" style={{ cursor: \'pointer\', marginBottom: 0 }}>Do you want to release an item?</label>',
    '<label htmlFor="releaseCheckbox" style={{ cursor: \'pointer\', marginBottom: 0, fontWeight: \'bold\' }}>Add a new partial release of items?</label>'
)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced content successfully.")
