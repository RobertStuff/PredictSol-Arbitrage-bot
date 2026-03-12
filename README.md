# PredictSol Arbitrage Bot

Developer Documentation

## Overview

The PredictSol Arbitrage Bot is an automated trading system that identifies and exploits pricing discrepancies between PredictSol prediction tokens and external exchanges.

PredictSol events generate tokenized outcomes that represent the possible results of an event. These tokens can trade freely on decentralized exchanges (DEXs).

Because PredictSol allows both minting and redeeming token pairs, arbitrage traders can profit whenever market prices diverge from the theoretical value of the tokens.

Arbitrage trading helps the ecosystem by:

- improving market efficiency
- stabilizing token prices
- increasing liquidity
- strengthening price discovery


---

# PredictSol Token Model

Each prediction event generates two outcome tokens.

| Token | Meaning |
|------|--------|
| TRUE | The event occurs |
| FALSE | The event does not occur |

These tokens represent claims on the collateral deposited when the event market is created.

---

# Minting Tokens

To mint tokens, a user deposits collateral into the PredictSol contract.

PredictSol charges a **1% protocol fee during minting**.

Example:


Collateral deposited = 1
Protocol fee = 1%


After minting, the user receives:


0.99 TRUE tokens
0.99 FALSE tokens


The fee reduces the total tokens minted from the deposited collateral.

---

# Redemption Rules

## Pair Redemption (Before Finalization)

Equal quantities of TRUE and FALSE tokens can be redeemed at any time, even before the event is finalized.


TRUE + FALSE → 1 collateral


This guarantees that a complete token pair always represents **1 unit of collateral value**.

---

## Finalized Event Redemption

Once the oracle finalizes the event outcome:

If TRUE wins:


1 TRUE → 1 collateral


If FALSE wins:


1 FALSE → 1 collateral


The losing token becomes worthless.

---

## Rare Case: No Winner

In rare cases the oracle may declare that an event has no determinable outcome.

In such situations PredictSol may allow:


TRUE + FALSE → collateral refund


---

# Arbitrage Opportunities

Because tokens trade freely on exchanges, their prices may temporarily diverge from their theoretical value.

PredictSol supports two primary arbitrage directions.

Real arbitrage calculations must account for additional costs including:

- exchange trading fees
- slippage from liquidity pools
- Solana network transaction fees
- liquidity depth

---

# Arbitrage Type 1  
## Buy on Exchange → Redeem on PredictSol

If tokens are underpriced on an exchange, traders can buy them and redeem the pair on PredictSol.

### Example (before fees)

Exchange prices:


TRUE = 0.52
FALSE = 0.44


Total purchase price:


0.96


### Arbitrage Strategy

Step 1 — Buy tokens on exchange


Buy 1 TRUE
Buy 1 FALSE
Total cost = 0.96


Step 2 — Redeem token pair on PredictSol


TRUE + FALSE → 1 collateral


Step 3 — Profit


1.00 − 0.96 = 0.04


### Important Note

In practice, trading fees and slippage reduce profit. A bot must calculate:


expected_profit =
redeem_value
− token_cost
− exchange_fees
− network_fees
− slippage


### Arbitrage Condition

The theoretical condition is:


TRUE price + FALSE price < 1


In practice bots typically require a lower threshold  
(for example `< 0.99`) to ensure profitability after fees.

---

# Arbitrage Type 2  
## Mint on PredictSol → Sell on Exchange

If exchange prices are high, traders can mint tokens on PredictSol and sell them on the exchange.

### Example (before fees)

Minting cost:


Collateral deposited = 1


Tokens received:


0.99 TRUE
0.99 FALSE


Exchange prices:


TRUE = 0.70
FALSE = 0.35


Total market value of minted tokens:


0.99 × 0.70 + 0.99 × 0.35
= 1.0395


### Arbitrage Strategy

Step 1 — Mint tokens on PredictSol


Deposit 1 collateral
Receive 0.99 TRUE + 0.99 FALSE


Step 2 — Sell tokens on exchange


Sell TRUE tokens
Sell FALSE tokens


Step 3 — Profit


Revenue = 1.0395
Cost = 1.0000
Profit = 0.0395


### Arbitrage Condition

Mint arbitrage becomes profitable when:


0.99 × (TRUE price + FALSE price) > 1


Simplified:


TRUE price + FALSE price > 1.01


In practice bots require a higher threshold  
(for example `1.02` or greater) to account for exchange trading fees, slippage, and transaction costs.

---

# No-Arbitrage Range

Because PredictSol charges a **1% mint fee**, markets tend to stabilize within a pricing band.


1 ≤ TRUE price + FALSE price ≤ 1.01


| Condition | Arbitrage Action |
|----------|----------------|
| TRUE + FALSE < 1 | Buy on exchange → redeem |
| TRUE + FALSE > 1.01 | Mint on PredictSol → sell |
| 1 ≤ TRUE + FALSE ≤ 1.01 | No arbitrage |

In practice trading fees widen this band slightly.

---

# Arbitrage Bot Architecture

A PredictSol arbitrage bot typically contains several components.

---

## Market Scanner

Continuously monitors:

- PredictSol events
- TRUE and FALSE token prices
- exchange liquidity pools

Typical scan interval:


5–15 seconds


---

## Opportunity Detector

Calculates token price totals:


total = TRUE_price + FALSE_price


Then evaluates arbitrage conditions while incorporating estimated trading costs.

---

## Trade Executor

Executes blockchain transactions when profitable opportunities appear.

Possible actions include:


Buy tokens on exchange
Redeem token pair


or


Mint tokens on PredictSol
Sell tokens on exchange


---

## Risk Management

The bot must account for:

- exchange trading fees
- slippage
- network transaction costs
- liquidity depth

Example configuration:


max_slippage = 1%
max_trade_size = 100 tokens
min_liquidity = $1000


Bots typically include a **minimum profit threshold** to ensure trades remain profitable.

---

# Arbitrage Bot Pseudocode

Example simplified logic:

```text
while(true){

    markets = fetchPredictSolMarkets()

    for(market of markets){

        truePrice = getTrueTokenPrice(market)
        falsePrice = getFalseTokenPrice(market)

        total = truePrice + falsePrice

        if(total < 0.99){
            buyTokensOnExchange(market)
            redeemPairOnPredictSol(market)
        }

        if(total > 1.02){
            mintTokensOnPredictSol(market)
            sellTokensOnExchange(market)
        }

    }
}
```

## Probability Interpretation

Prediction markets naturally encode probabilities.

In PredictSol, the **TRUE token price** represents the market’s estimate of the probability that the event will occur.

### Example

TRUE price = 0.73
FALSE price = 0.27


### Interpretation

Market estimates a **73% probability** that the event occurs.

Due to fees and market dynamics, prices may fluctuate slightly, but markets typically converge near:

TRUE + FALSE ≈ 1

---

## Benefits to the PredictSol Ecosystem

Arbitrage trading provides several key benefits.

### Efficient Pricing
Keeps token values close to equilibrium.

### Increased Liquidity
More trading activity improves market depth.

### Market Stability
Price discrepancies are corrected quickly.

### Decentralized Participation
Anyone can run an arbitrage bot, ensuring open and competitive markets.

---

## Conclusion

The PredictSol Arbitrage Bot helps ensure that tokenized prediction markets remain efficient and accurately priced.

By exploiting price discrepancies between PredictSol and external exchanges, arbitrage traders help:

- maintain price equilibrium
- increase market liquidity
- strengthen the reliability of prediction markets

---

## Contributing

PredictSol is an open ecosystem, and this repository is a **fun experiment** exploring how arbitrage bots can interact with prediction markets.

If you enjoy building trading bots, experimenting with Solana, or exploring prediction markets, feel free to jump in and contribute.

### Ideas for Contributions

- improving the market scanner
- integrating real DEX price feeds
- experimenting with arbitrage strategies
- building monitoring tools
- optimizing performance
- testing different trading models

This project is intentionally open and exploratory. Developers are welcome to **fork it, experiment with it, and share improvements**.

Pull requests, ideas, and discussions are always welcome.