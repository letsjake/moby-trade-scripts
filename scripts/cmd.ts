import { ArgumentParser } from "argparse";

const parser = new ArgumentParser({
  description: "Script to sell a put option on the Arbitrum network",
});
const parserOpenClose = parser.add_mutually_exclusive_group({ required: true });
const parserBuySell = parser.add_mutually_exclusive_group({ required: true });
const parserCallPut = parser.add_mutually_exclusive_group({ required: true });
const parserNakedCombo = parser.add_mutually_exclusive_group({
  required: true,
});

parser.add_argument("-i", "--instrument", {
  type: "str",
  help: "Instruments to trade",
  required: true,
});

parserOpenClose.add_argument("-o", "--open", {
  action: "store_true",
  help: "Open a new position",
  required: false,
});
parserOpenClose.add_argument("-c", "--close", {
  action: "store_true",
  help: "Close an existing position",
  required: false,
});

parserBuySell.add_argument("--buy", {
  action: "store_true",
  help: "Buy an option",
  required: false,
});
parserBuySell.add_argument("--sell", {
  action: "store_true",
  help: "Sell an option",
  required: false,
});

parserCallPut.add_argument("--call", {
  action: "store_true",
  help: "Call option",
  required: false,
});
parserCallPut.add_argument("--put", {
  action: "store_true",
  help: "Put option",
  required: false,
});

parserNakedCombo.add_argument("--naked", {
  action: "store_true",
  help: "Naked option",
  required: false,
});
parserNakedCombo.add_argument("--combo", {
  action: "store_true",
  help: "Combo option",
  required: false,
});

// if type is combo, required variable(pair) added only when type is combo
parser.add_argument("-p", "--payment", {
  type: "str",
  default: "usdc",
  help: "payment currency. No need to give this option when closing position",
  required: false,
});
parser.add_argument("-a", "--amount", {
  type: "str",
  help: "If open position, amount of USDC amount to sell. If close position, the size of option contract to close.",
  required: true,
});

parser.add_argument("-pair", "--pairStrikePrice", {
  type: "str",
  help: "strike price of pair instrument when buying combo(put spread)",
  required: false,
});

export { parser as argParser };