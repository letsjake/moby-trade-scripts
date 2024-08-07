import * as fs from "fs";
import * as path from "path";
import { strict as assert } from 'assert';
import axios from "axios";
import { ethers } from "ethers";

import { CA, DECIMALS, VARS_MATRIX, MOBY_BACKEND_APIS } from "./constants";

/*********
UTILITY FUNCTIONS
**********/
function loadJsonFile(filePath: string) {
  const fullPath = path.resolve(__dirname, filePath);
  const data = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(data);
}

/*********
EXTERNAL API FOR MARKET DATA
**********/
async function fetchMarketData() {
  try {
    const response = await axios.get(MOBY_BACKEND_APIS.MARKET_DATA);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

async function _fetchUserPositions(account: string) {
  try {
    const response = await axios.get(
      `${MOBY_BACKEND_APIS.CURRENT_POSITION}?method=getMyPositions&address=${account}`
    );
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

const getOptionsInfoFromMarket = (market: any) => {
  return Object.entries(market).reduce((output, [ticker, underlyingAssetData]: any[]) => {
    underlyingAssetData.expiries.forEach((expiry: number) => {
      const options = underlyingAssetData.options[expiry];
      Object.entries(options).forEach(([optionType, optionList]) => {
        (optionList as []).forEach(({
          instrument,
          optionId,
          strikePrice,
          markIv,
          markPrice,
          riskPremiumRateForBuy,
          riskPremiumRateForSell,
          delta,
          gamma,
          vega,
          theta,
          volume,
          isOptionAvailable
        }) => {
          output[instrument] = {
            optionId: optionId,
            strikePrice: strikePrice,
            markIv: markIv,
            markPrice: markPrice,
            riskPremiumRateForBuy: riskPremiumRateForBuy,
            riskPremiumRateForSell: riskPremiumRateForSell,
            delta: delta,
            gamma: gamma,
            vega: vega,
            theta: theta,
            volume: volume,
            isOptionAvailable: isOptionAvailable
          };
        });
      });
    });
    return output;
  }, {} as any);
}

function getOptionIds(data: any) {
  const options = data.data.options;
  // Get all option objects for each expiry
  const optionIdsArray = Object.entries(options).map(
    ([instrument, optionData]: any) => {
      return [instrument, optionData.optionId];
    }
  );

  const optionIdsObj = optionIdsArray.reduce(
    (acc: any, [instrument, optionId]: any) => {
      acc[instrument] = optionId;
      return acc;
    },
    {}
  );

  return optionIdsObj;
}

async function getOptionTokenId(props: any) {
  const optionTokenIds = await _fetchUserPositions(
    await props.signer.getAddress()
  );
  const underlyingAsset = props.targetInstrument.split("-")[0];

  const positions = optionTokenIds[underlyingAsset][0].positions.map(
    (position: any) => {
      return {
        optionTokenId: position.optionTokenId,
        optionNames: position.optionNames,
        size: position.size,
        sizeOpened: position.sizeOpened,
        sizeClosing: position.sizeClosing,
        sizeClosed: position.sizeClosed,
        sizeSettled: position.sizeSettled,
        isBuys: position.isBuys,
        strikePrices: position.strikePrices,
        isCalls: position.isCalls,
      };
    }
  );

  if (props.args.naked) {
    const optionTokenId = positions
      .filter((position: any) => {
        return position.optionNames.split(",")[0] === props.targetInstrument;
      })
      .map((position: any) => position.optionTokenId);
    return optionTokenId[0];
  } else if (props.args.combo && props.args.call) {
    const optionTokenId = positions
      .filter((position: any) => {
        return (
          position.optionNames.split(",")[0] === props.targetInstrument &&
          position.strikePrices.split(",")[1] === props.pairStrikePrice
        );
      })
      .map((position: any) => position.optionTokenId);
    return optionTokenId[0];
  } else if (props.args.combo && props.args.put) {
    const optionTokenId = positions
      .filter((position: any) => {
        return (
          position.optionNames.split(",")[1] === props.targetInstrument &&
          position.strikePrices.split(",")[0] === props.pairStrikePrice
        );
      })
      .map((position: any) => position.optionTokenId);
    return optionTokenId[0];
  } else {
    console.log("Invalid type. Please choose either [naked, combo]");
    throw new Error("Invalid type. Please choose either [naked, combo]");
  }
}

/*********
OPTION-RELATED FUNCTIONS
**********/
async function openOptionPosition(
  props: any, 
) {
  const underlyingAsset = 'W' + props.instrument.split("-")[0].toUpperCase();
  const underlyingAssetIndex = underlyingAsset === "WBTC" ? 1 : 2; // 1: WBTC, 2: WETH
  const length = props.args.naked ? 1 : 2; // 1: naked 2: combo
  const { isBuys, isCalls } = VARS_MATRIX[props.args.call ? "call" : "put"][props.args.buy ? "buy" : "sell"][props.args.naked ? "naked" : "combo"];
  const optionIds = [
    ...props.optionIds, 
    ethers.ZeroHash,
    ethers.ZeroHash
  ];
  const minSize = 1;
  const paymentAsset = props.args.payment.toUpperCase();
  
  let path;
  if (props.args.buy && paymentAsset !== "USDC") {
    path = [CA[paymentAsset], CA.USDC];
  } else if (props.args.buy && paymentAsset === "USDC") {
    path = [CA.USDC];
  } else if (props.args.sell && props.args.call && props.args.naked) {
    assert(paymentAsset === underlyingAsset, "Payment asset must be the same as underlying asset.")
    path = [CA[paymentAsset]];
  } else {
    assert(paymentAsset === "USDC", "Payment asset must be the USDC.")
    path = [CA.USDC];
  }
  const amountIn = ethers.parseUnits(props.args.amount, DECIMALS[paymentAsset.toLowerCase()]); // usdc amount for collateral
  const minOutWhenSwap = 0; // Example value
  const executionFee = ethers.parseUnits('0.00006', 18); // Execution fee is fixed

  console.log(
    'underlyingAssetIndex:', underlyingAssetIndex,
    'length:', length,
    'isBuys:', isBuys,
    'isCalls:', isCalls,
    'optionIds:', optionIds,
    'minSize:', minSize,
    'paymentAsset:', paymentAsset,
    'path:', path,
    'amountIn:', amountIn,
    'minOutWhenSwap:', minOutWhenSwap,
    'executionFee:', executionFee,
  )
  
  try {
      let tx;
      if(paymentAsset === 'ETH') { // not enter in this case if selling
        //TODO
        tx = await props.contracts.positionManager.createOpenPositionETH(
          underlyingAssetIndex,
          length,
          isBuys,
          optionIds,
          isCalls,
          minSize,
          [CA.WETH, CA.USDC],
          minOutWhenSwap,
          {
              value: amountIn + executionFee,
              gasLimit: 2000000 // Adjust the gas limit as needed
          }
        );
      } else {
        tx = await props.contracts.positionManager.createOpenPosition(
            underlyingAssetIndex,
            length,
            isBuys,
            optionIds,
            isCalls,
            minSize,
            path,
            amountIn,
            minOutWhenSwap,
            {
                value: executionFee,
                gasLimit: 2000000 // Adjust the gas limit as needed
            }
        );
      }
      const receipt = await tx.wait();
      console.log(
        `Open Position for ${props.args.buy ? "Buy" : "Sell"} ${props.args.call ? "Call" : "Put"} ${props.args.naked ? "" : "Spread"}:
        Txhash: https://arbiscan.io/tx/${receipt.hash}
        Sender: ${receipt.from}`
      );
  } catch (error) {
      console.error('Error:', error);
  }
}

async function closeOptionPosition(
  props: any, 
) {
  const underlyingAsset = 'W' + props.instrument.split("-")[0].toUpperCase();
  const underlyingAssetIndex = underlyingAsset === "WBTC" ? 1 : 2; // 1: BTC, 2: ETH
  const optionTokenId = props.optionTokenId;
  const size = ethers.parseUnits(props.args.amount, underlyingAssetIndex === 1 ? 8 : 18); // amount of option contract to close
  const path = [
    props.args.sell && props.args.call && props.args.naked ?
    CA[underlyingAsset] : 
    CA.USDC
  ];
  const minAmountOut = 0;
  const minOutWhenSwap = 0;
  const withdrawETH = false; 

  const executionFee = ethers.parseUnits('0.00006', 18); // Execution fee is fixed

  console.log(
    'underlyingAssetIndex:', underlyingAssetIndex,
    'optionTokenId:', optionTokenId,
    'size:', size,
    'path:', path,
    'minAmountOut:', minAmountOut,
    'minOutWhenSwap:', minOutWhenSwap,
    'withdrawETH:', withdrawETH,
  )

  try {
      const tx = await props.contracts.positionManager.createClosePosition(
          underlyingAssetIndex,
          optionTokenId,
          size,
          path,
          minAmountOut,
          minOutWhenSwap,
          withdrawETH,
          {
              value: executionFee,
              gasLimit: 2000000 // Adjust the gas limit as needed
          }
      );
      const receipt = await tx.wait();
      console.log(
        `Close Position for ${props.args.buy ? "Buy" : "Sell"} ${props.args.call ? "Call" : "Put"} ${props.args.naked ? "" : "Spread"}:
        Txhash: https://arbiscan.io/tx/${receipt.hash}
        Sender: ${receipt.from}`
      );
  } catch (error) {
      console.error('Error:', error);
  }
}

export {
  loadJsonFile,

  fetchMarketData,
  getOptionsInfoFromMarket,
  getOptionIds,
  getOptionTokenId,

  openOptionPosition,
  closeOptionPosition
};
