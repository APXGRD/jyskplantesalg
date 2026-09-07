import type { CustomerType } from "@/lib/format";
import { getCustomerType, isActiveCustomer, type ShopifyCustomer } from "@/lib/customers";
import { PencilIcon, TrashIcon } from "@/components/icons";

const TYPE_BADGE_STYLES: Record<CustomerType, string> = {
  privat: "bg-teal-50 text-teal-700",
  erhverv: "bg-violet-50 text-violet-700",
};

const TYPE_LABEL: Record<CustomerType, string> = {
  privat: "Privat",
  erhverv: "Erhverv",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${className}`}
    >
      {children}
    </span>
  );
}

interface CustomerRowProps {
  customer: ShopifyCustomer;
  onEdit: (customer: ShopifyCustomer) => void;
  onDelete: (customer: ShopifyCustomer) => void;
}

export function CustomerRow({ customer, onEdit, onDelete }: CustomerRowProps) {
  const type = getCustomerType(customer);
  const active = isActiveCustomer(customer);
  const fullName = `${customer.firstName} ${customer.lastName}`;

  return (
    <tr className={`border-b border-border last:border-b-0 ${active ? "" : "opacity-60 grayscale"}`}>
      <td className="px-4 py-3">
        <p className="text-[13px] font-medium text-ink">{fullName}</p>
      </td>
      <td className="px-4 py-3 text-[13px] text-ink-muted">{customer.email}</td>
      <td className="px-4 py-3">
        <Badge className={TYPE_BADGE_STYLES[type]}>{TYPE_LABEL[type]}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge className={active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}>
          {active ? "Aktiv" : "Afmeldt"}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(customer)}
            aria-label={`Rediger ${fullName}`}
            title="Rediger"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faintest hover:bg-surface-active hover:text-ink-muted"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(customer)}
            aria-label={`Slet ${fullName}`}
            title="Slet"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faintest hover:bg-red-50 hover:text-red-600"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
