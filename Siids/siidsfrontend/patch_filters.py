import sys

file_path = "d:/PROGRAMMING/RRA/siids/Siids/Siids/siidsfrontend/src/Components/StockManagement.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add paymentProofFile state
content = content.replace(
    "const [anotherDocumentFile, setAnotherDocumentFile] = useState(null);",
    "const [anotherDocumentFile, setAnotherDocumentFile] = useState(null);\n    const [paymentProofFile, setPaymentProofFile] = useState(null);"
)

# 2. Reset payment proof state in openModal
content = content.replace(
    "setAnotherDocumentFile(null);\n        setShowModal(true);",
    "setAnotherDocumentFile(null);\n        setPaymentProofFile(null);\n        setShowModal(true);"
)

# 3. Handle appending paymentProofFile to form data
content = content.replace(
    "if (anotherDocumentFile) data.append('anotherDocument', anotherDocumentFile);",
    "if (anotherDocumentFile) data.append('anotherDocument', anotherDocumentFile);\n        if (paymentProofFile) data.append('paymentProof', paymentProofFile);"
)

# 4. Filter logic definition
old_filter_logic = """    // --- Filtering logic ---
    const isFilterActive = searchOwner || searchItemName || searchTakenDate || releaseFilter !== 'all';

    const filteredStocks = useMemo(() => {
        return stocks.filter(stock => {
            if (searchOwner && !(stock.ownerName || '').toLowerCase().includes(searchOwner.toLowerCase())) {
                return false;
            }
            if (searchItemName) {
                const itemNames = (stock.items || []).map(i => (i.itemName || '').toLowerCase()).join(' ');
                if (!itemNames.includes(searchItemName.toLowerCase())) {
                    return false;
                }
            }
            if (searchTakenDate && stock.takenDate !== searchTakenDate) {
                return false;
            }
            if (releaseFilter === 'released' && !stock.dateReleased) {
                return false;
            }
            if (releaseFilter === 'not_released' && stock.dateReleased) {
                return false;
            }
            if (releaseFilter === 'damaged' && stock.status !== 'DAMAGED') {
                return false;
            }
            return true;
        });
    }, [stocks, searchOwner, searchItemName, searchTakenDate, releaseFilter]);"""


new_filter_logic = """    // --- Filtering logic ---

    const getStockItemRemainingQuantity = (stock, itemName) => {
        const item = (stock.items || []).find(i => i.itemName === itemName);
        if (!item) return 0;
        const total = parseInt(item.quantity) || 0;
        const released = (stock.releases || [])
            .filter(r => r.releasedItemName === itemName || r.releasedItemName === 'ALL')
            .reduce((sum, r) => sum + (parseInt(r.quantityReleased) || 0), 0);
        return Math.max(0, total - released);
    };

    const isFilterActive = searchOwner || searchItemName || searchTakenDate || releaseFilter !== 'all';

    const filteredStocks = useMemo(() => {
        return stocks.map(stock => {
            if (searchOwner && !(stock.ownerName || '').toLowerCase().includes(searchOwner.toLowerCase())) return null;
            
            if (searchItemName) {
                const itemNames = (stock.items || []).map(i => (i.itemName || '').toLowerCase()).join(' ');
                if (!itemNames.includes(searchItemName.toLowerCase())) return null;
            }
            
            if (searchTakenDate && stock.takenDate !== searchTakenDate) return null;
            
            let filteredItems = [...(stock.items || [])];
            
            if (releaseFilter === 'released') {
                filteredItems = filteredItems.filter(item => {
                    const remaining = getStockItemRemainingQuantity(stock, item.itemName);
                    const original = parseInt(item.quantity) || 0;
                    return remaining < original; // Must be at least partially released
                });
            } else if (releaseFilter === 'not_released') {
                filteredItems = filteredItems.filter(item => {
                    return getStockItemRemainingQuantity(stock, item.itemName) > 0; // Must have some quantity left
                });
            } else if (releaseFilter === 'damaged') {
                if (stock.status !== 'DAMAGED') return null;
            }
            
            if (releaseFilter !== 'all' && releaseFilter !== 'damaged' && filteredItems.length === 0) {
                return null;
            }
            
            return {
                ...stock,
                displayItems: filteredItems
            };
        }).filter(Boolean);
    }, [stocks, searchOwner, searchItemName, searchTakenDate, releaseFilter]);"""

content = content.replace(old_filter_logic, new_filter_logic)

# Replace table maps from stock.items to stock.displayItems
content = content.replace("formatItemsDisplay(stock.items)", "formatItemsDisplay(stock.displayItems || stock.items)")
content = content.replace("formatTotalQuantity(stock.items)", "formatTotalQuantity(stock.displayItems || stock.items)")
content = content.replace("((stock.items || []).map(", "(((stock.displayItems || stock.items) || []).map(")

# 5. Add download endpoint for Payment Proof
# Wait, downloadDocument downloads from main list. 
# Let's add an API to download payment proof from release.
# Wait, payment proof path is returned as part of stock.releases array, not a native accessible path publicly, or does DocumentController handle it? 
# Usually, fetch(`${API_URL}/${stock.id}/document/${docIndex}`) gets the stock docs. 
# We need an endpoint for downloading the release's payment proof. Wait, is there one?
# The user just said "there should be a place that they upload a document called payment proof."
# I'll just save the file. I also should add a button to download the payment proof inside the Past Releases table if one is attached.

# We will need to patch StockController for downloading payment proof.
"""
    @GetMapping("/{id}/payment-proof/{releaseIndex}")
    public ResponseEntity<Resource> downloadPaymentProof(@PathVariable Integer id, @PathVariable int releaseIndex) { ... }
"""

# Let's handle the File Input inside the "Add a new partial release of items" UI
file_input_jsx = """                                        {formData.releaseReason === 'CLEARED' && (
                                            <div className="form-group" style={{gridColumn: '1 / -1'}}>
                                                <label>Upload Payment Proof *</label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => setPaymentProofFile(e.target.files[0])}
                                                    accept=".pdf, image/*"
                                                    required
                                                />
                                            </div>
                                        )}"""

# Insert it around line where releaseReason is handled
# Let's anchor it before the End of the Form Grid
# We can find "{formData.releaseReason === 'MUTATION' && ("
content = content.replace(
    "{formData.releaseReason === 'MUTATION' && (",
    file_input_jsx + "\n                                        {formData.releaseReason === 'MUTATION' && ("
)

# 6. Add 'Proof' column to existing releases table
content = content.replace(
    "<th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>By</th>",
    "<th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>By</th>\n                                                <th style={{padding: '8px', borderBottom: '2px solid #ddd', textAlign: 'left'}}>Proof</th>"
)

content = content.replace(
    "<td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releasedBy}</td>",
    """<td style={{padding: '8px', borderBottom: '1px solid #eee'}}>{r.releasedBy}</td>
                                                    <td style={{padding: '8px', borderBottom: '1px solid #eee'}}>
                                                        {r.paymentProofPath ? (
                                                            <button 
                                                                type="button" 
                                                                className="link-btn" 
                                                                style={{padding:0, fontSize:'12px'}} 
                                                                onClick={() => {
                                                                    fetchWithAuth(`${API_URL}/${currentStock.id}/payment-proof/${i}`)
                                                                    .then(res => res.blob())
                                                                    .then(blob => window.open(window.URL.createObjectURL(blob), '_blank'));
                                                                }}
                                                            >View</button>
                                                        ) : '-'}
                                                    </td>"""
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("success")
