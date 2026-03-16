import { promises as fs } from "fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import crypto from "crypto";
import bs58 from "bs58";

import idl from "./predictsol_idl.json";

type Side = "TRUE" | "FALSE";

type Market = {
  marketId: string;
  title: string;
  trueMint: string;
  falseMint: string;
  collateralSymbol: string;
  isFinalized: boolean;
};

type MarketPrices = {
  marketId: string;
  truePrice: number;
  falsePrice: number;
  liquidityUsd?: number;
  source: string;
  timestamp: string;
};

type FeeConfig = {
  predictsolMintFeeRate: number;
  dexTradeFeeRate: number;
  slippageRate: number;
  networkFeeInCollateral: number;
  minProfitPerPair: number;
};

type Opportunity = {
  marketId: string;
  title: string;
  type: "BUY_ON_EXCHANGE_REDEEM" | "MINT_ON_PREDICTSOL_SELL" | "NONE";
  truePrice: number;
  falsePrice: number;
  totalPrice: number;
  grossProfitPerPair: number;
  estimatedNetProfitPerPair: number;
  notes: string[];
  timestamp: string;
};

const PROGRAM_ID = new PublicKey("Fhud5X7RHZT6159Mr964dhZA6SUDj5Dt8Zk54K4x6Twf");

const connection = new Connection("YOUR API KEY");

const coder = new BorshAccountsCoder(idl as Idl);

const EVENT_DISCRIMINATOR = crypto
  .createHash("sha256")
  .update("account:Event")
  .digest()
  .slice(0, 8);

const CONFIG = {
  scanIntervalMs: 10000,
  outputFile: "./scanner-opportunities.json",
  minLiquidityUsd: 100,
  fees: {
    predictsolMintFeeRate: 0.01,
    dexTradeFeeRate: 0.0025,
    slippageRate: 0.005,
    networkFeeInCollateral: 0.0001,
    minProfitPerPair: 0.002,
  } satisfies FeeConfig,
};

async function fetchPredictSolMarkets(): Promise<Market[]> {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID);

  const markets: Market[] = [];

  // for (const acc of accounts) {
  //   try {
  //     const decoded: any = coder.decode("Event", acc.account.data);
  //     console.log(decoded)
  //     markets.push({
  //       marketId: acc.pubkey.toBase58(),
  //       title: decoded.title,
  //       trueMint: decoded.trueMint.toBase58(),
  //       falseMint: decoded.falseMint.toBase58(),
  //       collateralSymbol: "SOL",
  //       isFinalized: decoded.resolved,
  //     });
  //   } catch {
  //     // skip accounts that fail decoding
  //   }
  // }
  for (const acc of accounts) {

    const disc = acc.account.data.slice(0, 8);
  
    if (!disc.equals(EVENT_DISCRIMINATOR)) {
      continue;
    }
  
    const decoded: any = coder.decode("Event", acc.account.data);
  
    markets.push({
      marketId: acc.pubkey.toBase58(),
      title: decoded.title,
      trueMint: decoded.true_mint.toBase58(),
      falseMint: decoded.false_mint.toBase58(),
      collateralSymbol: "SOL",
      isFinalized: decoded.resolved,
    });
  }

  return markets;
}

async function fetchExchangePrices(market: Market): Promise<MarketPrices> {
  const mock: Record<
    string,
    { truePrice: number; falsePrice: number; liquidityUsd: number }
  > = {
    "market-1": { truePrice: 0.52, falsePrice: 0.44, liquidityUsd: 5000 },
    "market-2": { truePrice: 0.68, falsePrice: 0.36, liquidityUsd: 7000 },
  };

  const row =
    mock[market.marketId] ?? { truePrice: 0.5, falsePrice: 0.5, liquidityUsd: 0 };

  return {
    marketId: market.marketId,
    truePrice: row.truePrice,
    falsePrice: row.falsePrice,
    liquidityUsd: row.liquidityUsd,
    source: "mock-dex",
    timestamp: new Date().toISOString(),
  };
}

