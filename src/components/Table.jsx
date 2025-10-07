import React, { useState, useRef } from 'react';
import "./Table.css";

const ROW_HEIGHT = 55;
const OVERSCAN_COUNT = 5;

const TableRow = React.memo(({ customer, style }) => (
    <tr style={style} className="table-row">
        <td>
            <div className="cell-content">
                <img src={customer.avatar} alt={customer.name} className="avatar-img" />
                {customer.name}
            </div>
        </td>
        <td><div className="cell-content">{customer.email}</div></td>
        <td><div className="cell-content">{customer.phone}</div></td>
        <td><div className="cell-content score-cell">{customer.score}</div></td>
        <td><div className="cell-content">{customer.lastMessageAt.toLocaleDateString()}</div></td>
        <td><div className="cell-content">{customer.addedBy}</div></td>
    </tr>
));

export default function Table({ customers, onSort, sortConfig }) {
    const scrollContainerRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = (e) => setScrollTop(e.currentTarget.scrollTop);
    
    const containerHeight = scrollContainerRef.current?.clientHeight || 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_COUNT);
    const endIndex = Math.min(customers.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_COUNT);

    const visibleRows = [];
    for (let i = startIndex; i < endIndex; i++) {
        if (customers[i]) {
            visibleRows.push(
                <TableRow
                    key={customers[i].id}
                    customer={customers[i]}
                    style={{
                        position: 'absolute',
                        top: `${i * ROW_HEIGHT}px`,
                        left: 0,
                        width: '100%',
                        height: `${ROW_HEIGHT}px`,
                    }}
                />
            );
        }
    }

    const SortableHeader = ({ columnKey, title }) => {
        const isSorted = sortConfig.key === columnKey;
        const directionIcon = sortConfig.direction === 'asc' ? '▲' : '▼';
        return (
            <th onClick={() => onSort(columnKey)}>
                {title} {isSorted && <span className="sort-icon">{directionIcon}</span>}
            </th>
        );
    };

    return (
        <div className="table-wrapper">
            <table className="customer-table-header">
                <thead>
                    <tr>
                        <SortableHeader columnKey="name" title="Customer Name" />
                        <SortableHeader columnKey="email" title="Email" />
                        <SortableHeader columnKey="phone" title="Phone" />
                        <SortableHeader columnKey="score" title="Score" />
                        <SortableHeader columnKey="lastMessageAt" title="Last Message" />
                        <SortableHeader columnKey="addedBy" title="Added By" />
                    </tr>
                </thead>
            </table>
            <div
                className="scroll-container"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                <div style={{ height: `${customers.length * ROW_HEIGHT}px`, position: 'relative' }}>
                    <table className="customer-table-body">
                        <tbody>
                            {visibleRows}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}