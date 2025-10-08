import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';

// --- STYLES ---
// Since we can't link an external CSS file, all styles are included here.
const ComponentStyles = () => (
   <style>{`
        :root {
            --primary-bg: #f8f9fa;
            --secondary-bg: #ffffff;
            --border-color: #dee2e6;
            --text-primary: #212529;
            --text-secondary: #6c757d;
            --accent-color: #0d6efd;
            --header-height: 64px;
            --hover-bg: #f1f3f5;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --radius: 8px;
        }

        body {
            margin: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: var(--primary-bg);
            color: var(--text-primary);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        .app-header {
            height: var(--header-height);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            background-color: var(--secondary-bg);
            border-bottom: 1px solid var(--border-color);
            flex-shrink: 0;
            box-shadow: var(--shadow-sm);
        }

        .header-left, .header-right {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-shrink: 0;
        }
        
        .header-center {
           flex-grow: 1;
           display: flex;
           justify-content: center;
           padding: 0 20px;
        }

        .search-bar {
            position: relative;
            width: 100%;
            max-width: 520px;
        }

        .search-bar svg {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
        }

        .search-bar input {
            width: 100%;
            padding: 9px 12px 9px 40px;
            border-radius: var(--radius);
            border: 1px solid var(--border-color);
            background-color: var(--primary-bg);
            transition: border-color 0.2s, box-shadow 0.2s;
            font-size: 1rem;
        }
        
        .search-bar input:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.2);
        }

        .filter-button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: var(--radius);
            border: 1px solid var(--border-color);
            background-color: var(--secondary-bg);
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .filter-button:hover {
            background-color: var(--hover-bg);
        }

        .user-profile {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: var(--primary-bg);
            cursor: pointer;
            border: 1px solid var(--border-color);
            display: grid;
            place-items: center;
        }
        
        .user-profile:hover {
             background-color: var(--hover-bg);
        }

        .content-area {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 24px 32px;
        }
        
        .status-bar {
            padding-bottom: 16px;
            font-size: 0.875rem;
            color: var(--text-secondary);
            flex-shrink: 0;
        }
        
        .table-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            background-color: var(--secondary-bg);
            box-shadow: var(--shadow-sm);
        }

        .customer-table-header { flex-shrink: 0; }
        
        th {
            padding: 12px 24px;
            text-align: left;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-color);
            background-color: var(--primary-bg);
        }
        
        th.sortable { cursor: pointer; user-select: none; }
        th.sortable:hover { background-color: var(--hover-bg); }

        .sort-icon { margin-left: 4px; font-size: 0.6rem; display: inline-flex; vertical-align: middle; width: 1ch; }
        .sort-icon.unsorted { opacity: 0.4; transition: opacity 0.2s; }
        th.sortable:hover .sort-icon.unsorted { opacity: 1; }
        
        .scroll-container { flex-grow: 1; overflow-y: auto; position: relative; }

        .table-row { transition: background-color 0.15s ease-in-out; }
        .table-row:hover { background-color: var(--hover-bg); }

        td {
            padding: 12px 24px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
            font-size: 0.9rem;
        }
        
        .table-row:last-child td { border-bottom: none; }

        .cell-content { display: flex; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .avatar-img { width: 36px; height: 36px; border-radius: 50%; margin-right: 16px; object-fit: cover; flex-shrink: 0; }
        .score-cell { font-weight: 600; }
        
        .skeleton-cell { background-color: #e9ecef; border-radius: 4px; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .skeleton-cell.avatar { width: 36px; height: 36px; border-radius: 50%; margin-right: 16px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* Filter Dropdown Styles */
        .filter-dropdown-container {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 320px;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            z-index: 10;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .filter-section { display: flex; flex-direction: column; gap: 8px; }
        .filter-section h4 { font-size: 0.875rem; margin: 0; color: var(--text-primary); }
        .filter-input, .filter-date-input { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.9rem; }
        .score-range { display: flex; gap: 8px; }
        .filter-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; }
        .filter-action-btn { flex-grow: 1; padding: 8px 12px; border-radius: 6px; border: none; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
        .apply-btn { background-color: var(--accent-color); color: white; }
        .apply-btn:hover { background-color: #0b5ed7; }
        .clear-btn { background-color: var(--hover-bg); border: 1px solid var(--border-color); }
        .clear-btn:hover { background-color: #e2e6ea; }
    `}</style>
);

