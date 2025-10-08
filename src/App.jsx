import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import Table from './components/Table';
import AppHeader from './components/AppHeader';

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
            <div className="app-container">
                <AppHeader
                getStatusMessage={getStatusMessage}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                hasActiveFilters={hasActiveFilters}
                handleApplyFilters={handleApplyFilters}
                handleClearFilters={handleClearFilters}
                activeFilters={activeFilters}
            />
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

