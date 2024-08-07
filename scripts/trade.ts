import { ethers } from "ethers";

import { argParser } from "./cmd";
import { CA, ABIS, DECIMALS, PRIVATE_KEY, RPC_URL } from "./constants";
import {
  fetchMarketData,
  getOptionIds,
  getOptionTokenId,
  openOptionPosition,
  closeOptionPosition,
  getOptionsInfoFromMarket,
} from "./utils";

async function approvePluginOrPass(contracts: any, signer: any) {
  let isApproved = await contracts.controller.approvedPlugins(
    await signer.getAddress(),
    CA.POSITION_MANAGER
  );
  if (!isApproved) {
    const tx = await contracts.controller.approvePlugin(CA.POSITION_MANAGER);
    const receipt = await tx.wait();
    console.log(
      `Enable Option Trading: 
        Txhash: https://arbiscan.io/tx/${receipt.hash}
        Sender: ${receipt.from}`
    );
  }
}

async function approvePaymentAssetOrPass(contracts: any, signer: any, args: any) {
  let payment: any;
  if (args.payment === "eth") {
    payment = "weth" as keyof typeof contracts;
  } else {
    payment = args.payment as keyof typeof contracts;
  }

  let approvedAmt = await contracts[payment].allowance(
    await signer.getAddress(),
    CA.POSITION_MANAGER
  );

  if (
    args.open &&
    ethers.parseUnits(args.amount, DECIMALS[args.payment]) > approvedAmt
  ) {
    console.log(
      `args.amount: ${ethers.parseUnits(
        args.amount,
        DECIMALS[args.payment]
      )}, approvedAmt: ${approvedAmt}`
    );
    const tx = await contracts[payment].approve(
      CA.POSITION_MANAGER,
      ethers.parseUnits(args.amount, DECIMALS[args.payment]) - approvedAmt
    ); //allow for needed amount
    const receipt = await tx.wait();
    console.log(
      `Approve ${args.payment}: 
      Txhash: https://arbiscan.io/tx/${receipt.hash}
      Sender: ${receipt.from}`
    );
    console.log(
      `Approve ${args.payment}: ${await contracts[payment].allowance(
        await signer.getAddress(),
        CA.POSITION_MANAGER
      )}`
    );
  }
}

async function createOptionPosition(props: any) {
  if (props.args.open) { // open position
    const instrument = props.args.instrument;
    const marketData = await fetchMarketData();
    const allOptionIds = getOptionsInfoFromMarket(marketData.data.market);

    let optionIds;

    if (props.args.combo) {
      if (!props.args.pairStrikePrice) {
        console.log("Please provide long strike price for combo option");
        return;
      }
      const shortStrikePrice = instrument.split("-")[2];
      const pairStrikePrice = props.args.pairStrikePrice;
      const longOptionInstrument = instrument.replace(
        shortStrikePrice,
        pairStrikePrice
      );
      optionIds = [
        allOptionIds[instrument].optionId,
        allOptionIds[longOptionInstrument].optionId,
      ];
    } else {
      optionIds = [allOptionIds[instrument].optionId, ethers.ZeroHash];
    }

    await openOptionPosition(
      {
        contracts: props.contracts,
        args: props.args,
        optionIds,
        instrument,
      },
    );
  } else if (props.args.close) { // close position
    const instrument = props.args.instrument;
    const optionTokenId = await getOptionTokenId(
      {
        signer: props.signer,
        args: props.args,
        targetInstrument: instrument,
        pairStrikePrice: props.args.pairStrikePrice,
      }
    );

    await closeOptionPosition(
      {
        contracts: props.contracts,
        args: props.args,
        optionTokenId,
        instrument,
      },
    );
  } else {
    console.log(
      "Invalid command. Please use either [-o, --open] or [-c, --close] flag."
    );
  }
}

/*********
 * MAIN FUNCTION
 **********/
export async function main() {
  let args = argParser.parse_args();
  if (args.combo && !args.pairStrikePrice) { argParser.error('--pairStrikePrice is required when --combo is specified'); }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY!, provider);
  // // Create a contract instance
  const contracts = {
    controller: new ethers.Contract(CA.CONTROLLER, ABIS.CONTROLLER, signer),
    positionManager: new ethers.Contract(
      CA.POSITION_MANAGER,
      ABIS.POSITION_MANAGER,
      signer
    ),
    optionsMarket: new ethers.Contract(
      CA.OPTIONS_MARKET,
      ABIS.OPTIONS_MARKET,
      signer
    ),
    wbtc: new ethers.Contract(CA.WBTC, ABIS.ERC20, signer),
    weth: new ethers.Contract(CA.WETH, ABIS.ERC20, signer),
    usdc: new ethers.Contract(CA.USDC, ABIS.ERC20, signer),
  };

  // 1.approve Plugin if not approved
  await approvePluginOrPass(contracts, signer);

  // 2. approve paymentAsset(generally arbitrum USDC) if not
  await approvePaymentAssetOrPass(contracts, signer, args);

  // 3. Create Option Position(open/close)
  await createOptionPosition({ contracts, signer, args });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
