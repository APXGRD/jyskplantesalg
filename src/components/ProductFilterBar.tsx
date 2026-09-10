import { ChevronDownIcon, SearchIcon } from "./icons";
import { OnlyWithImageCheckbox } from "./OnlyWithImageCheckbox";

interface ProductFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  productType: string;
  onProductTypeChange: (value: string) => void;
  productTypes: string[];
  tag: string;
  onTagChange: (value: string) => void;
  tags: string[];
  onlyWithImage: boolean;
  onOnlyWithImageChange: (value: boolean) => void;
}

const selectClassName =
  "w-full appearance-none rounded-lg border border-border bg-surface px-4 py-2 pr-8 text-[13px] text-ink-muted focus:outline-none";

export function ProductFilterBar({
  search,
  onSearchChange,
  productType,
  onProductTypeChange,
  productTypes,
  tag,
  onTagChange,
  tags,
  onlyWithImage,
  onOnlyWithImageChange,
}: ProductFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-8 py-3.5">
      <div className="relative min-w-[220px] flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Søg efter produktnavn..."
          className="w-full rounded-lg border border-border bg-surface py-2 pr-4 pl-9 text-[13px] text-ink-muted placeholder:text-ink-faint focus:outline-none"
        />
      </div>

      <div className="relative">
        <select
          value={productType}
          onChange={(event) => onProductTypeChange(event.target.value)}
          className={selectClassName}
        >
          <option value="">Produkttype</option>
          {productTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-ink-muted" />
      </div>

      <div className="relative">
        <select value={tag} onChange={(event) => onTagChange(event.target.value)} className={selectClassName}>
          <option value="">Tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-ink-muted" />
      </div>

      <OnlyWithImageCheckbox checked={onlyWithImage} onChange={onOnlyWithImageChange} />
    </div>
  );
}
