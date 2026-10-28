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
  "h-11 w-full min-w-[160px] cursor-pointer appearance-none rounded-xs border-[0.5px] border-forest bg-white pr-8 pl-3.5 text-sm text-ink-deep focus:ring-1 focus:ring-forest/30 focus:outline-none";

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
    <section className="mb-6 flex w-full flex-wrap items-center gap-2 rounded-xs border border-hairline bg-white p-2">
      <div className="relative min-w-40 grow sm:min-w-55">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-stone" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Søg efter produktnavn..."
          className="h-11 w-full rounded-xs border border-transparent bg-transparent pr-4 pl-10 text-sm text-ink-deep transition-all placeholder:text-stone focus:border-forest focus:outline-none"
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
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-forest" />
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
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-forest" />
      </div>

      <OnlyWithImageCheckbox checked={onlyWithImage} onChange={onOnlyWithImageChange} />
    </section>
  );
}
