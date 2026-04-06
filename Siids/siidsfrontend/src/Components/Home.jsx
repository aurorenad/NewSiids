import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './../Styles/Home.css'

const Home = () => {
    const { authState } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (authState && authState.role === 'StockManager') {
            navigate('/stock-management');
        }
    }, [authState, navigate]);

    return (
        <h3 className="home"> Welcome to Strategic Intelligence & Investigation Division System (SIIDS)</h3>
    );
}

export default Home;