// --- HELPER FUNCTIONS & CONSTANTS ---
const DB_NAME = 'CustomerDatabase', STORE_NAME = 'customers', DB_VERSION = 2;
const ROW_HEIGHT = 55, OVERSCAN_COUNT = 5, PAGE_SIZE = 30;
let dbPromise = null;

const getDb = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject(new Error(`Database error: ${e.target.errorCode}`));
            request.onsuccess = (e) => resolve(e.target.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const transaction = e.currentTarget.transaction;
                let store;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                } else {
                    store = transaction.objectStore(STORE_NAME);
                }
                
                if (e.oldVersion < 1) {
                    if (!store.indexNames.contains('name')) store.createIndex('name', 'name', { unique: false });
                    if (!store.indexNames.contains('email')) store.createIndex('email', 'email', { unique: true });
                    if (!store.indexNames.contains('phone')) store.createIndex('phone', 'phone', { unique: false });
                }
                if (e.oldVersion < 2) {
                    if (!store.indexNames.contains('score')) store.createIndex('score', 'score', { unique: false });
                    if (!store.indexNames.contains('lastMessageAt')) store.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
                }
            };
        });
    }
    return dbPromise;
};


function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}


// --- CUSTOM HOOK FOR SEARCH LOGIC ---
function useCustomerSearch(debouncedSearchTerm) {
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isNewSearchLoading, setIsNewSearchLoading] = useState(false);
    const lastScannedKey = useRef(null);
    const activeQuery = useRef("");
    const cancelRef = useRef(null);

    const loadMoreInternal = async (isNewSearch = false, token) => {
        const term = activeQuery.current;
        if (!term) return;

        if (isLoadingMore) return;
        if (isNewSearch) {
            lastScannedKey.current = null;
            setFilteredCustomers([]);
            setHasMore(true);
            setIsNewSearchLoading(true);
        } else if (!hasMore) return;

        setIsLoadingMore(true);

        try {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const range = lastScannedKey.current ? IDBKeyRange.lowerBound(lastScannedKey.current, true) : null;
            const request = store.openCursor(range);
            const newResults = [];
            
            request.onsuccess = (e) => {
                if (cancelRef.current !== token) {
                    setIsLoadingMore(false);
                    if (isNewSearch) setIsNewSearchLoading(false);
                    return;
                }
                const cursor = e.target.result;
                if (cursor) {
                    const customer = cursor.value;
                    const match = customer.name.toLowerCase().includes(term) ||
                                  customer.email.toLowerCase().includes(term) ||
                                  customer.phone.includes(term);
                    if (match) newResults.push(customer);

                    if (newResults.length < PAGE_SIZE) cursor.continue();
                    else {
                        lastScannedKey.current = cursor.key;
                        setFilteredCustomers(prev => isNewSearch ? newResults : [...prev, ...newResults]);
                        setHasMore(true);
                        setIsLoadingMore(false);
                        if (isNewSearch) setIsNewSearchLoading(false);
                    }
                } else {
                    lastScannedKey.current = null;
                    setFilteredCustomers(prev => isNewSearch ? newResults : [...prev, ...newResults]);
                    setHasMore(false);
                    setIsLoadingMore(false);
                    if (isNewSearch) setIsNewSearchLoading(false);
                }
            };
            request.onerror = (e) => {
                if (cancelRef.current !== token) return;
                console.error("Search cursor error:", e.target.error);
                setIsLoadingMore(false);
                if (isNewSearch) setIsNewSearchLoading(false);
            };
        } catch (error) {
            if (cancelRef.current !== token) return;
            console.error("Failed to load filtered customers:", error);
            setIsLoadingMore(false);
            if (isNewSearch) setIsNewSearchLoading(false);
        }
    };

    useEffect(() => {
        const term = debouncedSearchTerm.trim().toLowerCase();
        activeQuery.current = term;
        const token = Symbol();
        cancelRef.current = token;
        if (term) {
            loadMoreInternal(true, token);
        } else {
            setFilteredCustomers([]);
            setIsNewSearchLoading(false);
        }
    }, [debouncedSearchTerm]);

    const loadNextPage = () => {
        const token = cancelRef.current;
        loadMoreInternal(false, token);
    };

    return { filteredCustomers, hasMore, isLoadingMore, isNewSearchLoading, loadNextPage };
}

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

