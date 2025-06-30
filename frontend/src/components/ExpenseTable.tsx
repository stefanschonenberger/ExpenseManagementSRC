// src/components/ExpenseTable.tsx
import { Eye, Pencil, Trash2, Check } from 'lucide-react'; // Import Check icon
import { formatCurrency } from '@/lib/utils';

export default function ExpenseTable({ expenses, onEdit, onDelete, onViewReceipt }: any) {
  return (
    <div className="overflow-hidden bg-white rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Title</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Type</th>
            <th className="w-12 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Book</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Supplier</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">VAT</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-4 text-sm text-center text-gray-500">No expenses in this category.</td>
            </tr>
          ) : (
            expenses.map((expense: any) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(expense.expense_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{expense.title}</td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{expense.expense_type}</td>
                <td className="px-6 py-4 text-center">
                  {expense.book && <Check className="w-5 h-5 mx-auto text-success" />}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{expense.supplier}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{formatCurrency(expense.amount)}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-500 whitespace-nowrap">{expense.vat_amount > 0 ? formatCurrency(expense.vat_amount) : '-'}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      expense.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                      expense.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                  }`}>
                    {expense.status}
                  </span>
                </td>
                <td className="flex items-center justify-end px-6 py-4 space-x-4 text-sm text-right whitespace-nowrap">
                  {expense.receipt_blob_id && (
                    <button onClick={() => onViewReceipt(expense.receipt_blob_id)} className="text-primary hover:text-primary-hover"><Eye className="w-5 h-5" /></button>
                  )}
                  {expense.status === 'DRAFT' && (
                    <>
                      <button onClick={() => onEdit(expense)} className="text-gray-500 hover:text-gray-700"><Pencil className="w-5 h-5" /></button>
                      <button onClick={() => onDelete(expense.id)} className="text-danger hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}