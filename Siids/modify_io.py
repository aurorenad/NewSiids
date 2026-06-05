import re

with open('siidsfrontend/src/Components/IntelligenceOfficer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
content = content.replace(
    "import { DatePicker } from '@mui/x-date-pickers/DatePicker';",
    "import { DatePicker } from '@mui/x-date-pickers/DatePicker';\nimport { SplitWorkspaceLayout } from './ui/SplitWorkspaceLayout';"
)

# 2. Add state
content = content.replace(
    "const [activeTab, setActiveTab] = useState('all');",
    "const [activeTab, setActiveTab] = useState('all');\n    const [selectedCase, setSelectedCase] = useState(null);"
)

# 3. Replace the TableContainer with the SplitWorkspaceLayout wrapper
table_start = content.find("<TableContainer component={Paper} elevation={3}>")
if table_start == -1:
    print("Could not find TableContainer")
    exit(1)

table_end_str = "</TableContainer>"
table_end = content.find(table_end_str, table_start) + len(table_end_str)

table_content = content[table_start:table_end]

# Make table rows clickable
new_table_content = table_content.replace(
    "<TableRow\n                                                key={caseItem.caseNum}",
    "<TableRow\n                                                key={caseItem.id || caseItem.caseNum}\n                                                onClick={() => setSelectedCase(caseItem)}\n                                                selected={selectedCase?.id === caseItem.id}"
)

# Add pointer cursor to hover style
new_table_content = new_table_content.replace(
    "backgroundColor: isReturned ? '#fff3e0' : (caseItem.reportId ? '#f0f9ff' : 'inherit'),",
    "cursor: 'pointer',\n                                                    backgroundColor: isReturned ? '#fff3e0' : (caseItem.reportId ? '#f0f9ff' : 'inherit'),"
)

# Build the layout. We use normal string concatenation instead of f-string 
# so we don't have to escape `{` and `}` for JSX objects.
split_layout = '''
                {/* Cases Table inside Split Workspace Layout */}
                <SplitWorkspaceLayout 
                    isItemSelected={!!selectedCase}
                    leftPane={
''' + new_table_content + '''
                    }
                    rightPane={
                        selectedCase ? (
                            <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                                        Case Detail: {selectedCase.caseNum}
                                    </Typography>
                                    <IconButton onClick={() => setSelectedCase(null)} size="small">
                                        <CloseIcon />
                                    </IconButton>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                
                                <Card elevation={0} sx={{ mb: 2, border: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.5)' }}>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                            {getStatusIcon(selectedCase.status)}
                                            <Chip 
                                                label={selectedCase.status ? selectedCase.status.replace(/_/g, ' ') : 'UNKNOWN'} 
                                                sx={{ 
                                                    backgroundColor: getStatusColor(selectedCase.status),
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                }} 
                                            />
                                        </Box>
                                        
                                        {isReturnedStatus(selectedCase.status) && selectedCase.returnReason && (
                                            <Alert severity="warning" sx={{ mt: 2 }}>
                                                <strong>Revision Required:</strong> {selectedCase.returnReason}
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>

                                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', mt: 3 }}>Information Source</Typography>
                                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="textSecondary">Summary of Evasion Evidence:</Typography>
                                            <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                                {selectedCase.summaryOfInformationCase || 'No summary provided.'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                <Box mt={4} display="flex" gap={2} flexWrap="wrap">
                                    {isReturnedStatus(selectedCase.status) && selectedCase.reportId && (
                                        <Button 
                                            variant="contained" 
                                            color="warning" 
                                            startIcon={<EditIcon />}
                                            onClick={() => handleEditReturnedReport(selectedCase)}
                                        >
                                            Revise Report
                                        </Button>
                                    )}
                                    
                                    {(selectedCase.status === 'CASE_CREATED' || selectedCase.status === 'REPORT_SUBMITTED') && !selectedCase.reportId && (
                                        <Button 
                                            variant="contained" 
                                            color="primary" 
                                            startIcon={<AddIcon />}
                                            onClick={() => navigate(`/intelligence-officer/claim-form/${encodeURIComponent(selectedCase.caseNum)}`)}
                                        >
                                            Generate Report
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        ) : null
                    }
                />
'''

content = content[:table_start] + split_layout + content[table_end:]

with open('siidsfrontend/src/Components/IntelligenceOfficer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Modification successful.")