// --- UI COMPONENTS ---
const TableRow = memo(({ customer, style, serialNumber }) => (
    <tr style={style} className="table-row">
        <td style={{ width: '80px' }}><div className="cell-content">{serialNumber.toLocaleString()}</div></td>
        <td>
            <div className="cell-content">
                <img src={customer.avatar} alt={customer.name} className="avatar-img" />
                {customer.name}
            </div>
        </td>
        <td><div className="cell-content">{customer.email}</div></td>
        <td><div className="cell-content">{customer.phone}</div></td>
        <td><div className="cell-content score-cell">{customer.score}</div></td>
        <td><div className="cell-content">{new Date(customer.lastMessageAt).toLocaleDateString()}</div></td>
        <td><div className="cell-content">{customer.addedBy}</div></td>
    </tr>
));

const SkeletonRow = ({ style }) => (
    <tr style={style} className="skeleton-row">
        <td style={{ width: '80px' }}><div className="skeleton-cell" style={{ width: '40px', height: '16px' }}></div></td>
        <td><div className="cell-content"><div className="skeleton-cell avatar"></div><div className="skeleton-cell" style={{ width: '120px', height: '16px' }}></div></div></td>
        <td><div className="skeleton-cell" style={{ width: '200px', height: '16px' }}></div></td>
        <td><div className="skeleton-cell" style={{ width: '100px', height: '16px' }}></div></td>
        <td><div className="skeleton-cell" style={{ width: '30px', height: '16px' }}></div></td>
        <td><div className="skeleton-cell" style={{ width: '80px', height: '16px' }}></div></td>
        <td><div className="skeleton-cell" style={{ width: '60px', height: '16px' }}></div></td>
    </tr>
);

