import Select from "react-select";

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Zgjidh...",
  isMulti = false,
}) {
  const formattedOptions = options.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const selectedValue = isMulti
    ? formattedOptions.filter((opt) =>
        value?.includes(opt.value)
      )
    : formattedOptions.find((opt) => opt.value === value);

  return (
    <Select
      options={formattedOptions}
      value={selectedValue}
      onChange={(selected) => {
        if (isMulti) {
          onChange(selected ? selected.map((s) => s.value) : []);
        } else {
          onChange(selected ? selected.value : null);
        }
      }}
      placeholder={placeholder}
      isMulti={isMulti}
      className="text-sm"
      classNamePrefix="react-select"
      noOptionsMessage={() => "Nuk u gjet asnjë rezultat"}
    />
  );
}