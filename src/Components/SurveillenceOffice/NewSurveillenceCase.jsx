import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CaseService } from '../../api/Axios/caseApi.jsx';
import { AuthContext } from '../../context/AuthContext';
import caseApi from '../../api/Axios/caseApi.jsx';
import '../../Styles/NewSurveillenceCases.css';

const NewSurveillenceCase = () => {
    const { authState } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        tin: '',
        taxPayerName: '',
        taxPayerType: 'Individual',
        taxPayerAddress: '',
        taxPeriod: '',
        reportedDate: new Date().toISOString().split('T')[0],
        summaryOfInformationCase: '',
        caseSource: 'anonymous',
        informerId: '',
        informerName: '',
        referringOfficerId: '',
        referringOfficerName: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeoutId, setTimeoutId] = useState(null);
    const [isSearchingTaxPayer, setIsSearchingTaxPayer] = useState(false);
    const [isSearchingInformer, setIsSearchingInformer] = useState(false);
    const [isSearchingReferringOfficer, setIsSearchingReferringOfficer] = useState(false);
    const [referringOfficerError, setReferringOfficerError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const taxPayerTypes = ['None','PAYEE','VAT','Income Tax','Corporate Tax','Withholding Tax','Property Tax',
        'Capital gains','Consumption Tax','Immovable Property Tax', 'Payroll Tax', 'Trading Tax'];

    const caseSources = [
        { value: 'anonymous', label: 'Anonymous' },
        { value: 'referred', label: 'Referred Case' },
        { value: 'identified', label: 'Identified Informer' }
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
                caseData.referringOfficerId ? 'referred' : 'anonymous';

            setFormData({
                tin: caseData.tin || '',
                taxPayerName: caseData.taxPayerName || '',
                taxPayerType: caseData.taxPayerType || 'Individual',
                taxPayerAddress: caseData.taxPayerAddress || '',
                taxPeriod: caseData.taxPeriod || '',
                reportedDate: caseData.reportedDate || new Date().toISOString().split('T')[0],
                summaryOfInformationCase: caseData.summaryOfInformationCase || '',
                caseSource: caseSource,
                informerId: caseData.informerId ? caseData.informerId.toString() : '',
                informerName: caseData.informerName || '',
                referringOfficerId: caseData.referringOfficerId || '',
                referringOfficerName: caseData.referringOfficerName || ''
            });
        }
    }, [location.state, authState.userId]);

    // Tax payer lookup by TIN
    const handleTinChange = async (e) => {
        const { value } = e.target;
        handleChange(e);

        if (value.length >= 3) {
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
                console.error('Error fetching tax payer:', error);
            } finally {
                setIsSearchingTaxPayer(false);
            }
        }
    };


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
                console.error('Error fetching informer:', error);
            } finally {
                setIsSearchingInformer(false);
            }
        }
    };

    // Referring officer lookup by ID
    const handleReferringOfficerChange = async (e) => {
        const { value } = e.target;

        // Update the form data first
        setFormData(prev => ({
            ...prev,
            referringOfficerId: value,
            referringOfficerName: '' // Clear the name while searching
        }));

        // Clear any previous error
        setReferringOfficerError('');

        // Only search if there's a value and it's not just whitespace
        if (value && value.trim().length > 0) {
            setIsSearchingReferringOfficer(true);
            try {
                const response = await caseApi.get(`/api/employees/${value.trim()}`);

                if (response.data) {
                    const fullName = `${response.data.givenName} ${response.data.familyName}`.trim();
                    setFormData(prev => ({
                        ...prev,
                        referringOfficerName: fullName
                    }));
                } else {
                    setReferringOfficerError('Employee not found');
                }
            } catch (error) {
                console.error('Error fetching referring officer:', error);

                if (error.response?.status === 404) {
                    setReferringOfficerError('Employee not found with this ID');
                } else if (error.response?.status === 401) {
                    setReferringOfficerError('Unauthorized access. Please check your permissions.');
                } else {
                    setReferringOfficerError('Error searching for employee. Please try again.');
                }

                // Clear the officer name if there was an error
                setFormData(prev => ({
                    ...prev,
                    referringOfficerName: ''
                }));
            } finally {
                setIsSearchingReferringOfficer(false);
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
        if (formData.caseSource === 'referred' && !formData.referringOfficerId) {
            setError('Referring officer ID is required for referred cases');
            return false;
        }
        if (formData.caseSource === 'referred' && !formData.referringOfficerName) {
            setError('Please enter a valid referring officer ID');
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
                taxPayerType: formData.taxPayerType,
                taxPayerAddress: formData.taxPayerAddress,
                taxPeriod: formData.taxPeriod,
                reportedDate: new Date(formData.reportedDate).toISOString(),
                summaryOfInformationCase: formData.summaryOfInformationCase,
                informerType: formData.caseSource === 'anonymous' ? 'anonymous' : 'identified',
                informerNationalId: formData.caseSource === 'identified' ? parseInt(formData.informerId) : null,
                informerName: formData.caseSource === 'identified' ? formData.informerName : null,
                informerPhoneNum: formData.caseSource === 'identified' ? '' : null,
                informerAddress: formData.caseSource === 'identified' ? '' : null,
                informerEmail: formData.caseSource === 'identified' ? '' : null,
                referringOfficerId: formData.caseSource === 'referred' ? formData.referringOfficerId : null,
            };

            console.log('Submitting surveillance case data:', caseData); // Debug log

            const response = await CaseService.createCase(caseData);
            console.log('Response received:', response.data); // Debug log

            if (response.data) {
                setSuccess('Surveillance case created successfully!');
                const id = setTimeout(() => navigate('/surveillence-officer'), 2000);
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

    useEffect(() => {
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [timeoutId]);

    return (
        <div className="tax-report-form-container">
            <div className="tax-report-form-card">
                <div className="tax-report-form-header">
                    <h1>New Surveillance Case</h1>
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
                                placeholder="Enter tax identification number"
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

                        {/* Tax Payer Type */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Tax Type</label>
                            <select
                                name="taxPayerType"
                                value={formData.taxPayerType}
                                onChange={handleChange}
                                className="tax-report-form-input"
                            >
                                {taxPayerTypes.map(type => (
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

                        {/* Reported Date */}
                        <div className="form-group">
                            <label className="tax-report-form-label">Reported Date</label>
                            <input
                                type="date"
                                name="reportedDate"
                                value={formData.reportedDate}
                                onChange={handleChange}
                                className="tax-report-form-input"
                            />
                        </div>

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
                                        referringOfficerId: '',
                                        referringOfficerName: '',
                                    }));
                                    // Clear referring officer error when changing case source
                                    setReferringOfficerError('');
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
                                    <label className="tax-report-form-label">Informer ID*</label>
                                    <input
                                        type="text"
                                        name="informerId"
                                        value={formData.informerId}
                                        onChange={handleInformerIdChange}
                                        className="tax-report-form-input"
                                        placeholder="Enter national ID number"
                                        required
                                    />
                                    {isSearchingInformer && (
                                        <div className="search-indicator">Searching informer...</div>
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
                            <>
                                <div className="form-group">
                                    <label className="tax-report-form-label">Referring Officer ID*</label>
                                    <input
                                        type="text"
                                        name="referringOfficerId"
                                        value={formData.referringOfficerId}
                                        onChange={handleReferringOfficerChange}
                                        className={`tax-report-form-input ${referringOfficerError ? 'error' : ''}`}
                                        placeholder="Enter referring officer ID"
                                        required
                                    />
                                    {isSearchingReferringOfficer && (
                                        <div className="search-indicator">
                                            <i className="fas fa-spinner fa-spin"></i> Searching officer...
                                        </div>
                                    )}
                                    {referringOfficerError && (
                                        <div className="field-error">
                                            <i className="fas fa-exclamation-triangle"></i> {referringOfficerError}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="tax-report-form-label">Referring Officer Name</label>
                                    <input
                                        type="text"
                                        name="referringOfficerName"
                                        value={formData.referringOfficerName}
                                        onChange={handleChange}
                                        className="tax-report-form-input"
                                        placeholder="Officer name will appear here"
                                        readOnly
                                    />
                                </div>
                            </>
                        )}

                        {/* Summary of Information */}
                        <div className="form-group full-width">
                            <label className="tax-report-form-label">Summary of Information Provided*</label>
                            <textarea
                                name="summaryOfInformationCase"
                                value={formData.summaryOfInformationCase}
                                onChange={handleChange}
                                rows="4"
                                className="tax-report-form-textarea"
                                placeholder="Detailed description of the case"
                                required
                            />
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
                                'Create Surveillance Case'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewSurveillenceCase;