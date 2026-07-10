# 📈 Invest Calc

A simple investment portfolio calculator that helps compare your personal portfolio performance against the S&P 500 index using the euro-denominated SXR8 ETF.

## 🚀 About the project

Invest Calc allows users to:

- add portfolio transactions (deposits and portfolio value changes)
- calculate portfolio return using XIRR
- compare results against SXR8 ETF performance
- see whether active investing has outperformed a passive index strategy

The goal of the project is to make investment performance comparison easier and more understandable.

## ✨ Features

✅ Portfolio transaction tracking  
✅ XIRR return calculation  
✅ SXR8 ETF benchmark comparison  
✅ Automatic profit/loss calculation  
✅ Local browser storage (no account required)  
✅ Responsive design

## 🧮 Why SXR8 comparison?

The portfolio is compared with SXR8 instead of a USD-based S&P 500 ETF because SXR8 is traded in euros.

This removes the effect of EUR/USD exchange rate changes and provides a more accurate comparison for an investor whose portfolio is also measured in euros.

## 💾 Data storage

The application uses browser `localStorage`.

This means:
- no registration is required
- data stays on the user's device
- no external database is needed

## 🛠️ Technologies

Built with:

- React
- Vite
- JavaScript
- CSS

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/sirlikont/invest-calc.git
```

Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Build production version:
```bash
npm run build
```
🌐 Live demo

[https://sirlikont.github.io/portfellikalkulaator/](https://sirlikont.github.io/portfellikalkulaator/)



📄 License

This project is for educational purposes.

Author: Sirli Kont
Contact: sirli.kont@gmail.com