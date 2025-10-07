import React, { useState, useEffect, useRef, memo } from 'react';
import './index.css';

// --- (Helper functions are the same) ---
const DB_NAME = 'CustomerDatabase', STORE_NAME = 'customers', DB_VERSION = 1;
let dbPromise = null;
const getDb = () => { if (!dbPromise) { dbPromise = new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onerror = (e) => reject(new Error(`Database error: ${e.target.errorCode}`)); request.onsuccess = (e) => resolve(e.target.result); request.onupgradeneeded = (e) => { const store = e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); store.createIndex('name', 'name'); store.createIndex('email', 'email'); store.createIndex('phone', 'phone'); store.createIndex('score', 'score'); store.createIndex('lastMessageAt', 'lastMessageAt'); }; }); } return dbPromise; };
const ROW_HEIGHT = 55, OVERSCAN_COUNT = 5, BATCH_SIZE = 30;

// --- TABLE ROW & SKELETON COMPONENTS ---
const TableRow = memo(({ customer, style, serialNumber }) => ( <tr style={style} className="table-row"> <td style={{ width: '80px' }}><div className="cell-content">{serialNumber.toLocaleString()}</div></td> <td> <div className="cell-content"> <img src={customer.avatar} alt={customer.name} className="avatar-img" /> {customer.name} </div> </td> <td><div className="cell-content">{customer.email}</div></td> <td><div className="cell-content">{customer.phone}</div></td> <td><div className="cell-content score-cell">{customer.score}</div></td> <td><div className="cell-content">{new Date(customer.lastMessageAt).toLocaleDateString()}</div></td> <td><div className="cell-content">{customer.addedBy}</div></td> </tr> ));

const SkeletonRow = ({ style }) => (
  <tr style={style} className="skeleton-row">
    <td style={{ width: '80px' }}><div className="skeleton-cell" style={{ width: '40px' }}></div></td>
    <td><div className="cell-content"><div className="skeleton-cell avatar"></div><div className="skeleton-cell" style={{ width: '120px' }}></div></div></td>
    <td><div className="skeleton-cell" style={{ width: '200px' }}></div></td>
    <td><div className="skeleton-cell" style={{ width: '100px' }}></div></td>
    <td><div className="skeleton-cell" style={{ width: '30px' }}></div></td>
    <td><div className="skeleton-cell" style={{ width: '80px' }}></div></td>
    <td><div className="skeleton-cell" style={{ width: '60px' }}></div></td>
  </tr>
);

// --- TABLE COMPONENT ---
const Table = ({ customers, onSort, sortConfig, onLoadMore, hasMore, isLoadingMore, isInitialLoading }) => {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (e) => { const container = e.currentTarget; setScrollTop(container.scrollTop); if (container.scrollHeight - container.scrollTop - container.clientHeight < 200 && hasMore && !isLoadingMore) { onLoadMore(); } };
  
  const SortableHeader = ({ columnKey, title }) => { const isSorted = sortConfig.key === columnKey; const directionIcon = sortConfig.direction === 'asc' ? '▲' : '▼'; return ( <th className="sortable" onClick={() => onSort(columnKey)}> {title} {isSorted && <span className="sort-icon">{directionIcon}</span>} </th> ); };

  const renderRows = () => {
    if (isInitialLoading) {
      // Show 10 skeleton rows during initial load
      return Array.from({ length: 10 }).map((_, i) => (
        <SkeletonRow key={i} style={{ position: 'absolute', top: `${i * ROW_HEIGHT}px`, left: 0, width: '100%', height: `${ROW_HEIGHT}px` }} />
      ));
    }
    
    const visibleRows = [];
    const containerHeight = scrollRef.current?.clientHeight || 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
    const endIndex = Math.min(customers.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_COUNT);

    for (let i = startIndex; i < endIndex; i++) {
      visibleRows.push( <TableRow key={customers[i].id} customer={customers[i]} serialNumber={i + 1} style={{ position: 'absolute', top: `${i * ROW_HEIGHT}px`, left: 0, width: '100%', height: `${ROW_HEIGHT}px` }} /> );
    }
    return visibleRows;
  };
  
  // Calculate total height based on whether we are showing skeletons or real data
  const totalHeight = isInitialLoading ? 10 * ROW_HEIGHT : customers.length * ROW_HEIGHT;

  return ( <div className="table-wrapper"> <table className="customer-table-header"> <thead> <tr> <th style={{ width: '80px' }}>S.No.</th> <th>Customer Name</th> <th>Email</th> <SortableHeader columnKey="phone" title="Phone" /> <SortableHeader columnKey="score" title="Score" /> <SortableHeader columnKey="lastMessageAt" title="Last Message" /> <th>Added By</th> </tr> </thead> </table> <div className="scroll-container" ref={scrollRef} onScroll={handleScroll}> <div style={{ height: `${totalHeight}px`, position: 'relative' }}> <table className="customer-table-body"> <tbody>{renderRows()}</tbody> </table> {isLoadingMore && !isInitialLoading && <div className="loading-indicator">Loading more...</div>} </div> </div> </div> );
};

function useDebounce(value, delay) { const [debouncedValue, setDebouncedValue] = useState(value); useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]); return debouncedValue; }