const Table = ({ customers, onSort, sortConfig, onLoadMore, hasMore, isLoadingMore, isInitialLoading }) => {
    const scrollRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = (e) => {
        const container = e.currentTarget;
        setScrollTop(container.scrollTop);
        if (container.scrollHeight - container.scrollTop - container.clientHeight < 200 && hasMore && !isLoadingMore) {
            onLoadMore();
        }
    };

    const SortableHeader = ({ columnKey, title }) => {
        const isSorted = sortConfig.key === columnKey;
        return (
            <th className="sortable" onClick={() => onSort(columnKey)}>
                {title}
                {isSorted ? (
                    <span className="sort-icon">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                    </span>
                ) : (
                    <span className="sort-icon unsorted">
                        <UnsortedIcon />
                    </span>
                )}
            </th>
        );
    };

    const renderRows = () => {
        if (isInitialLoading && customers.length === 0) {
            return Array.from({ length: 10 }).map((_, i) => (
                <SkeletonRow key={i} style={{ position: 'absolute', top: `${i * ROW_HEIGHT}px`, left: 0, width: '100%', height: `${ROW_HEIGHT}px` }} />
            ));
        }
        const visibleRows = [];
        const containerHeight = scrollRef.current?.clientHeight || 0;
        const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
        const endIndex = Math.min(customers.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_COUNT);
        for (let i = startIndex; i < endIndex; i++) {
            visibleRows.push(
                <TableRow key={customers[i].id} customer={customers[i]} serialNumber={i + 1} style={{ position: 'absolute', top: `${i * ROW_HEIGHT}px`, left: 0, width: '100%', height: `${ROW_HEIGHT}px` }} />
            );
        }
        return visibleRows;
    };
    
    const totalHeight = isInitialLoading ? 10 * ROW_HEIGHT : (customers.length * ROW_HEIGHT) + (isLoadingMore ? 3 * ROW_HEIGHT : 0);

    return (
        <div className="table-wrapper">
            <table className="customer-table-header">
                <thead>
                    <tr>
                        <th style={{ width: '80px' }}>S.No.</th>
                        <SortableHeader columnKey="name" title="Customer Name" />
                        <SortableHeader columnKey="email" title="Email" />
                        <SortableHeader columnKey="phone" title="Phone" />
                        <SortableHeader columnKey="score" title="Score" />
                        <SortableHeader columnKey="lastMessageAt" title="Last Message" />
                        <th>Added By</th>
                    </tr>
                </thead>
            </table>
            <div className="scroll-container" ref={scrollRef} onScroll={handleScroll}>
                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                    <table className="customer-table-body">
                        <tbody>
                            {renderRows()}
                            {isLoadingMore && !isInitialLoading &&
                                Array.from({ length: 3 }).map((_, index) => (
                                    <SkeletonRow key={`loading-${index}`} style={{ position: 'absolute', top: `${(customers.length + index) * ROW_HEIGHT}px`, left: 0, width: '100%', height: `${ROW_HEIGHT}px` }} />
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- ICONS ---
const FilterIcon = () => ( <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M2.66699 4.66667H13.3337" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> <path d="M4.66699 8H11.3337" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> <path d="M6.66699 11.3333H9.33366" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/> </svg> );
const UserIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg> );
const Logo = () => ( <svg height="24" viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.02 2.00005L7.02 14.0001L14.02 26.0001H28.02L21.02 14.0001L28.02 2.00005H14.02Z" fill="#3B82F6"/> <text x="35" y="20" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="20" fontWeight="600" fill="#111827">DataGrid</text> </svg> );
const UnsortedIcon = () => ( <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <path d="M8 3L11 6H5L8 3Z"/> <path d="M8 13L5 10H11L8 13Z"/> </svg> );


// --- MAIN APP COMPONENT ---
export default function App() {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
    const [status, setStatus] = useState({ loading: true, message: 'Initializing...' });
    
    // States for default order
    const [customers, setCustomers] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialAppLoad, setIsInitialAppLoad] = useState(true);
    const pageRef = useRef(0);
    const isLoadingRef = useRef(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({ score: { min: '', max: '' }, addedBy: '', date: { after: '', before: '' } });
    // States for sorted order
    const [sortedCustomers, setSortedCustomers] = useState([]);
    const [sortedHasMore, setSortedHasMore] = useState(true);
    const [isSortedLoadingMore, setIsSortedLoadingMore] = useState(false);
    const [isNewSortLoading, setIsNewSortLoading] = useState(false);
    const sortedPageRef = useRef(0);
    const isSortedLoadingRef = useRef(false);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 250);
    const TOTAL_CUSTOMERS = 1_000_000;
    const search = useCustomerSearch(debouncedSearchTerm);
    const isSearching = debouncedSearchTerm.trim() !== '';
    const isSorting = !isSearching && sortConfig.key !== '';

    const fetchDefaultCustomers = useCallback(async (isNewQuery) => {
        if (isLoadingRef.current) return;
        console.log(`[DB] Fetching DEFAULT... New: ${isNewQuery}, Page: ${isNewQuery ? 0 : pageRef.current}`);
        isLoadingRef.current = true;
        
        if (isNewQuery) {
            pageRef.current = 0;
            setHasMore(true);
        } else {
            if (!hasMore) {
                isLoadingRef.current = false;
                return;
            }
            setIsLoadingMore(true);
        }

        try {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.openCursor(null, 'next');
            let advanced = false;
            const results = [];

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (!advanced && pageRef.current > 0) {
                    advanced = true;
                    if (cursor) cursor.advance(pageRef.current * PAGE_SIZE);
                    else {
                        setHasMore(false);
                        setIsLoadingMore(false);
                        isLoadingRef.current = false;
                    }
                    return;
                }
                if (cursor && results.length < PAGE_SIZE) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    if (isNewQuery) setCustomers(results);
                    else setCustomers(prev => [...prev, ...results]);
                    setHasMore(!!cursor);
                    pageRef.current += 1;
                    setIsLoadingMore(false);
                    isLoadingRef.current = false;
                    console.log(`[DB] Fetched ${results.length} DEFAULT customers. New pageRef: ${pageRef.current}. Has More: ${!!cursor}`);
                }
            };
            request.onerror = (e) => {
                console.error("[DB] Default cursor error:", e.target.error);
                setIsLoadingMore(false);
                isLoadingRef.current = false;
            };
        } catch(error) {
            console.error("[DB] Failed to fetch default customers:", error);
            setIsLoadingMore(false);
            isLoadingRef.current = false;
        }
    }, [hasMore]);

    const fetchSortedCustomers = useCallback(async (isNewQuery) => {
        if (!sortConfig.key) return;
        if (isSortedLoadingRef.current) return;
        console.log(`[DB] Fetching SORTED... New: ${isNewQuery}, Page: ${isNewQuery ? 0 : sortedPageRef.current}, Sort: ${sortConfig.key}-${sortConfig.direction}`);
        isSortedLoadingRef.current = true;
        
        if (isNewQuery) {
            sortedPageRef.current = 0;
            setSortedHasMore(true);
            setIsNewSortLoading(true);
        } else {
            if (!sortedHasMore) {
                isSortedLoadingRef.current = false;
                return;
            }
            setIsSortedLoadingMore(true);
        }

        try {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, "readonly");
            const source = tx.objectStore(STORE_NAME).index(sortConfig.key);
            const direction = sortConfig.direction === 'desc' ? 'prev' : 'next';
            const request = source.openCursor(null, direction);
            let advanced = false;
            const results = [];

            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (!advanced && sortedPageRef.current > 0) {
                    advanced = true;
                    if (cursor) cursor.advance(sortedPageRef.current * PAGE_SIZE);
                    else {
                        setSortedHasMore(false);
                        setIsSortedLoadingMore(false);
                        isSortedLoadingRef.current = false;
                    }
                    return;
                }
                if (cursor && results.length < PAGE_SIZE) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    if (isNewQuery) setSortedCustomers(results);
                    else setSortedCustomers(prev => [...prev, ...results]);
                    setSortedHasMore(!!cursor);
                    sortedPageRef.current += 1;
                    if (isNewQuery) setIsNewSortLoading(false);
                    setIsSortedLoadingMore(false);
                    isSortedLoadingRef.current = false;
                    console.log(`[DB] Fetched ${results.length} SORTED customers. New pageRef: ${sortedPageRef.current}. Has More: ${!!cursor}`);
                }
            };
            request.onerror = (e) => {
                console.error("[DB] Sorted cursor error:", e.target.error);
                if (isNewQuery) setIsNewSortLoading(false);
                setIsSortedLoadingMore(false);
                isSortedLoadingRef.current = false;
            };
        } catch(error) {
            console.error("[DB] Failed to fetch sorted customers:", error);
            if (isNewQuery) setIsNewSortLoading(false);
            setIsSortedLoadingMore(false);
            isSortedLoadingRef.current = false;
        }
    }, [sortConfig.key, sortConfig.direction, sortedHasMore]);

    useEffect(() => {
        (async () => {
            const db = await getDb();
            const recordCount = await new Promise(res => {
                const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
                req.onsuccess = e => res(e.target.result); req.onerror = () => res(0);
            });

            if (recordCount < TOTAL_CUSTOMERS) {
                setStatus({ loading: true, message: `Seeding ${recordCount.toLocaleString()}...` });
                const workerBlob = new Blob([`self.onmessage=async e=>{const{start:r,total:s}=e.data,t="CustomerDatabase",o="customers";function a(r,e=0){const s=["Aarav","Meera","Kiran","Ravi","Priya","Rahul"],t=["Patel","Sharma","Reddy","Iyer","Kumar","Singh"];let o=[];for(let a=0;a<r;a++){const n=e+a+1,c=s[Math.floor(Math.random()*s.length)],i=t[Math.floor(Math.random()*t.length)];o.push({id:n,name:c+" "+i,phone:"+91"+Math.floor(6e9+4e9*Math.random()),email:c.toLowerCase()+"."+i.toLowerCase()+n+"@example.com",score:Math.floor(100*Math.random()),lastMessageAt:new Date(Date.now()-1e3*3600*24*30*Math.random()),addedBy:"System",avatar:"https://api.dicebear.com/7.x/initials/svg?seed="+c+"+"+i})}return o}const n=indexedDB.open(t,2);n.onsuccess=async n=>{const c=n.target.result;for(let n=r;n<s;n+=5e3){const r=a(Math.min(5e3,s-n),n),i=c.transaction(o,"readwrite"),l=i.objectStore(o);r.forEach(r=>l.add(r)),await new Promise(r=>i.oncomplete=r),self.postMessage({added:n+r.length}),await new Promise(r=>setTimeout(r,0))}self.postMessage({done:!0})}};`], { type: 'application/javascript' });
                const worker = new Worker(URL.createObjectURL(workerBlob));
                worker.postMessage({ start: recordCount, total: TOTAL_CUSTOMERS });
                worker.onmessage = (e) => {
                    if (e.data.done) { setStatus({ loading: false, message: 'Database fully seeded ✅' }); worker.terminate(); }
                    else if (e.data.added) { setStatus({ loading: true, message: `${e.data.added.toLocaleString()} / ${TOTAL_CUSTOMERS.toLocaleString()} customers added...` }); }
                };
            } else { setStatus({ loading: false, message: `Database fully loaded ✅` }); }
        })();
    }, []);

    useEffect(() => {
        fetchDefaultCustomers(true).finally(() => setIsInitialAppLoad(false));
    }, []);

    useEffect(() => {
        if (!isSearching && sortConfig.key) {
            fetchSortedCustomers(true);
        }
    }, [sortConfig, isSearching, fetchSortedCustomers]);

    const handleSort = (key) => {
        setSortConfig(current => {
            if (current.key !== key) return { key, direction: 'asc' };
            if (current.direction === 'asc') return { key, direction: 'desc' };
            return { key: '', direction: '' };
        });
    };
    
    const handleApplyFilters = (filters) => {
        console.log("Applying filters:", filters);
        setActiveFilters(filters);
        setIsFilterOpen(false);
    };

    const handleClearFilters = () => {
        console.log("Clearing filters");
        const cleared = { score: { min: '', max: '' }, addedBy: '', date: { after: '', before: '' } };
        setActiveFilters(cleared);
        setIsFilterOpen(false);
    };

    // Helper function to check if any filters are active
    const hasActiveFilters = useCallback(() => {
        return activeFilters.score.min !== '' || 
               activeFilters.score.max !== '' || 
               activeFilters.addedBy !== '' || 
               activeFilters.date.after !== '' || 
               activeFilters.date.before !== '';
    }, [activeFilters]);

    // Helper function to apply filters to data
    const applyFilters = useCallback((data) => {
        if (!hasActiveFilters()) return data;
        
        return data.filter(customer => {
            // Score filter
            if (activeFilters.score.min !== '' && customer.score < parseInt(activeFilters.score.min)) {
                return false;
            }
            if (activeFilters.score.max !== '' && customer.score > parseInt(activeFilters.score.max)) {
                return false;
            }
            
            // Added by filter
            if (activeFilters.addedBy !== '' && 
                !customer.addedBy.toLowerCase().includes(activeFilters.addedBy.toLowerCase())) {
                return false;
            }
            
            // Date filters
            if (activeFilters.date.after !== '') {
                const afterDate = new Date(activeFilters.date.after);
                const customerDate = new Date(customer.lastMessageAt);
                if (customerDate < afterDate) {
                    return false;
                }
            }
            if (activeFilters.date.before !== '') {
                const beforeDate = new Date(activeFilters.date.before);
                const customerDate = new Date(customer.lastMessageAt);
                if (customerDate > beforeDate) {
                    return false;
                }
            }
            
            return true;
        });
    }, [activeFilters, hasActiveFilters]);
    
    const displayedData = useMemo(() => {
        let baseData;
        
        if (isSearching) {
            baseData = search.filteredCustomers;
        } else {
            baseData = isSorting ? sortedCustomers : customers;
        }
        
        // Apply filters to the base data
        const filteredData = applyFilters(baseData);
        
        // Apply sorting for search results (other data is already sorted from DB)
        if (isSearching && sortConfig.key) {
            return [...filteredData].sort((a, b) => {
                const valA = a[sortConfig.key], valB = b[sortConfig.key];
                if (valA === null || valA === undefined) return 1; 
                if (valB === null || valB === undefined) return -1;
                let comparison = 0;
                if (sortConfig.key === 'lastMessageAt') comparison = new Date(valA).getTime() - new Date(valB).getTime();
                else if (typeof valA === 'string') comparison = valA.localeCompare(valB);
                else comparison = valA - valB;
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        
        return filteredData;
    }, [customers, sortedCustomers, search.filteredCustomers, sortConfig, isSearching, isSorting, applyFilters]);

    const getStatusMessage = () => {
        if (search.isNewSearchLoading) return `Searching for "${debouncedSearchTerm}"...`;
        if (status.loading) return status.message;

        if (isSearching) {
            const searchResults = applyFilters(search.filteredCustomers);
            const searchMessage = `Displaying ${searchResults.length.toLocaleString()}${search.hasMore ? '+' : ''} results for "${debouncedSearchTerm}"`;
            return hasActiveFilters() ? `${searchMessage} (filtered)` : searchMessage;
        }
        
        const baseData = isSorting ? sortedCustomers : customers;
        const filteredData = applyFilters(baseData);
        const currentHasMore = isSorting ? sortedHasMore : hasMore;
        
        let baseMessage;
        if (hasActiveFilters()) {
            baseMessage = `Displaying ${filteredData.length.toLocaleString()} filtered results from ${baseData.length.toLocaleString()}${currentHasMore ? '+' : ''} of ~${TOTAL_CUSTOMERS.toLocaleString()} customers`;
        } else {
            baseMessage = `Displaying ${baseData.length.toLocaleString()}${currentHasMore ? '+' : ''} of ~${TOTAL_CUSTOMERS.toLocaleString()} customers`;
        }

        if (isSorting) {
            const sortKeyName = {
                name: 'Customer Name',
                email: 'Email',
                phone: 'Phone',
                score: 'Score',
                lastMessageAt: 'Last Message'
            }[sortConfig.key] || sortConfig.key;
            const sortDirection = sortConfig.direction === 'asc' ? 'ascending' : 'descending';
            return `${baseMessage}, sorted by ${sortKeyName} (${sortDirection})`;
        }

        return baseMessage;
    };


    const onLoadMore = () => {
        if (isSearching) search.loadNextPage();
        else if (isSorting) fetchSortedCustomers(false);
        else fetchDefaultCustomers(false);
    };

    return (
        <>
            <ComponentStyles />
            <div className="app-container">
                <header className="app-header">
                    <div className="header-left"> <Logo /> </div>
                    <div className="header-center">
                        <div className="search-bar">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="header-right">
                        <div style={{position: 'relative'}}>
                           <button className="filter-button" onClick={() => setIsFilterOpen(o => !o)} style={{ backgroundColor: hasActiveFilters() ? 'var(--accent-color)' : undefined, color: hasActiveFilters() ? 'white' : undefined }}> 
                               <FilterIcon /> 
                               <span>Filters{hasActiveFilters() ? ' (Active)' : ''}</span> 
                           </button>
                           {isFilterOpen && <FilterDropdown onApply={handleApplyFilters} onClear={handleClearFilters} initialFilters={activeFilters} close={() => setIsFilterOpen(false)} />}
                        </div>
                        <div className="user-profile"> <UserIcon /> </div>
                    </div>
                </header>
                <main className="content-area">
                    <div className="status-bar">{getStatusMessage()}</div>
                    <Table
                      customers={displayedData}
                      onSort={handleSort}
                      sortConfig={sortConfig}
                      onLoadMore={onLoadMore}
                      hasMore={isSearching ? search.hasMore : (isSorting ? sortedHasMore : hasMore)}
                      isLoadingMore={isSearching ? search.isLoadingMore : (isSorting ? isSortedLoadingMore : isLoadingMore)}
                      isInitialLoading={isInitialAppLoad || (isSearching && search.isNewSearchLoading) || (isSorting && isNewSortLoading)}
                  />  
                </main>
            </div>
        </>
    );
}   