function evaluateOpportunity(
  market: Market,
  prices: MarketPrices,
  fees: FeeConfig
): Opportunity {
  const totalPrice = prices.truePrice + prices.falsePrice;
  const notes: string[] = [];

  const buyCost = totalPrice;
  const buyDexFee = buyCost * fees.dexTradeFeeRate;
  const buySlippage = buyCost * fees.slippageRate;

  const redeemValue = 1;

  const netRedeemProfit =
    redeemValue -
    buyCost -
    buyDexFee -
    buySlippage -
    fees.networkFeeInCollateral;

  const mintedQtyPerSide = 1 - fees.predictsolMintFeeRate;

  const sellGrossRevenue =
    mintedQtyPerSide * prices.truePrice +
    mintedQtyPerSide * prices.falsePrice;

  const sellDexFee = sellGrossRevenue * fees.dexTradeFeeRate;
  const sellSlippage = sellGrossRevenue * fees.slippageRate;

  const mintCost = 1;

  const netMintSellProfit =
    sellGrossRevenue -
    sellDexFee -
    sellSlippage -
    fees.networkFeeInCollateral -
    mintCost;

  if (netRedeemProfit > fees.minProfitPerPair) {
    return {
      marketId: market.marketId,
      title: market.title,
      type: "BUY_ON_EXCHANGE_REDEEM",
      truePrice: prices.truePrice,
      falsePrice: prices.falsePrice,
      totalPrice,
      grossProfitPerPair: 1 - totalPrice,
      estimatedNetProfitPerPair: netRedeemProfit,
      notes: ["Buy pair on exchange and redeem"],
      timestamp: new Date().toISOString(),
    };
  }

  if (netMintSellProfit > fees.minProfitPerPair) {
    return {
      marketId: market.marketId,
      title: market.title,
      type: "MINT_ON_PREDICTSOL_SELL",
      truePrice: prices.truePrice,
      falsePrice: prices.falsePrice,
      totalPrice,
      grossProfitPerPair: sellGrossRevenue - mintCost,
      estimatedNetProfitPerPair: netMintSellProfit,
      notes: ["Mint tokens and sell on exchange"],
      timestamp: new Date().toISOString(),
    };
  }

  return {
    marketId: market.marketId,
    title: market.title,
    type: "NONE",
    truePrice: prices.truePrice,
    falsePrice: prices.falsePrice,
    totalPrice,
    grossProfitPerPair: 0,
    estimatedNetProfitPerPair: 0,
    notes: ["No arbitrage"],
    timestamp: new Date().toISOString(),
  };
}

async function writeResults(results: Opportunity[]): Promise<void> {
  await fs.writeFile(CONFIG.outputFile, JSON.stringify(results, null, 2));
}

function printResults(results: Opportunity[]): void {
  console.clear();

  console.log(`PredictSol Arbitrage Scanner`);
  console.log("=".repeat(60));

  for (const r of results) {
    console.log(`Market: ${r.title}`);
    console.log(`Type: ${r.type}`);
    console.log(`TRUE: ${r.truePrice}`);
    console.log(`FALSE: ${r.falsePrice}`);
    console.log(`Total: ${r.totalPrice}`);
    console.log(`Net: ${r.estimatedNetProfitPerPair}`);
    console.log("-".repeat(60));
  }
}

// async function runScanOnce(): Promise<Opportunity[]> {
//   const markets = await fetchPredictSolMarkets();
//   const results: Opportunity[] = [];

//   for (const market of markets) {
//     if (market.isFinalized) continue;

//     const prices = await fetchExchangePrices(market);
//     const result = evaluateOpportunity(market, prices, CONFIG.fees);

//     results.push(result);
//   }

//   await writeResults(results);
//   printResults(results);

//   return results;
// }

async function runScanOnce(): Promise<Opportunity[]> {

  const markets = await fetchPredictSolMarkets();

  console.log("Markets discovered:", markets.length);

  const results: Opportunity[] = [];

  for (const market of markets) {

    console.log("Scanning market:", market.title);

    if (market.isFinalized) continue;

    const prices = await fetchExchangePrices(market);
    const result = evaluateOpportunity(market, prices, CONFIG.fees);

    results.push(result);
  }

  await writeResults(results);
  printResults(results);

  return results;
}

async function main(): Promise<void> {
  await runScanOnce();

  setInterval(async () => {
    await runScanOnce();
  }, CONFIG.scanIntervalMs);
}

main().catch(console.error);