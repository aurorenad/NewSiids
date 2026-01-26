import React, { createContext, useState, useEffect, useContext } from 'react';
import { CaseService } from '../api/Axios/caseApi';
import { UIContext } from './UIContext';

export const CasesContext = createContext();

export const CasesProvider = ({ children }) => {
    const [cases, setCases] = useState([]);
    const [filteredCases, setFilteredCases] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyWithReports, setShowOnlyWithReports] = useState(false);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const { setLoading, setError, showSnackbar } = useContext(UIContext);

    // Fetch cases
    const fetchCases = async () => {
        try {
            setLoading(true);
            const response = await CaseService.getMyCases();
            setCases(response.data);
            setFilteredCases(response.data);
            return response.data;
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to load cases';
            setError(errorMessage);
            showSnackbar(errorMessage, 'error');
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Apply filters and sorting
    useEffect(() => {
        let results = [...cases];

        // Apply search filter
        if (searchTerm) {
            results = results.filter(caseItem =>
                Object.values(caseItem).some(
                    value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Apply report filter
        if (showOnlyWithReports) {
            results = results.filter(caseItem => caseItem.reportId);
        }

        // Apply sorting
        results.sort((a, b) => {
            if (sortBy === 'createdAt') {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);

                if (sortOrder === 'desc') {
                    return dateB - dateA; // newest first
                } else {
                    return dateA - dateB; // oldest first
                }
            }
            return 0;
        });

        setFilteredCases(results);
        setPage(0); // reset pagination on filter/search/sort change
    }, [searchTerm, cases, showOnlyWithReports, sortOrder, sortBy]);

    // Handle sorting
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Update a case in the state
    const updateCase = (caseNum, updates) => {
        setCases(prevCases =>
            prevCases.map(c =>
                c.caseNum === caseNum
                    ? { ...c, ...updates }
                    : c
            )
        );
    };

    // Pagination handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <CasesContext.Provider value={{
            cases,
            filteredCases,
            searchTerm,
            setSearchTerm,
            showOnlyWithReports,
            setShowOnlyWithReports,
            sortBy,
            sortOrder,
            handleSort,
            page,
            rowsPerPage,
            handleChangePage,
            handleChangeRowsPerPage,
            fetchCases,
            updateCase,
            setCases
        }}>
            {children}
        </CasesContext.Provider>
    );
};

export const useCases = () => useContext(CasesContext);