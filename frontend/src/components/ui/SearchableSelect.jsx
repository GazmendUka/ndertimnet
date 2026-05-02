// src/components/ui/SearchableSelect.jsx

import Select from "react-select";
import { useMemo } from "react";

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Zgjidh...",
  isMulti = false,
  disabled = false,
}) {
  // --------------------------------------------------
  // Format options (memoized for performance)
  // --------------------------------------------------
  const formattedOptions = useMemo(
    () =>
      options.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [options]
  );

  // --------------------------------------------------
  // Resolve selected value
  // --------------------------------------------------
  const selectedValue = isMulti
    ? formattedOptions.filter(
        (opt) => Array.isArray(value) && value.includes(opt.value)
      )
    : formattedOptions.find((opt) => opt.value === value) || null;

  // --------------------------------------------------
  // Handle change
  // --------------------------------------------------
  const handleChange = (selected) => {
    if (disabled) return;

    if (isMulti) {
      onChange(selected ? selected.map((s) => s.value) : []);
    } else {
      onChange(selected ? selected.value : null);
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <Select
      options={formattedOptions}
      value={selectedValue}
      onChange={handleChange}
      placeholder={placeholder}
      isMulti={isMulti}
      isDisabled={disabled}
      className="text-sm"
      classNamePrefix="react-select"
      noOptionsMessage={() => "Nuk u gjet asnjë rezultat"}
    />
  );
}