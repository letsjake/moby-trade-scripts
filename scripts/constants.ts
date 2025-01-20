import * as path from "path";
import * as dotenv from "dotenv";

import ControllerAbi from "./abis/Controller.json";
import PositionManagerAbi from "./abis/PositionManager.json";
import OptionsMarketAbi from "./abis/OptionsMarket.json";
import ERC20Abi from "./abis/ERC20.json";

import { loadJsonFile } from "./utils";

dotenv.config(
  { 
    path: path.resolve(__dirname, '../.env'), 
    override: true 
  }
);

const {
  PRIVATE_KEY,
  RPC_URL,
} = process.env;

const CA = loadJsonFile("contractAddress.json");
const ABIS = {
  CONTROLLER: ControllerAbi,
  POSITION_MANAGER: PositionManagerAbi,
  OPTIONS_MARKET: OptionsMarketAbi,
  ERC20: ERC20Abi,
};
const DECIMALS = {
  "usdc": 6,
  "wbtc": 8,
  "weth": 18,
  "eth": 18,
} as any;

// when it comes to the order of isBuys & isCalls, instrumentPrice, pairPrice, and so on. 
const VARS_MATRIX = {
  call: {
    buy: {
      naked: {
        isBuys: [true, false, false, false],
        isCalls: [true, false, false, false],
      },
      combo: {
        isBuys: [true, false, false, false],
        isCalls: [true, true, false, false],
      },
    },
    sell: {
      naked: {
        isBuys: [false, false, false, false],
        isCalls: [true, false, false, false],
      },
      combo: {
        isBuys: [false, true, false, false],
        isCalls: [true, true, false, false],
      },
    },
  },
  put: {
    buy: {
      naked: {
        isBuys: [true, false, false, false],
        isCalls: [false, false, false, false],
      },
      combo: {
        isBuys: [true, false, false, false],
        isCalls: [false, false, false, false],
      },
    },
    sell: {
      naked: {
        isBuys: [false, false, false, false],
        isCalls: [false, false, false, false],
      },
      combo: {
        isBuys: [false, true, false, false],
        isCalls: [false, false, false, false],
      },
    },
  },
} as any;

const MOBY_BACKEND_APIS = {
  CURRENT_POSITION: "https://api.moby.trade/v1/account/positions",
  MARKET_DATA: "https://api.moby.trade/v1/market/all",
};

export {
  PRIVATE_KEY,
  RPC_URL,
  CA,
  ABIS,
  DECIMALS,
  VARS_MATRIX,
  MOBY_BACKEND_APIS,
};
