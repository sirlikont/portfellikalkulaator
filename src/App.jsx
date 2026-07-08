import { useState } from "react";

export default function App() {
  const [transactions, setTransactions] = useState([]);

  const [date, setDate] = useState("");
  const [type, setType] = useState("Sissemakse");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");

  // -------------------------
  // 1. LISAME CASHFLOW LOOGIKA
  // -------------------------
  const toCashflow = (t) => {
    const amt = Number(t.amount);

    if (t.type === "Algväärtus") return -amt;
    if (t.type === "Sissemakse") return -amt;
    if (t.type === "Väljamakse") return amt;
    if (t.type === "Lõppväärtus") return amt;

    return amt;
  };

  const cashflows = transactions
    .map((t) => ({
      date: new Date(t.date),
      value: toCashflow(t),
    }))
    .sort((a, b) => a.date - b.date);

  // -------------------------
  // 2. XIRR FUNKTSIOON
  // -------------------------
  function xirr(cashflows, guess = 0.1) {
    const MAX_ITER = 100;
    const EPS = 1e-6;

    const days = (d1, d2) =>
      (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);

    const xnpv = (rate) => {
      const t0 = cashflows[0].date;

      return cashflows.reduce((sum, cf) => {
        const t = days(cf.date, t0) / 365;
        return sum + cf.value / Math.pow(1 + rate, t);
      }, 0);
    };

    let rate = guess;

    for (let i = 0; i < MAX_ITER; i++) {
      const t0 = cashflows[0].date;

      let fx = 0;
      let dfx = 0;

      cashflows.forEach((cf) => {
        const t = days(cf.date, t0) / 365;
        const denom = Math.pow(1 + rate, t);

        fx += cf.value / denom;
        dfx += (-t * cf.value) / ((1 + rate) * denom);
      });

      const newRate = rate - fx / dfx;

      if (Math.abs(newRate - rate) < EPS) {
        return newRate;
      }

      rate = newRate;
    }

    return rate;
  }

  const xirrValue =
    cashflows.length > 1 ? xirr(cashflows) * 100 : 0;

  // Kaitse absurdsete väärtuste eest
  const safeXirrValue = Math.abs(xirrValue) > 10000 ? 0 : xirrValue;

  // -------------------------
  // 3. LIHTTOOTLUS ARVUTUS
  // -------------------------
  const start = transactions.find(t => t.type === "Algväärtus");
  const end = transactions.find(t => t.type === "Lõppväärtus");

  const startDate = start?.date || "";
  const endDate = end?.date || "";

  const deposits = transactions
    .filter(t => t.type === "Sissemakse")
    .reduce((sum, t) => sum + t.amount, 0);

  const withdrawals = transactions
    .filter(t => t.type === "Väljamakse")
    .reduce((sum, t) => sum + t.amount, 0);

  const profit =
    (end?.amount || 0)
    - (start?.amount || 0)
    - deposits
    + withdrawals;

  const invested =
    (start?.amount || 0)
    + deposits
    - withdrawals;

  const totalReturn =
    invested > 0
      ? (profit / invested) * 100
      : 0;

  // -------------------------
  // 4. S&P 500 (lihtne placeholder)
  // -------------------------
  const spReturn = 10; // hiljem API-st

  // -------------------------
  // TEHINGUD
  // -------------------------
  const addTransaction = () => {
    if (!date || amount === 0) return;

    if (
      (type === "Algväärtus" || type === "Lõppväärtus") &&
      transactions.some((t) => t.type === type)
    ) {
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
      <div className="bg-white p-6 rounded-xl shadow-md w-[900px] mx-auto">

        <h1 className="text-2xl font-bold mb-4">
          Portfelli tootluskalkulaator
        </h1>

        {/* INPUT */}
        <h2 className="font-semibold mb-2">Lisa rahavoog</h2>

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
          <p className="text-red-500 mb-4">{error}</p>
        )}

        {/* TEHINGUD */}
        <h2 className="font-semibold mb-2">Rahavood</h2>

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
            <span className="text-gray-600">
              {transaction.type}
            </span>
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

        {/* TULEMUSED */}
        <div className="mb-6 whitespace-nowrap">
          <span className="font-semibold text-sm">Periood: {startDate || "—"} – {endDate || "—"} | </span>
          <span className="font-semibold text-sm">Kasum: {profit.toFixed(2)} € | </span>
          <span className="font-semibold text-sm">Lihttootlus: {totalReturn.toFixed(2)} %</span>
        </div>

        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="font-semibold">
            XIRR tootlus: {safeXirrValue.toFixed(2)} %
          </p>

          <p>
            S&P 500 (ligikaudne): {spReturn.toFixed(2)} %
          </p>

          <p className="font-semibold mt-1">
            Vahe: {(safeXirrValue - spReturn).toFixed(2)} %
          </p>
        </div>

      </div>
    </div>
  );
}