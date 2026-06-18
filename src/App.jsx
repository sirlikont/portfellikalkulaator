import { useState } from "react";

export default function App() {
  const [transactions, setTransactions] = useState([]);

  const [date, setDate] = useState("");
  const [type, setType] = useState("Sissemakse");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");

  const addTransaction = () => {
    if (!date || amount === 0) return;

    if ((type === "Algväärtus" || type === "Lõppväärtus") && transactions.some(t => t.type === type)) {
      setError(`${type} on juba olemas`);
      return;
    }

    setError("");
    setTransactions([
      ...transactions,
      {
        date,
        type,
        amount: Number(amount),
      },
    ]);

    setDate("");
    setAmount(0);
    setType("Sissemakse");
  };

  const deleteTransaction = (indexToDelete) => {
    setTransactions(
      transactions.filter((_, index) => index !== indexToDelete)
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center py-10">
      <div className="bg-white p-6 rounded-xl shadow-md w-[650px] mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          Portfelli tootluskalkulaator
        </h1>

        <h2 className="font-semibold mb-2">
          Lisa rahavoog
        </h2>

        <input
          className="border p-2 w-full mb-2"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          className="border p-2 w-full mb-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option>Algväärtus</option>
          <option>Sissemakse</option>
          <option>Väljamakse</option>
          <option>Lõppväärtus</option>
        </select>

        <input
          className="border p-2 w-full mb-2"
          type="number"
          placeholder="Summa €"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          className="bg-blue-500 text-white p-2 rounded w-full mb-4"
          onClick={addTransaction}
        >
          Lisa
        </button>

        {error && (
          <p className="text-red-500 mb-4">
            {error}
          </p>
        )}

        <h2 className="font-semibold mb-2">
          Rahavood
        </h2>

        {transactions.length === 0 && (
          <p className="text-gray-500">
            Tehinguid pole veel lisatud.
          </p>
        )}

        {transactions.map((transaction, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b py-2 whitespace-nowrap"
          >
            <span>{transaction.date}</span>
            <span className="text-gray-600">{transaction.type}</span>
            <span className="font-semibold">
              {transaction.amount.toFixed(2)} €
            </span>
            <button
              onClick={() => deleteTransaction(index)}
              className="text-red-500 hover:text-red-700"
            >
              ❌
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
