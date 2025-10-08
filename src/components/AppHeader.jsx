import React, { useState, useEffect, useRef } from 'react';
import './AppHeader.css';

const FilterDropdown = ({ onApply, onClear, initialFilters, close }) => {
    const [filters, setFilters] = useState(initialFilters);
    const dropdownRef = useRef(null);

    const handleChange = (e) => { const { name, value } = e.target; const [section, key] = name.split('.'); if (key) setFilters(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } })); else setFilters(prev => ({ ...prev, [name]: value })); };
    const handleApply = () => { onApply(filters); close(); };
    const handleClear = () => { const cleared = { score: { min: '', max: '' }, addedBy: '', date: { after: '', before: '' } }; setFilters(cleared); onClear(); close(); };

    useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) close(); }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [close]);

    return (
        <div className="filter-dropdown-container" ref={dropdownRef}>
            <div className="filter-section">
                <h4>Score</h4>
                <div className="score-range">
                    <input type="number" name="score.min" placeholder="Min" value={filters.score.min} onChange={handleChange} className="filter-input" />
                    <input type="number" name="score.max" placeholder="Max" value={filters.score.max} onChange={handleChange} className="filter-input" />
                </div>
            </div>
            <div className="filter-section">
                <h4>Added By</h4>
                <input type="text" name="addedBy" placeholder="e.g., System" value={filters.addedBy} onChange={handleChange} className="filter-input" />
            </div>
            <div className="filter-section">
                <h4>Date Added</h4>
                <div className="score-range">
                     <input type="date" name="date.after" value={filters.date.after} onChange={handleChange} className="filter-date-input" title="After"/>
                     <input type="date" name="date.before" value={filters.date.before} onChange={handleChange} className="filter-date-input" title="Before"/>
                </div>
            </div>
            <div className="filter-actions">
                <button onClick={handleClear} className="filter-action-btn clear-btn">Clear</button>
                <button onClick={handleApply} className="filter-action-btn apply-btn">Apply</button>
            </div>
        </div>
    );
};


const AppHeader = ({ 
    getStatusMessage, 
    searchTerm, 
    setSearchTerm, 
    isFilterOpen, 
    setIsFilterOpen, 
    hasActiveFilters,
    handleApplyFilters,
    handleClearFilters,
    activeFilters
}) => {
    const activeFilterStyles = hasActiveFilters() ? {
        backgroundColor: 'var(--primary-color-light)',
        color: 'var(--primary-color)',
        borderColor: 'var(--primary-color-light)'
    } : {};

    return (
        <>
            {/* 1. Top-level header for logo and user profile */}
            <header style={{"backgroundColor":"white"}} className="app-header-top">
                <div className="header-left">
                   <img src="/Logo.png" alt="Logo"  />
                </div>
            </header>

            {/* 2. Secondary header with status and controls */}
            <div className="page-header">
                <div className="controls-bar">
                    <div className="search-bar">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="filter-container">
                       <button className="filter-button" onClick={() => setIsFilterOpen(o => !o)} style={activeFilterStyles}> 
                         <img src="/test_Filter.svg" alt="Filter" style={{ width: "2rem", height: "2rem" }} />
                           <span>{hasActiveFilters() ? 'Filters (Active)' : 'Add Filters'}</span> 
                       </button>
                       {isFilterOpen && <FilterDropdown onApply={handleApplyFilters} onClear={handleClearFilters} initialFilters={activeFilters} close={() => setIsFilterOpen(false)} />}
                    </div>
                </div>
            </div>
        </>
    );
};


export default AppHeader;