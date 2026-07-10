import { useState, useEffect } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { auth } from "./firebase";
import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [date, setDate] = useState("");
  const [type, setType] = useState("Sissemakse");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [sxr8Prices, setSxr8Prices] = useState([]);
  const [loadingSxr8, setLoadingSxr8] = useState(false);
  const [sxr8Error, setSxr8Error] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const portfolioRef = doc(db, "users", currentUser.uid);
        const portfolioSnap = await getDoc(portfolioRef);

        if (portfolioSnap.exists()) {
          const data = portfolioSnap.data();

          setTransactions(data.transactions || []);

          console.log("Portfell laaditud Firebase'ist");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Format date to dd.mm.yyyy
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Save transactions to localStorage
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  // -------------------------
  // 1. CASHFLOW LOOGIKA
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

  // Filter transactions to only include those within the period (startDate onwards)
  const validTransactions = startDate
    ? transactions.filter(t => new Date(t.date) >= new Date(startDate))
    : transactions;

  // -------------------------
  // 4. SXR8 API FUNKTSIOONID
  // -------------------------
  async function getSxr8History(startDate, endDate) {
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000) + (24 * 60 * 60);

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/SXR8.DE?period1=${start}&period2=${end}&interval=1d`;

    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://cors-anywhere.herokuapp.com/${targetUrl}`,
      targetUrl
    ];

    for (const url of proxies) {
      try {
        const response = await fetch(url, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const json = await response.json();

        if (json.chart && json.chart.result && json.chart.result.length > 0) {
          const result = json.chart.result[0];
          const prices = result.indicators.quote[0];
          const priceData = prices.adjclose || prices.close;
          return result.timestamp.map((time, index) => ({
            date: new Date(time * 1000),
            price: priceData[index]
          }));
        }
      } catch {
        console.log(`Failed with ${url}, trying next option...`);
        continue;
      }
    }

    console.error("All proxy options failed");
    return [];
  }

  function getClosestPrice(prices, date) {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return prices
      .filter(p => {
        const priceDate = new Date(p.date);
        priceDate.setHours(0, 0, 0, 0);
        return priceDate >= target;
      })
      .sort((a, b) => a.date - b.date)[0];
  }

  function getLastPriceBeforeDate(prices, date) {
    const target = new Date(date);
    target.setHours(23, 59, 59, 999);

    return prices
      .filter(p => {
        const priceDate = new Date(p.date);
        priceDate.setHours(0, 0, 0, 0);
        return priceDate <= target;
      })
      .sort((a, b) => b.date - a.date)[0];
  }

  function calculateSxr8Shares(transactions, prices) {
    let shares = 0;

    transactions.forEach(t => {
      if (t.type === "Algväärtus" || t.type === "Sissemakse") {
        const price = getClosestPrice(prices, t.date);

        console.log(
          t.date,
          t.type,
          "raha:",
          t.amount,
          "SXR8 hind:",
          price?.price
        );

        if (price) {
          shares += Number(t.amount) / price.price;
        }
      }
    });

    console.log("KOKKU OSAKUID:", shares);

    return shares;
  }

  function getSxr8Value(shares, prices, endDate) {
    const lastPrice = getLastPriceBeforeDate(prices, endDate);

    if (!lastPrice) return 0;

    return shares * lastPrice.price;
  }

  useEffect(() => {
    const fetchSxr8Data = async () => {
      if (!startDate || !endDate) return;

      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > now || end > now) {
        setSxr8Error("Cannot fetch SXR8 data for future dates");
        setSxr8Prices([]);
        return;
      }

      setLoadingSxr8(true);
      setSxr8Error("");

      const prices = await getSxr8History(startDate, endDate);

      console.log("SXR8 hinnad:");
      console.log(prices);
      console.log("Esimene hind:", prices[0]);
      console.log("Viimane hind:", prices[prices.length - 1]);

      setLoadingSxr8(false);

      if (prices.length === 0) {
        setSxr8Error("Failed to fetch SXR8 data - API may be blocked by CORS. Try using past dates (e.g., 2024-01-01 to 2024-07-01) to test.");
      }

      setSxr8Prices(prices);
    };

    fetchSxr8Data();
  }, [startDate, endDate]);

  const sortedTransactions = [...validTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const sxr8Shares = sxr8Prices.length > 0 ? calculateSxr8Shares(sortedTransactions, sxr8Prices) : 0;
  const sxr8Value = sxr8Prices.length > 0 ? getSxr8Value(sxr8Shares, sxr8Prices, endDate) : 0;

  console.log("SXR8 osakud:", sxr8Shares);
  console.log("SXR8 lõppväärtus:", sxr8Value);

  const sxr8Cashflows = validTransactions
    .map(t => ({
      date: new Date(t.date),
      value: (t.type === "Algväärtus" || t.type === "Sissemakse") ? -t.amount : 0
    }))
    .sort((a, b) => a.date - b.date);

  if (endDate && sxr8Value > 0) {
    sxr8Cashflows.push({
      date: new Date(endDate),
      value: sxr8Value
    });
  }

  const sxr8Xirr = sxr8Cashflows.length > 1 ? xirr(sxr8Cashflows) * 100 : 0;
  const safeSxr8Xirr = Math.abs(sxr8Xirr) > 10000 ? 0 : sxr8Xirr;

  const addTransaction = async () => {
    if (!date || Number(amount) <= 0) return;

    if (
      (type === "Algväärtus" || type === "Lõppväärtus") &&
      transactions.some((t) => t.type === type)
    ) {
      setError(`${type} on juba olemas`);
      return;
    }

    setError("");

    const updatedTransactions = [
      ...transactions,
      {
        date,
        type,
        amount: Number(amount),
      },
    ];

    setTransactions(updatedTransactions);

    if (user) {
      await savePortfolioToFirebase(updatedTransactions);
    }

    setDate("");
    setAmount("");
    setType("Sissemakse");
  };

  const deleteTransaction = async (indexToDelete) => {
    const updatedTransactions = transactions.filter(
      (_, index) => index !== indexToDelete
    );

    setTransactions(updatedTransactions);

    if (user) {
      await savePortfolioToFirebase(updatedTransactions);
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        setUser(null);
        setTransactions([]);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const savePortfolioToFirebase = async (portfolioTransactions) => {
    if (!user) return;

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          transactions: portfolioTransactions,
          updatedAt: new Date()
        }
      );

      console.log("Portfell salvestatud Firebase'i");
    } catch (error) {
      console.error("Salvestamise viga:", error);
    }
  };

  return (
    <div className="app">

      <main className="flex-1 py-10">
        <div className="bg-white p-6 rounded-xl shadow-md w-[900px] mx-auto">

        <h1 className="text-2xl font-bold mb-4">
          Portfelli tootluskalkulaator
        </h1>

        {user ? (
          <div className="mb-4 flex items-center">
            <span style={{ marginRight: '16px' }}>{user.displayName}</span>
            <span className="text-sm text-gray-600" style={{ marginRight: '16px' }}>
              {user.email}
            </span>

            <button 
              onClick={handleLogout} 
              className="bg-gray-500 text-white p-2 rounded"
            >
              Logi välja
            </button>
          </div>
        ) : (
          <div className="mb-4 flex items-center">
            <span className="text-sm text-gray-600" style={{ marginRight: '8px' }}>
              Kui soovid oma portfelli salvestada, siis
            </span>
            <button
              onClick={() => {
                const provider = new GoogleAuthProvider();

                signInWithPopup(auth, provider)
                  .then((result) => {
                    setUser(result.user);
                  })
                  .catch((error) => {
                    console.error(error);
                  });
              }}
              className="bg-green-500 text-white p-2 rounded"
            >
              Logi sisse Google'iga
            </button>
          </div>
        )}

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
          <p className="text-red-500 mb-4">{error}</p>
        )}

        <h2 className="font-semibold mb-2">
          Minu portfell:
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
            <span>{formatDate(transaction.date)}</span>
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
          <span className="font-semibold text-sm">Periood: {formatDate(startDate) || "—"} – {formatDate(endDate) || "—"} | </span>
          <span className="font-semibold text-sm">Kasum: {profit.toFixed(2)} € | </span>
          <span className="font-semibold text-sm">Lihttootlus: {totalReturn.toFixed(2)} %</span>
        </div>

        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="font-semibold">
            Minu portfelli XIRR: {safeXirrValue.toFixed(2)} %
          </p>

          {loadingSxr8 ? (
            <p>Laadin SXR8 andmeid...</p>
          ) : sxr8Error ? (
            <p className="text-red-500">{sxr8Error}</p>
          ) : (
            <>
              <p title="Võrdlusindeksina kasutatakse eurodes noteeritud SXR8 ETF-i, et välistada euro ja USA dollari vahetuskursi muutustest tulenev valuutarisk. See võimaldab hinnata portfelli tootlust võrreldes S&P 500 indeksiga võimalikult objektiivselt, kuna tootluste erinevus ei ole mõjutatud valuutakõikumistest.">
                S&P500 XIRR tootlus samade sissemaksete korral: {safeSxr8Xirr.toFixed(2)} %
              </p>

              <p className="font-semibold mt-1">
                Vahe: {(safeXirrValue - safeSxr8Xirr).toFixed(2)} %
              </p>

              {safeXirrValue > safeSxr8Xirr && (
                <h2 className="font-semibold mb-2">
                  Sinu portfell edestas S&P500
                </h2>
              )}

              {safeXirrValue < safeSxr8Xirr && (
                <h2 className="font-semibold mb-2">
                  Praegu on S&P 500 indeks sinu portfelli edestanud. Kui oleksid investeerinud samad summad SXR8 ETF-i, oleks sinu portfelli väärtus täna umbes {(sxr8Value - (end?.amount || 0)).toFixed(2)} € suurem. See on hea võimalus analüüsida, kas sinu investeerimisstrateegia loob pikaajaliselt indeksiga võrreldes lisaväärtust.
                </h2>
              )}

            </>
          )}
        </div>
      </div>
      </main>

      <footer className="text-center text-sm text-gray-500 py-4">
      <p>© Sirli Kont {new Date().getFullYear()}</p>
      <a href="mailto:sirlikont@gmail.com">sirlikont@gmail.com</a>
      </footer>
    </div>
  );
}
