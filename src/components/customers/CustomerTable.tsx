import type { ShopifyCustomer } from "@/lib/customers";
import { CustomerRow } from "./CustomerRow";

interface CustomerTableProps {
  customers: ShopifyCustomer[];
  onEdit: (customer: ShopifyCustomer) => void;
  onUnsubscribe: (customer: ShopifyCustomer) => void;
}

const headerCellClassName = "px-4 py-3 text-[11px] font-semibold tracking-wider uppercase";

export function CustomerTable({ customers, onEdit, onUnsubscribe }: CustomerTableProps) {
  return (
    // overflow-x-auto – på smalle skærme scroller tabellen vandret for sig,
    // i stedet for at klemme kolonnerne eller bryde sidens layout.
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <thead>
          <tr className="bg-forest text-white">
            <th scope="col" className={headerCellClassName}>
              Navn
            </th>
            <th scope="col" className={headerCellClassName}>
              Email / Kontakt
            </th>
            <th scope="col" className={headerCellClassName}>
              Kundetype
            </th>
            <th scope="col" className={headerCellClassName}>
              Status
            </th>
            <th scope="col" className={`${headerCellClassName} text-right`}>
              Handlinger
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline bg-white">
          {customers.map((customer) => (
            <CustomerRow key={customer.id} customer={customer} onEdit={onEdit} onUnsubscribe={onUnsubscribe} />
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <p className="px-4 py-12 text-center text-sm text-stone">Ingen kunder matcher dine filtre</p>
      )}
    </div>
  );
}
