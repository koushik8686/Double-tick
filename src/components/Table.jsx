import React, { useState, useRef, memo } from 'react';
import './Table.css';

// --- Icon for unsorted state in sortable headers ---
const UnsortedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3L11 6H5L8 3Z" />
    <path d="M8 13L5 10H11L8 13Z" />
  </svg>
);

// --- TableRow: Displays a single customer's details (memoized for performance) ---
const TableRow = memo(({ customer, style }) => {
  const cellBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ ...style, display: 'flex', width: '100%', borderBottom: '1px solid #f0f0f0' }}>
      {/* Customer Info (Avatar + Name + Phone) */}
      <div style={{ ...cellBaseStyle, width: "30%" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <img
            src={customer.avatar || "/User.svg"}
            alt={customer.name}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#111' }}>{customer.name}</span>
            <span style={{ fontSize: '13px', color: '#666666' }}>{customer.phone}</span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div style={{ ...cellBaseStyle, width: "10%", fontWeight: 500 }}>
        {customer.score}
      </div>

      {/* Email */}
      <div style={{ ...cellBaseStyle, width: "20%" }}>
        {customer.email}
      </div>

      {/* Last Message Date */}
      <div style={{ ...cellBaseStyle, width: "25%", color: '#555', fontSize: '14px' }}>
        {new Date(customer.lastMessageAt).toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        })}
      </div>

      {/* Added By (User Avatar) */}
      <div style={{ ...cellBaseStyle, width: "15%" }}>
        <img
          src={customer.addedBy.avatar || "/test_user-3 3.svg"}
          alt={customer.addedBy}
          style={{ width: '28px', height: '28px', borderRadius: '50%' }}
        />
      </div>
    </div>
  );
});

// --- SkeletonRow: Shown during loading (gray placeholder rows) ---
const SkeletonRow = ({ style }) => (
  <tr style={style} className="skeleton-row">
    <td><div className="skeleton-cell avatar"></div></td>
    <td><div className="skeleton-cell" style={{ width: '120px', height: '16px' }}></div></td>
    <td><div className="skeleton-cell" style={{ width: '200px', height: '16px' }}></div></td>
    <td><div className="skeleton-cell" style={{ width: '100px', height: '16px' }}></div></td>
  </tr>
);

// --- Main Table Component ---
const Table = ({
  customers,
  onSort,
  sortConfig,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isInitialLoading
}) => {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Virtualization constants
  const ROW_HEIGHT = 65;   // Height of each row in pixels
  const OVERSCAN_COUNT = 5; // Buffer rows rendered above & below viewport

  // --- Handles table scrolling ---
  const handleScroll = (e) => {
    const container = e.currentTarget;
    setScrollTop(container.scrollTop);

    // Infinite scroll logic: Load more when near bottom
    if (
      container.scrollHeight - container.scrollTop - container.clientHeight < 200 &&
      hasMore &&
      !isLoadingMore
    ) {
      onLoadMore();
    }
  };

  // --- SortableHeader: Reusable header cell for sorting columns ---
  const SortableHeader = ({ columnKey, title, style }) => {
    const isSorted = sortConfig.key === columnKey;
    return (
      <div
        onClick={() => onSort(columnKey)}
        className={isSorted ? 'sortable sorted' : 'sortable'}
        style={style}
      >
        {title}
        {isSorted ? (
          <span className="sort-icon">
            {sortConfig.direction === "asc" ? "▲" : "▼"}
          </span>
        ) : (
          <span className="sort-icon unsorted">
            <UnsortedIcon />
          </span>
        )}
      </div>
    );
  };

  // --- Virtualized row rendering ---
  // Only render rows visible in the viewport for performance
  const renderRows = () => {
    const visibleRows = [];
    const containerHeight = scrollRef.current?.clientHeight || 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
    const endIndex = Math.min(
      customers.length,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_COUNT
    );

    for (let i = startIndex; i < endIndex; i++) {
      visibleRows.push(
        <TableRow
          key={customers[i].id}
          customer={customers[i]}
          style={{
            position: "absolute",
            top: `${i * ROW_HEIGHT}px`,
            left: 0,
            height: `${ROW_HEIGHT}px`,
          }}
        />
      );
    }
    return visibleRows;
  };

  // --- Calculate total scrollable height ---
  const totalHeight = isInitialLoading
    ? 10 * ROW_HEIGHT
    : customers.length * ROW_HEIGHT + (isLoadingMore ? 3 * ROW_HEIGHT : 0);

  return (
    <div className="table-wrapper">
      {/* Scrollable container with sticky header */}
      <div className="scroll-container" ref={scrollRef} onScroll={handleScroll}>
        {/* Sticky table header */}
        <div className="table-header">
          <SortableHeader columnKey="name" title="Customer" style={{ width: '30%', justifyContent: 'center' }} />
          <SortableHeader columnKey="score" title="Score" style={{ width: '10%' }} />
          <SortableHeader columnKey="email" title="Email" style={{ width: '20%' }} />
          <SortableHeader columnKey="lastMessageAt" title="Last Message" style={{ width: '25%' }} />
          <SortableHeader columnKey="addedBy.name" title="Added By" style={{ width: '15%' }} />
        </div>

        {/* Virtualized rows container */}
        <div style={{ position: "relative", height: `${totalHeight}px` }}>
          {/* Show loading skeletons initially */}
          {isInitialLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <SkeletonRow
                key={i}
                style={{
                  position: "absolute",
                  top: `${i * ROW_HEIGHT}px`,
                  left: 0,
                  height: `${ROW_HEIGHT}px`
                }}
              />
            ))
          ) : (
            renderRows()
          )}

          {/* Show skeletons when loading more data (infinite scroll) */}
          {isLoadingMore && !isInitialLoading && Array.from({ length: 3 }).map((_, index) => (
            <SkeletonRow
              key={`loading-${index}`}
              style={{
                position: "absolute",
                top: `${(customers.length + index) * ROW_HEIGHT}px`,
                left: 0,
                height: `${ROW_HEIGHT}px`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Table;
