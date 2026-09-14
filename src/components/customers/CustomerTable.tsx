import type { ShopifyCustomer } from "@/lib/customers";
import { CustomerRow } from "./CustomerRow";

interface CustomerTableProps {
  customers: ShopifyCustomer[];
  onEdit: (customer: ShopifyCustomer) => void;
  onUnsubscribe: (customer: ShopifyCustomer) => void;
}

export function CustomerTable({ customers, onEdit, onUnsubscribe }: CustomerTableProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8">
      {/* overflow-x-auto på selve tabellen (ikke den ydre, lodret
          scrollende container) – på smalle skærme kan tabellen scrolle
          vandret for sig, i stedet for at klemme kolonnerne sammen eller
          bryde resten af sidens layout. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse">
          <thead className="sticky top-0 bg-surface text-left text-[10px] font-semibold tracking-wider text-ink-faint uppercase">
            <tr className="border-b border-border">
              <th className="py-3 font-semibold">Navn</th>
              <th className="py-3 font-semibold">Email</th>
              <th className="py-3 font-semibold">Kundetype</th>
              <th className="py-3 font-semibold">Status</th>
              <th className="py-3 font-semibold">
                <span className="sr-only">Handlinger</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} onEdit={onEdit} onUnsubscribe={onUnsubscribe} />
            ))}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-ink-muted">Ingen kunder matcher dine filtre.</p>
      )}
    </div>
  );
}
