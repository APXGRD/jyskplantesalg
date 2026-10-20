import type { CustomerType } from "@/lib/format";
import { getCustomerType, isActiveCustomer, type ShopifyCustomer } from "@/lib/customers";
import { PencilIcon, TrashIcon } from "@/components/icons";

const TYPE_LABEL: Record<CustomerType, string> = {
  privat: "Privat",
  erhverv: "Erhverv",
};

interface CustomerRowProps {
  customer: ShopifyCustomer;
  onEdit: (customer: ShopifyCustomer) => void;
  onUnsubscribe: (customer: ShopifyCustomer) => void;
}

export function CustomerRow({ customer, onEdit, onUnsubscribe }: CustomerRowProps) {
  const type = getCustomerType(customer);
  const active = isActiveCustomer(customer);
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const displayName = fullName || customer.email;

  return (
    <tr className="transition-colors hover:bg-cream/80">
      <td className="px-4 py-4 font-medium text-[#1a1a1a]">{fullName || <span className="text-stone/50">–</span>}</td>
      <td className="px-4 py-4 text-sm text-stone">{customer.email}</td>
      <td className="px-4 py-4 text-sm text-ink-deep">{TYPE_LABEL[type]}</td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase ${
            active ? "bg-mint text-forest-hover" : "bg-rose-bg text-rose-ink"
          }`}
        >
          {active ? "Aktiv" : "Afmeldt"}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="inline-flex items-center gap-1 text-stone">
          <button
            type="button"
            onClick={() => onEdit(customer)}
            aria-label={`Rediger ${displayName}`}
            title="Rediger kunde"
            className="p-1 transition-colors hover:text-forest"
          >
            <PencilIcon className="h-[19px] w-[19px]" />
          </button>
          <button
            type="button"
            onClick={() => onUnsubscribe(customer)}
            disabled={!active}
            aria-label={`Afmeld ${displayName}`}
            title={active ? "Afmeld kunde" : "Allerede afmeldt"}
            className="p-1 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-stone"
          >
            <TrashIcon className="h-[19px] w-[19px]" />
          </button>
        </div>
      </td>
    </tr>
  );
}
