import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function SearchableComboBox({
  options,
  value,
  onChange,
  onSearch,
  renderOption,
  disableFiltering = false,
  disabled = false,
  required = false,
  name,
  placeholder = 'Select',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const highlightText = (label, term) => {
    if (!term) return label;
    const lowerLabel = String(label || '').toLowerCase();
    const lowerTerm = String(term || '').toLowerCase();
    const index = lowerLabel.indexOf(lowerTerm);
    if (index === -1) return label;
    const before = label.slice(0, index);
    const match = label.slice(index, index + term.length);
    const after = label.slice(index + term.length);
    return (
      <>
        {before}
        <span className="searchable-combobox-highlight">{match}</span>
        {after}
      </>
    );
  };

  const filteredOptions = useMemo(() => {
    if (disableFiltering) {
      return options;
    }
    const term = searchTerm.trim().toLowerCase();
    const limited = options;
    if (!term) {
      return limited;
    }
    return limited.filter((opt) => {
      const labelMatch = String(opt.label || '').toLowerCase().includes(term);
      const codeMatch = opt.code ? String(opt.code).toLowerCase().includes(term) : false;
      const tickerMatch = opt.ticker_symbol ? String(opt.ticker_symbol).toLowerCase().includes(term) : false;
      const valueMatch = String(opt.value || '').toLowerCase().includes(term);
      
      return labelMatch || codeMatch || tickerMatch || valueMatch;
    });
  }, [options, searchTerm, disableFiltering]);

  useEffect(() => {
    const current = options.find(
      (opt) => String(opt.value) === String(value ?? ''),
    );
    if (current) {
      setSearchTerm(current.label || '');
    } else if (!onSearch || (String(value) !== '' && value != null)) {
      setSearchTerm('');
    }
  }, [value, options, onSearch]);

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      return;
    }
    if (filteredOptions.length > 0 && highlightedIndex < 0) {
      setHighlightedIndex(0);
    }
  }, [isOpen, filteredOptions, highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const container = containerRef.current;
      const dropdownEl = dropdownRef.current;
      if (!container && !dropdownEl) return;
      const isInsideContainer =
        container && container.contains(event.target);
      const isInsideDropdown =
        dropdownEl && dropdownEl.contains(event.target);
      if (isInsideContainer || isInsideDropdown) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    const handleReposition = () => {
      updateDropdownPosition();
    };
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    if (disabled) return;
    const term = e.target.value;
    setSearchTerm(term);
    if (onSearch) {
      onSearch(term);
    }
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    updateDropdownPosition();
  };

  const handleWrapperClick = () => {
    if (disabled) return;
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        updateDropdownPosition();
      }
      return next;
    });
  };

  const selectOption = (opt) => {
    if (!opt) return;
    onChange(opt.value);
    setSearchTerm(opt.label || '');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        if (next >= filteredOptions.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        if (next < 0) return filteredOptions.length - 1;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      if (!isOpen) return;
      e.preventDefault();
      const opt = filteredOptions[highlightedIndex];
      if (opt) {
        selectOption(opt);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  const isBrowser = typeof document !== 'undefined';

  const dropdown =
    isOpen && filteredOptions
      ? (
        <div
          className="searchable-combobox-dropdown"
          ref={dropdownRef}
          style={
            isBrowser && dropdownRect
              ? {
                  top: dropdownRect.top,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                  right: 'auto',
                }
              : undefined
          }
        >
          {filteredOptions.length === 0 ? (
            <div className="searchable-combobox-no-results">
              No results found
            </div>
          ) : (
            filteredOptions.map((opt, index) => (
              <div
                key={opt.value}
                className={`searchable-combobox-option${
                  index === highlightedIndex ? ' active' : ''
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
              >
                {renderOption ? (
                  renderOption(opt, searchTerm)
                ) : (
                  highlightText(opt.label || '', searchTerm)
                )}
              </div>
            ))
          )}
        </div>
        )
      : null;

  return (
    <div className="searchable-combobox" ref={containerRef}>
      <div
        className={`searchable-combobox-input-wrapper${
          disabled ? ' is-disabled' : ''
        }`}
        onClick={handleWrapperClick}
      >
        <input
          type="text"
          ref={inputRef}
          className="form-control searchable-combobox-input"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        {value && !disabled && (
          <button
            type="button"
            className="searchable-combobox-clear"
            onClick={handleClear}
          >
            ×
          </button>
        )}
        <span className="searchable-combobox-arrow">▾</span>
      </div>
      {dropdown &&
        (isBrowser ? createPortal(dropdown, document.body) : dropdown)}
      <select
        className="searchable-combobox-hidden-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        name={name}
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

