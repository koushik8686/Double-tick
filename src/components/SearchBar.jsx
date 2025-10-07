import { useState, useEffect } from "react";
import "./SearchBar.css";

export default function SearchBar({ value, onChange }) {
  const [term, setTerm] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(term);
    }, 250);
    return () => clearTimeout(timeout);
  }, [term]);

  return (
    <input
      type="text"
      placeholder="Search by name, email, or phone..."
      value={term}
      onChange={(e) => setTerm(e.target.value)}
      className="search-input"
    />
  );
}
