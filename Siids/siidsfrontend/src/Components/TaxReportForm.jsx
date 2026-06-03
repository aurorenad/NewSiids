import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CaseService } from '../api/Axios/caseApi.jsx';
import { AuthContext } from '../context/AuthContext';
import caseApi from '../api/Axios/caseApi.jsx';
import '../Styles/TaxReportForm.css';

const TaxReportForm = () => {
    const { authState } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        tin: '',
        taxPayerName: '',
        taxType: 'None',
        taxPayerAddress: '',
        taxPeriod: '',
        intelligenceOfficer: authState.userId || '',
        reportedDate: new Date().toISOString().split('T')[0],
        summaryOfInformationCase: '',
        status: 'CASE_CREATED',
        caseSource: 'anonymous',
        informerId: '',
        informerName: '',
        referringDepartment: '',
        nationalId: '',
        estimatedEvasionAmount: '',
        intakeChannel: 'Walk-in',
        priorityClassification: 'MEDIUM',
        informerIdType: 'NATIONAL_ID',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeoutId, setTimeoutId] = useState(null);
    const [isSearchingTaxPayer, setIsSearchingTaxPayer] = useState(false);
    const [isSearchingInformer, setIsSearchingInformer] = useState(false);

    // New states for informer registration
    const [showInformerRegistration, setShowInformerRegistration] = useState(false);
    const [newInformerData, setNewInformerData] = useState({
        nationalId: '',
        informerName: '',
        informerGender: '',
        informerPhoneNum: '',
        informerAddress: '',
        informerEmail: ''
    });

    const navigate = useNavigate();
    const location = useLocation();

    const taxTypes = ['None','PAYEE','VAT','Income Tax','Corporate Tax','Withholding Tax','Property Tax',
        'Capital gains','Consumption Tax','Immovable Property Tax', 'Payroll Tax', 'Trading Tax'];

    const caseSources = [
        { value: 'anonymous', label: 'Anonymous' },
        { value: 'referred', label: 'Referred Case' },
        { value: 'identified', label: 'Identified Informer' }
    ];

    const departmentOptions = [
        'Investigation Department',
        'Legal Department',
        'Audit Department',
        'Compliance Department',
        'Tax Assessment Department',
        'Enforcement Department',
        'Other'
    ];

    // Authentication check
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const employeeId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

        if (!token) {
            setError('No authentication token found. Please log in again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        if (!employeeId) {
            setError('Employee ID not found. Please ensure you are properly logged in.');
            return;
        }
    }, [authState.userId, navigate]);

    // Load case data if in edit mode
    useEffect(() => {
        if (location.state?.caseData) {
            const { caseData } = location.state;
            const caseSource = caseData.informerId ? 'identified' :
                caseData.referringDepartment ? 'referred' : 'anonymous';

            setFormData({
                tin: caseData.tin || '',
                taxPayerName: caseData.taxPayerName || '',
                taxType: caseData.taxType || 'None',
                taxPayerAddress: caseData.taxPayerAddress || '',
                taxPeriod: caseData.taxPeriod || '',
                intelligenceOfficer: caseData.reportingOfficer || authState.userId || '',
                reportedDate: caseData.reportedDate || new Date().toISOString().split('T')[0],
                summaryOfInformationCase: caseData.summaryOfInformationCase || '',
                status: caseData.status || 'CASE_CREATED',
                caseSource: caseSource,
                informerId: caseData.informerId ? caseData.informerId.toString() : '',
                informerName: caseData.informerName || '',
                referringDepartment: caseData.referringDepartment || '',
            });
        }
    }, [location.state, authState.userId]);

    // Tax payer lookup by TIN
    const handleTinChange = async (e) => {
        const { value } = e.target;
        
        // Only allow digits and max 9 characters
        if (value !== '' && !/^\d+$/.test(value)) return;
        if (value.length > 9) return;

        handleChange(e);

        if (value.length === 9) {
            setIsSearchingTaxPayer(true);
            try {
                const response = await caseApi.get(`/api/taxpayers/tin/${value}`);
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        taxPayerName: response.data.taxPayerName || prev.taxPayerName,
                        taxPayerAddress: response.data.taxPayerAddress || prev.taxPayerAddress
                    }));
                }
            } catch (error) {
                // If 404, it just means the taxpayer is new, so we do nothing and let the user type.
                if (error.response?.status !== 404) {
                    console.error('Error fetching tax payer:', error);
                }
            } finally {
                setIsSearchingTaxPayer(false);
            }
        }
    };

    // Informer lookup by ID
    const handleInformerIdChange = async (e) => {
        const { value } = e.target;
        handleChange(e);

        if (value) {
            setIsSearchingInformer(true);
            try {
                const response = await caseApi.get(`/api/informers/${value}`);
                if (response.data) {
                    setFormData(prev => ({
                        ...prev,
                        informerName: response.data.informerName || prev.informerName
                    }));
                }
            } catch (error) {
                // If 404, it just means the informer is new, so we do nothing and let the user register them.
                if (error.response?.status !== 404) {
                    console.error('Error fetching informer:', error);
                }
            } finally {
                setIsSearchingInformer(false);
            }
        }
    };

    // Function to register a new informer
    const registerNewInformer = async () => {
        // Validate required fields
        if (!newInformerData.nationalId || !newInformerData.informerName) {
            setError('National ID and Name are required for registration');
            return;
        }

        try {
            const response = await caseApi.post('/api/cases/informers/register', newInformerData);

            if (response.data) {
                // Auto-fill the form with the new informer's data
                setFormData(prev => ({
                    ...prev,
                    informerId: newInformerData.nationalId.toString(),
                    informerName: newInformerData.informerName,
                    caseSource: 'identified'
                }));

                // Clear registration form and close modal
                setNewInformerData({
                    nationalId: '',
                    informerName: '',
                    informerGender: '',
                    informerPhoneNum: '',
                    informerAddress: '',
                    informerEmail: ''
                });
                setShowInformerRegistration(false);
                setSuccess('Informer registered successfully!');
                setError('');
            }
        } catch (error) {
            console.error('Error registering informer:', error);
            if (error.response?.status === 409) {
                setError('An informer with this National ID already exists.');
            } else {
                setError('Failed to register informer. Please try again.');
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle new informer form changes
    const handleNewInformerChange = (e) => {
        const { name, value } = e.target;
        setNewInformerData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!formData.tin) {
            setError('Tax Payer TIN is required');
            return false;
        }
        if (!formData.taxPayerName) {
            setError('Tax Payer Name is required');
            return false;
        }
        if (!formData.summaryOfInformationCase) {
            setError('Summary of information is required');
            return false;
        }
        if (formData.caseSource === 'identified' && !formData.informerId) {
            setError('Informer ID is required for identified informers');
            return false;
        }
        if (formData.caseSource === 'referred' && !formData.referringDepartment) {
            setError('Referring department is required for referred cases');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const caseData = {
                tin: formData.tin,
                taxPayerName: formData.taxPayerName,
                taxPayerAddress: formData.taxPayerAddress,
                taxType: formData.taxType,
                taxPeriod: formData.taxPeriod,
                summaryOfInformationCase: formData.summaryOfInformationCase,
                informerType: formData.caseSource === 'anonymous' ? 'anonymous' : 'identified',
                informerNationalId: formData.caseSource === 'identified' ? (formData.informerId) : null,
                informerName: formData.caseSource === 'identified' ? formData.informerName : null,
                informerPhoneNum: formData.caseSource === 'identified' ? '' : null,
                informerAddress: formData.caseSource === 'identified' ? '' : null,
                informerEmail: formData.caseSource === 'identified' ? '' : null,
                referringDepartment: formData.caseSource === 'referred' ? formData.referringDepartment : null,
                estimatedEvasionAmount: formData.estimatedEvasionAmount ? parseFloat(formData.estimatedEvasionAmount) : null,
                intakeChannel: formData.intakeChannel,
                priorityClassification: formData.priorityClassification,
                informerIdType: formData.caseSource === 'identified' ? formData.informerIdType : null,
            };

            console.log('Submitting case data:', caseData);

            const response = await CaseService.createCase(caseData);
            console.log('Response received:', response.data);

            if (response.data) {
                setSuccess('Case created successfully!');
                const id = setTimeout(() => navigate('/intelligence-officer'), 2000);
                setTimeoutId(id);
            }
        } catch (err) {
            console.error('Error creating case:', err);
            if (err.response?.status === 401) {
                setError('Session expired. Please log in again.');
                const id = setTimeout(() => navigate('/login'), 2000);
                setTimeoutId(id);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to create case. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [timeoutId]);

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>New Case Report</h1>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <i className="fas fa-check-circle"></i> {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="tax-report-form">
                    {/* SECTION 1: REPORT CLASSIFICATION */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.7)' }}>
                        <h4 style={{ marginBottom: '15px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>I. Report Classification</h4>
                        <div className="tax-report-form-grid">
                            <div className="form-group">
                                <label className="tax-report-form-label">Intake Channel</label>
                                <select 
                                    name="intakeChannel" 
                                    value={formData.intakeChannel} 
                                    onChange={handleChange} 
                                    className="tax-report-form-input"
                                >
                                    <option value="Walk-in">Walk-in / In-person</option>
                                    <option value="Hotline">Hotline / Phone Call</option>
                                    <option value="Email">Email Submission</option>
                                    <option value="Digital Platform">Digital Platform</option>
                                    <option value="Referral">Departmental Referral</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label className="tax-report-form-label">Priority Classification</label>
                                <select 
                                    name="priorityClassification" 
                                    value={formData.priorityClassification} 
                                    onChange={handleChange} 
                                    className="tax-report-form-input"
                                >
                                    <option value="LOW">Low (Routine Verification)</option>
                                    <option value="MEDIUM">Medium (Standard Investigation)</option>
                                    <option value="HIGH">High (Significant Revenue Risk)</option>
                                    <option value="URGENT">Urgent (Immediate Action Required)</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label className="tax-report-form-label">Estimated Evasion Amount (RWF)</label>
                                <input 
                                    type="number" 
                                    name="estimatedEvasionAmount"
                                    value={formData.estimatedEvasionAmount} 
                                    onChange={handleChange} 
                                    className="tax-report-form-input"
                                    placeholder="e.g. 15000000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SUBJECT DETAILS */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.7)' }}>
                        <h4 style={{ marginBottom: '15px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>II. Subject (Tax Payer) Information</h4>
                        <div className="tax-report-form-grid">
                        {/* TIN Field */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer TIN*</label>
                            <input
                                type="text"
                                name="tin"
                                value={formData.tin}
                                onChange={handleTinChange}
                                className="tax-report-form-input"
                                placeholder="Enter 9-digit TIN"
                                maxLength="9"
                                required
                            />
                            {isSearchingTaxPayer && (
                                <div className="search-indicator">Searching tax payer...</div>
                            )}
                        </div>

                        {/* Tax Payer Name */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer Name*</label>
                            <input
                                type="text"
                                name="taxPayerName"
                                value={formData.taxPayerName}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter tax payer name"
                                required
                            />
                        </div>

                        {/* Tax Type */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Type</label>
                            <select
                                name="taxType"
                                value={formData.taxType}
                                onChange={handleChange}
                                className="tax-report-form-input"
                            >
                                {taxTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tax Payer Address */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Payer Address</label>
                            <input
                                type="text"
                                name="taxPayerAddress"
                                value={formData.taxPayerAddress}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="Enter tax payer address"
                            />
                        </div>

                        {/* Tax Period */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Period</label>
                            <input
                                type="text"
                                name="taxPeriod"
                                value={formData.taxPeriod}
                                onChange={handleChange}
                                className="tax-report-form-input"
                                placeholder="e.g. March 2023, Q2 2023, FY2023"
                            />
                        </div>
                        </div>
                    </div>

                    {/* SECTION 3: INFORMER IDENTITY & DIGITAL VERIFICATION */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.7)' }}>
                        <h4 style={{ marginBottom: '15px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>III. Informer Identity & Verification</h4>
                        <div className="tax-report-form-grid">

                        {/* Case Source Dropdown */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Case Source*</label>
                            <select
                                name="caseSource"
                                value={formData.caseSource}
                                onChange={(e) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        caseSource: e.target.value,
                                        informerId: '',
                                        informerName: '',
                                        referringDepartment: '',
                                    }));
                                }}
                                className="tax-report-form-input"
                                required
                            >
                                {caseSources.map(source => (
                                    <option key={source.value} value={source.value}>{source.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Identified Informer Fields */}
                        {formData.caseSource === 'identified' && (
                            <>
                                <div className="form-group">
                                    <label className="tax-report-form-label">Document Type</label>
                                    <select 
                                        name="informerIdType" 
                                        value={formData.informerIdType} 
                                        onChange={handleChange} 
                                        className="tax-report-form-input"
                                    >
                                        <option value="NATIONAL_ID">National ID (16 digits)</option>
                                        <option value="PASSPORT">Passport (up to 16 chars)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="tax-report-form-label">
                                        {formData.informerIdType === 'NATIONAL_ID' ? 'National ID*' : 'Passport Number*'}
                                    </label>
                                    <div className="informer-search-container">
                                        <input
                                            type="text"
                                            name="informerId"
                                            value={formData.informerId}
                                            onChange={handleInformerIdChange}
                                            className="tax-report-form-input"
                                            placeholder={formData.informerIdType === 'NATIONAL_ID' ? 'e.g. 1199080012345678' : 'e.g. RW1234567'}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="register-informer-btn"
                                            onClick={() => setShowInformerRegistration(true)}
                                        >
                                            <i className="fas fa-user-plus"></i> Register Foreigner
                                        </button>
                                    </div>
                                    {isSearchingInformer && (
                                        <div className="search-indicator">Searching informer...</div>
                                    )}
                                    {!isSearchingInformer && !formData.informerName && formData.informerId && (
                                        <div className="search-indicator not-found">
                                            Informer not found. <a href="#" onClick={() => setShowInformerRegistration(true)}>Register now</a>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="tax-report-form-label">Informer Name</label>
                                    <input
                                        type="text"
                                        name="informerName"
                                        value={formData.informerName}
                                        onChange={handleChange}
                                        className="tax-report-form-input"
                                        placeholder="Enter informer name"
                                    />
                                </div>
                            </>
                        )}

                        {/* Referred Case Fields */}
                        {formData.caseSource === 'referred' && (
                            <div className="form-group full-width">
                                <label className="tax-report-form-label">Referring Department*</label>
                                <div className="department-input-container">
                                    <select
                                        name="referringDepartment"
                                        value={formData.referringDepartment}
                                        onChange={handleChange}
                                        className="tax-report-form-input"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departmentOptions.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                        <option value="Other">Other (Specify below)</option>
                                    </select>

                                    {formData.referringDepartment === 'Other' && (
                                        <input
                                            type="text"
                                            name="referringDepartmentCustom"
                                            value={formData.referringDepartment}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                referringDepartment: e.target.value
                                            }))}
                                            className="tax-report-form-input mt-2"
                                            placeholder="Enter department name"
                                            required
                                        />
                                    )}
                                </div>
                                <div className="field-hint">
                                    Select or enter the department that referred this case
                                </div>
                            </div>
                        )}

                        {/* Summary of Information */}
                        <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
                            <label className="tax-report-form-label">Summary of Information Provided*</label>
                            <textarea
                                name="summaryOfInformationCase"
                                value={formData.summaryOfInformationCase}
                                onChange={handleChange}
                                rows="4"
                                className="tax-report-form-textarea"
                                placeholder="Detailed description of the evasion evidence, location, methods, etc."
                                required
                            />
                        </div>
                        </div>
                    </div>

                    <div className="tax-report-form-buttons">
                        <button
                            type="button"
                            className="tax-report-form-button tax-report-form-button-cancel"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="tax-report-form-button tax-report-form-button-save"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Processing...
                                </>
                            ) : (
                                'Create Case'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Informer Registration Modal */}
            {showInformerRegistration && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Register Foreigner Informer</h3>
                            <button
                                className="modal-close"
                                onClick={() => {
                                    setShowInformerRegistration(false);
                                    setError('');
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        <div className="modal-body">
                            {error && (
                                <div className="alert alert-error modal-error">
                                    <i className="fas fa-exclamation-circle"></i> {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="tax-report-form-label">PassPort Number*</label>
                                <input
                                    type="text"
                                    name="nationalId"
                                    value={newInformerData.nationalId}
                                    onChange={handleNewInformerChange}
                                    className="tax-report-form-input"
                                    placeholder="Enter PassPort number"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="tax-report-form-label">Full Name*</label>
                                <input
                                    type="text"
                                    name="informerName"
                                    value={newInformerData.informerName}
                                    onChange={handleNewInformerChange}
                                    className="tax-report-form-input"
                                    placeholder="Enter informer's full name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="tax-report-form-label">Gender</label>
                                <select
                                    name="informerGender"
                                    value={newInformerData.informerGender}
                                    onChange={handleNewInformerChange}
                                    className="tax-report-form-input"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="tax-report-form-label">Phone Number</label>
                                <input
                                    type="tel"
                                    name="informerPhoneNum"
                                    value={newInformerData.informerPhoneNum}
                                    onChange={handleNewInformerChange}
                                    className="tax-report-form-input"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <div className="form-group">
                                <label className="tax-report-form-label">Email</label>
                                <input
                                    type="email"
                                    name="informerEmail"
                                    value={newInformerData.informerEmail}
                                    onChange={handleNewInformerChange}
                                    className="tax-report-form-input"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div className="form-group">
                                <label className="tax-report-form-label">Address</label>
                                <textarea
                                    name="informerAddress"
                                    value={newInformerData.informerAddress}
                                    onChange={handleNewInformerChange}
                                    className="tax-report-form-input"
                                    placeholder="Enter informer's address"
                                    rows="2"
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="tax-report-form-button tax-report-form-button-cancel"
                                onClick={() => {
                                    setShowInformerRegistration(false);
                                    setError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="tax-report-form-button tax-report-form-button-save"
                                onClick={registerNewInformer}
                            >
                                Register Informer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxReportForm;