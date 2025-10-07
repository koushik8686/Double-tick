import React, { useState, useEffect, useRef, memo } from 'react';

// --- STYLES ---
// Since we can't link an external CSS file, all styles are included here.
const ComponentStyles = () => (
    <style>{`
        :root {
            --primary-bg: #f9fafb;
            --secondary-bg: #ffffff;
            --border-color: #e5e7eb;
            --text-primary: #111827;
            --text-secondary: #6b7280;
            --accent-color: #3b82f6;
            --header-height: 64px;
        }

        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
        }
        
        .header-center {
           flex-grow: 1;
           display: flex;
           justify-content: center;
        }

        .search-bar {
            position: relative;
            width: 100%;
            max-width: 480px;
        }

        .search-bar svg {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
        }

        .search-bar input {
            width: 100%;
            padding: 8px 12px 8px 36px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background-color: var(--primary-bg);
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .search-bar input:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }

        .content-area {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 16px 24px;
        }
        
        .status-bar {
            padding-bottom: 12px;
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
            border-radius: 8px;
            background-color: var(--secondary-bg);
        }

        .customer-table-header, .customer-table-body {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        
        .customer-table-header {
            flex-shrink: 0;
        }

        th {
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-color);
            background-color: #f9fafb;
        }
        
        th.sortable {
            cursor: pointer;
            user-select: none;
        }
        
        th.sortable:hover {
             background-color: #f3f4f6;
        }

        .sort-icon {
            margin-left: 4px;
            font-size: 0.6rem;
        }
        
        .scroll-container {
            flex-grow: 1;
            overflow-y: auto;
            position: relative;
        }

        .table-row, .skeleton-row {
            width: 100%;
            background-color: var(--secondary-bg);
        }
        
        .table-row:hover {
            background-color: var(--primary-bg);
        }

        td {
            padding: 8px 16px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
        }

        .cell-content {
            display: flex;
            align-items: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 0.875rem;
        }

        .avatar-img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            margin-right: 12px;
            object-fit: cover;
            flex-shrink: 0;
        }
        
        .score-cell {
            font-weight: 500;
        }
        
        .skeleton-cell {
            background-color: #e5e7eb;
            border-radius: 4px;
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .skeleton-cell.avatar {
             width: 32px;
             height: 32px;
             border-radius: 50%;
             margin-right: 12px;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .loading-indicator {
            padding: 16px;
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
    `}</style>
);

// --- HELPER FUNCTIONS & CONSTANTS ---
const DB_NAME = 'CustomerDatabase', STORE_NAME = 'customers', DB_VERSION = 1;
const ROW_HEIGHT = 55, OVERSCAN_COUNT = 5, PAGE_SIZE = 30;
let dbPromise = null;

/**
 * Gets a promise that resolves with the IndexedDB database instance.
 * This ensures the DB is only opened once.
 */
const getDb = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject(new Error(`Database error: ${e.target.errorCode}`));
            request.onsuccess = (e) => resolve(e.target.result);
            request.onupgradeneeded = (e) => {
                const store = e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('name', 'name');
                store.createIndex('email', 'email');
                store.createIndex('phone', 'phone');
                store.createIndex('score', 'score');
                store.createIndex('lastMessageAt', 'lastMessageAt');
            };
        });
    }
    return dbPromise;
};

/**
 * A debounced hook to delay value updates, useful for search inputs.
 */
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- TABLE ROW & SKELETON COMPONENTS ---
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

// --- VIRTUALIZED TABLE COMPONENT ---
const Table = ({ customers, onSort, sortConfig, onLoadMore, hasMore, isLoadingMore, isInitialLoading }) => {
    const scrollRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = (e) => {
        const container = e.currentTarget;
        setScrollTop(container.scrollTop);
        // Load more when user is near the bottom of the list
        if (container.scrollHeight - container.scrollTop - container.clientHeight < 200 && hasMore && !isLoadingMore) {
            onLoadMore();
        }
    };

    const SortableHeader = ({ columnKey, title }) => {
        const isSorted = sortConfig.key === columnKey;
        const directionIcon = sortConfig.direction === 'asc' ? '▲' : '▼';
        return (
            <th className="sortable" onClick={() => onSort(columnKey)}>
                {title} {isSorted && <span className="sort-icon">{directionIcon}</span>}
            </th>
        );
    };

    const renderRows = () => {
        if (isInitialLoading) {
            // Show skeleton rows during the initial data fetch
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
    
    // Total height is based on the number of items to create the scrollbar
    const totalHeight = isInitialLoading ? 10 * ROW_HEIGHT : (customers.length * ROW_HEIGHT) + (isLoadingMore ? 3 * ROW_HEIGHT : 0);

    return (
        <div className="table-wrapper">
            <table className="customer-table-header">
                <thead>
                    <tr>
                        <th style={{ width: '80px' }}>S.No.</th>
                        <th>Customer Name</th>
                        <th>Email</th>
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
                                    <SkeletonRow
                                        key={`loading-${index}`}
                                        style={{
                                            position: 'absolute',
                                            top: `${(customers.length + index) * ROW_HEIGHT}px`,
                                            left: 0,
                                            width: '100%',
                                            height: `${ROW_HEIGHT}px`,
                                        }}
                                    />
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    const [searchTerm, setSearchTerm] = useState("");
    const [customers, setCustomers] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
    const [status, setStatus] = useState({ loading: true, message: 'Initializing...' });
    
    // State for pagination and loading
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const TOTAL_CUSTOMERS = 1_000_000;

    /**
     * Efficiently loads the next page of customers from IndexedDB.
     */
    const loadMoreCustomers = async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);

        // Artificial delay to make the loading animation visible
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);

            const lastId = customers.length > 0 ? customers[customers.length - 1].id : null;
            const range = lastId ? IDBKeyRange.lowerBound(lastId, true) : null; 

            const request = store.openCursor(range);
            const newCustomers = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && newCustomers.length < PAGE_SIZE) {
                    newCustomers.push(cursor.value);
                    cursor.continue();
                } else {
                    setCustomers(prev => [...prev, ...newCustomers]);
                    if (!cursor || newCustomers.length < PAGE_SIZE) {
                        setHasMore(false);
                    }
                    setIsLoadingMore(false);
                }
            };
            
            request.onerror = (event) => {
                console.error("Cursor error:", event.target.error);
                setIsLoadingMore(false);
            };

        } catch (error) {
            console.error("Failed to load more customers:", error);
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        (async () => {
            setIsInitialLoading(true);
            const db = await getDb();

            const countTx = db.transaction(STORE_NAME, "readonly");
            const countStore = countTx.objectStore(STORE_NAME);
            const recordCount = await new Promise((res) => {
                const request = countStore.count();
                request.onsuccess = (e) => res(e.target.result);
                request.onerror = () => res(0);
            });

            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const initialResults = [];
            const req = store.openCursor();
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && initialResults.length < PAGE_SIZE) {
                    initialResults.push(cursor.value);
                    cursor.continue();
                } else {
                    setCustomers(initialResults);
                    setHasMore(initialResults.length === PAGE_SIZE && recordCount > PAGE_SIZE);
                    setIsInitialLoading(false); 
                }
            };
            req.onerror = (e) => {
                console.error("Initial load cursor error:", e.target.error);
                setIsInitialLoading(false);
            };

            if (recordCount < TOTAL_CUSTOMERS) {
                setStatus({ loading: true, message: `Seeding ${recordCount.toLocaleString()} / ${TOTAL_CUSTOMERS.toLocaleString()}...` });
                
                const startOffset = recordCount;
                const workerBlob = new Blob([`
                    self.onmessage = async (e) => {
                        const { start, total } = e.data;
                        const DB_NAME = '${DB_NAME}';
                        const STORE_NAME = '${STORE_NAME}';
                        
                        function generateCustomers(count, offset = 0) {
                            const first = ["Aarav","Meera","Kiran","Ravi","Priya","Rahul"];
                            const last = ["Patel","Sharma","Reddy","Iyer","Kumar","Singh"];
                            const customers = [];
                            for (let i = 0; i < count; i++) {
                                const id = offset + i + 1;
                                const fName = first[Math.floor(Math.random()*first.length)];
                                const lName = last[Math.floor(Math.random()*last.length)];
                                customers.push({
                                    id, name: fName + " " + lName,
                                    phone: "+91" + Math.floor(6000000000 + Math.random()*4000000000),
                                    email: fName.toLowerCase() + "." + lName.toLowerCase() + id + "@example.com",
                                    score: Math.floor(Math.random()*100),
                                    lastMessageAt: new Date(Date.now() - Math.random()*1000*3600*24*30),
                                    addedBy: "System",
                                    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=" + fName + "+" + lName,
                                });
                            }
                            return customers;
                        }

                        const request = indexedDB.open(DB_NAME, 1);
                        request.onsuccess = async (event) => {
                            const db = event.target.result;
                            const BATCH_SIZE = 5000;
                            for (let i = start; i < total; i += BATCH_SIZE) {
                                const batch = generateCustomers(Math.min(BATCH_SIZE, total - i), i);
                                const tx = db.transaction(STORE_NAME, "readwrite");
                                const store = tx.objectStore(STORE_NAME);
                                batch.forEach(c => store.add(c));
                                await tx.done;
                                self.postMessage({ added: i + batch.length });
                                await new Promise(res => setTimeout(res, 0));
                            }
                            self.postMessage({ done: true });
                        };
                    };
                `], { type: 'application/javascript' });

                const worker = new Worker(URL.createObjectURL(workerBlob));
                worker.postMessage({ start: startOffset, total: TOTAL_CUSTOMERS });

                worker.onmessage = (e) => {
                    if (e.data.done) {
                        setStatus({ loading: false, message: 'Database fully seeded ✅' });
                        worker.terminate();
                    } else if (e.data.added) {
                        setStatus({ loading: true, message: `${e.data.added.toLocaleString()} / ${TOTAL_CUSTOMERS.toLocaleString()} customers added...` });
                    }
                };
            } else {
                setStatus({ loading: false, message: `Database fully loaded ✅` });
            }
        })();
    }, []);

    const handleSort = (key) => {
        setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
        // Note: Full sorting requires re-fetching from a sorted index in IndexedDB.
        // For simplicity, this example just sets the state. You would need to clear
        // the `customers` array and reload from the DB based on the new sort order.
    };

    const getStatusMessage = () => {
        if (status.loading) return status.message;
        // Search would require a separate fetching logic.
        return `Displaying ${customers.length.toLocaleString()} of ~${TOTAL_CUSTOMERS.toLocaleString()} customers`;
    };

    return (
        <>
            <ComponentStyles />
            <div className="app-container">
                <header className="app-header">
                    <div className="header-center">
                        <div className="search-bar">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7422 10.3438H11.0234L10.7656 10.0938C11.6484 9.04688 12.1641 7.69531 12.1641 6.25C12.1641 2.92969 9.48438 0.25 6.16406 0.25C2.84375 0.25 0.164062 2.92969 0.164062 6.25C0.164062 9.57031 2.84375 12.25 6.16406 12.25C7.60156 12.25 8.95312 11.7344 10.0078 10.8516L10.2578 11.1094V11.8281L14.9141 16.4844L16.3203 15.0781L11.7422 10.3438ZM6.16406 10.3438C3.8902 10.3438 2.07031 8.52344 2.07031 6.25C2.07031 3.97656 3.89062 2.15625 6.16406 2.15625C8.4375 2.15625 10.2578 3.97656 10.2578 6.25C10.2578 8.52344 8.4375 10.3438 6.16406 10.3438Z" fill="#6B7280" /></svg>
                            <input type="text" placeholder="Search by name, email, or phone" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="header-right"></div>
                </header>
                <main className="content-area">
                    <div className="status-bar">{getStatusMessage()}</div>
                    <Table
                        customers={customers}
                        onSort={handleSort}
                        sortConfig={sortConfig}
                        onLoadMore={loadMoreCustomers}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        isInitialLoading={isInitialLoading}
                    />
                </main>
            </div>
        </>
    );
}

