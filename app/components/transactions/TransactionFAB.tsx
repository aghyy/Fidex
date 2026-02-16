"use client";

import CreateTransactionDialog from "./CreateTransactionDialog";

interface TransactionFABProps {
  preselectedCategory?: string;
  preselectedAccount?: string;
}

export default function TransactionFAB({
  preselectedCategory,
  preselectedAccount,
}: TransactionFABProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <CreateTransactionDialog
        preselectedCategory={preselectedCategory}
        preselectedAccount={preselectedAccount}
      />
    </div>
  );
}
