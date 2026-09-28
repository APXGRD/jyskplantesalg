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
    <tr className="group transition-colors hover:bg-zinc-50/80">
      <td className="px-4 py-3 font-grotesk text-sm font-medium">
        {fullName ? <span className="text-black">{fullName}</span> : <span className="text-zinc-300">–</span>}
      </td>
      <td className="px-4 py-3 text-zinc-600">{customer.email}</td>
      <td className="px-4 py-3">
        <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tracking-wider text-zinc-700 uppercase">
          {TYPE_LABEL[type]}
        </span>
      </td>
      <td className="px-4 py-3">
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-700 uppercase">
            <span className="h-1 w-1 rounded-full bg-emerald-600" />
            Aktiv
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] tracking-wider text-zinc-500 uppercase">
            Afmeldt
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2 opacity-70 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(customer)}
            aria-label={`Rediger ${displayName}`}
            title="Rediger kunde"
            className="p-1 text-zinc-400 transition-colors hover:text-black"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUnsubscribe(customer)}
            disabled={!active}
            aria-label={`Afmeld ${displayName}`}
            title={active ? "Afmeld kunde" : "Allerede afmeldt"}
            className="p-1 text-zinc-400 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-zinc-400"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
