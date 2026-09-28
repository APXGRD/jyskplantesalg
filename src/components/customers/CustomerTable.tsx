import type { ShopifyCustomer } from "@/lib/customers";
import { CustomerRow } from "./CustomerRow";

interface CustomerTableProps {
  customers: ShopifyCustomer[];
  onEdit: (customer: ShopifyCustomer) => void;
  onUnsubscribe: (customer: ShopifyCustomer) => void;
}

export function CustomerTable({ customers, onEdit, onUnsubscribe }: CustomerTableProps) {
  return (
    // overflow-x-auto – på smalle skærme scroller tabellen vandret for sig,
    // i stedet for at klemme kolonnerne eller bryde sidens layout.
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 border-collapse text-left">
        <thead>
          <tr className="border-b border-[#e5e7eb] bg-zinc-50 font-jetbrains text-[10px] tracking-wider text-zinc-500 uppercase">
            <th scope="col" className="px-4 py-3 font-semibold">
              Navn
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Email / kontakt
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Kundetype
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Handlinger
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e7eb] font-jetbrains text-xs">
          {customers.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} onEdit={onEdit} onUnsubscribe={onUnsubscribe} />
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <p className="px-4 py-12 text-center font-jetbrains text-xs tracking-wider text-zinc-400 uppercase">
          Ingen kunder matcher dine filtre
        </p>
      )}
    </div>
  );
}