function generateCustomers(count, offset = 0) { const first = ["Aarav", "Meera", "Kiran", "Ravi", "Priya", "Rahul"]; const last = ["Patel", "Sharma", "Reddy", "Iyer", "Kumar", "Singh"]; const customers = []; for (let i = 0; i < count; i++) { const id = offset + i + 1; const fName = first[Math.floor(Math.random() * first.length)]; const lName = last[Math.floor(Math.random() * last.length)]; customers.push({ id, name: `${fName} ${lName}`, phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`, email: `${fName.toLowerCase()}.${lName.toLowerCase()}${id}@example.com`, score: Math.floor(Math.random() * 100), lastMessageAt: new Date(Date.now() - Math.random() * 1000 * 3600 * 24 * 30), addedBy: "System", avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${fName}+${lName}`, }); } return customers; }

// --- MAIN APP COMPONENT ---
export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [status, setStatus] = useState({ loading: true, message: 'Initializing...' });
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scanOffset, setScanOffset] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const TOTAL_CUSTOMERS = 1_000_000;
  const INITIAL_BATCH = 30;

useEffect(() => {
  (async () => {
    const db = await getDb();

    // --- Count existing records ---
    const countTx = db.transaction(STORE_NAME, "readonly");
    const countStore = countTx.objectStore(STORE_NAME);
    const recordCount = await new Promise((res) => {
      const request = countStore.count();
      request.onsuccess = (e) => res(e.target.result);
      request.onerror = () => res(0);
    });

    // --- Load first 30 rows for UI ---
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results = [];
    let count = 0;
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor && count < INITIAL_BATCH) {
        results.push(cursor.value);
        count++;
        cursor.continue();
      } else {
        setCustomers(results);
      }
    };
    console.log(recordCount, 'existing records found');  
    if (recordCount < TOTAL_CUSTOMERS) {
      setStatus({ loading: true, message: `Seeding ${recordCount.toLocaleString()} / ${TOTAL_CUSTOMERS.toLocaleString()}...` });

      // --- Start worker from existing count ---
      const startOffset = recordCount; // continue from existing rows
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
                id,
                name: fName + " " + lName,
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
          setStatus({
            loading: true,
            message: `${e.data.added.toLocaleString()} / ${TOTAL_CUSTOMERS.toLocaleString()} customers added...`
          });
        }
      };
    } else {
      setStatus({ loading: false, message: `Database fully loaded ✅` });
    }

  })();
}, []);


  useEffect(() => { if (!status.loading || customers.length > 0) { fetchCustomers(true); } }, [debouncedSearchTerm, sortConfig]);
  
  const fetchCustomers = async (reset = false) => { if (isLoadingMore) return; setIsLoadingMore(true); if (reset) { setScanOffset(0); } const currentOffset = reset ? 0 : scanOffset; try { const db = await getDb(); const tx = db.transaction(STORE_NAME, 'readonly'); const index = tx.objectStore(STORE_NAME).index(sortConfig.key); const direction = sortConfig.direction === 'asc' ? 'next' : 'prev'; const results = []; let scannedInThisFetch = 0; let matchesFound = 0; const cursorRequest = index.openCursor(null, direction); let advanced = currentOffset === 0; cursorRequest.onsuccess = e => { const cursor = e.target.result; if (!advanced && cursor) { advanced = true; cursor.advance(currentOffset); return; } if (cursor && matchesFound < BATCH_SIZE) { scannedInThisFetch++; const term = debouncedSearchTerm.toLowerCase(); const { name, email, phone } = cursor.value; const matches = !term || name.toLowerCase().includes(term) || email.toLowerCase().includes(term) || phone.includes(term); if (matches) { results.push(cursor.value); matchesFound++; } cursor.continue(); } else { setScanOffset(currentOffset + scannedInThisFetch); setHasMore(cursor !== null); setCustomers(reset ? results : prev => [...prev, ...results]); setIsLoadingMore(false); } }; cursorRequest.onerror = (e) => { setIsLoadingMore(false); }; } catch (error) { setIsLoadingMore(false); } };
  const handleSort = (key) => { setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' })); };
  const handleLoadMore = () => { fetchCustomers(false); };

  const isInitialLoading = customers.length === 0 && status.loading;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left"> <svg height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.3333 0L0 16L20.3333 32H100L120 16L100 0H20.3333Z" fill="#4A6DFF"/><text x="35" y="22" fontFamily="Arial, sans-serif" fontSize="18" fill="white" fontWeight="bold">LOGO</text></svg> </div>
        <div className="header-center"> <div className="search-bar"> <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7422 10.3438H11.0234L10.7656 10.0938C11.6484 9.04688 12.1641 7.69531 12.1641 6.25C12.1641 2.92969 9.48438 0.25 6.16406 0.25C2.84375 0.25 0.164062 2.92969 0.164062 6.25C0.164062 9.57031 2.84375 12.25 6.16406 12.25C7.60156 12.25 8.95312 11.7344 10.0078 10.8516L10.2578 11.1094V11.8281L14.9141 16.4844L16.3203 15.0781L11.7422 10.3438ZM6.16406 10.3438C3.8902 10.3438 2.07031 8.52344 2.07031 6.25C2.07031 3.97656 3.89062 2.15625 6.16406 2.15625C8.4375 2.15625 10.2578 3.97656 10.2578 6.25C10.2578 8.52344 8.4375 10.3438 6.16406 10.3438Z" fill="#6B7280"/></svg> <input type="text" placeholder="Search by name, email, or phone" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /> </div> </div>
        <div className="header-right"></div>
      </header>
      <main className="content-area">
        <div className="status-bar">{status.loading ? status.message : `Displaying ${customers.length.toLocaleString()} matching customers`}</div>
        <Table customers={customers} onSort={handleSort} sortConfig={sortConfig} onLoadMore={handleLoadMore} hasMore={hasMore} isLoadingMore={isLoadingMore} isInitialLoading={isInitialLoading} />
      </main>
    </div>
  );
}
