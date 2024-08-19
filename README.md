
# Moby.trade Scripts

This repository contains scripts for trading options on https://moby.trade in Arbitrum.

* Usage docs: https://docs.moby.trade/developers/trade-scripts

## Pre-requisite
Run this command:
```bash
yarn install && yarn global add ts-node
```

Then, please create and fill the `.env` file with the following content. You can refer to the `.env.template` file.
You should locate the `.env` file in the root directory.

```bash
PRIVATE_KEY= # Private key of your trading account
RPC_URL= # RPC URL of the Arbitrum mainnet
```

## Run the script
**Note**: About -p PAYMENT, it is used for payment currency for buying, and collateral currency for selling. 

```bash
ts-node scripts/trade.ts [-h] -i INSTRUMENT (-o | -c) (--buy | --sell) (--call | --put) (--naked | --combo) [-p PAYMENT] -a AMOUNT [-pair PAIR_STRIKE_PRICE]
```

### Examples For Open Positions

1. [**Buy Call**] Open position for buying a naked call option("BTC-3JUL24-61250-C") with amount of 0.0000001 **WBTC**:
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-C --buy --call --naked -p wbtc -a 0.0000001
```
2. [**Sell Call**] Open position for selling a naked call option("BTC-3JUL24-61250-C") with amount of 0.0000001 **WBTC contracts**:
* In Sell Call case, the payment currency should be same as underlying asset.
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-C --sell --call --naked -p wbtc -a 0.0000001
```
3. [**Buy Call Spread**] Open position for buying a combo call option("BTC-3JUL24-61250-C") with amount of 0.00000001 **WBTC** with pair strike price of 63000:
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-C --buy --call --combo -p eth -a 0.000001 -pair 63000
```
4. [**Sell Call Spread**] Open position for selling a combo call option("BTC-3JUL24-61250-C") with collateral amount of 0.01 **USDC** with pair strike price of 63000:
* In Sell Call Spread case, the payment currency should be USDC.
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-C --sell --call --combo -p usdc -a 0.01 --pair 63000
```
5. [**Buy Put**] Open position for buying a naked put option("BTC-3JUL24-61250-P") with amount of 0.01 **USDC**:
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-P --buy --put --naked -p usdc -a 0.01
```
6. [**Sell Put**] Open position for selling a naked put option("BTC-3JUL24-61250-P") with collateral amount of 0.01 **USDC**:
* In Sell Put case, the payment currency should be USDC.
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-P --sell --put --naked -p usdc -a 0.01
```
7. [**Buy Put Spread**] Open position for buying a combo put option("BTC-3JUL24-61250-P") with paying amount of 0.001 **WBTC** with pair strike price of 60500:
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-P --buy --put --combo -p usdc -a 0.001 --pair 60500
```
8. [**Sell Put Spread**] Open position for selling a combo put option("BTC-3JUL24-61250-P") with amount of 0.1 **USDC** with pair strike price of 60500:
* In Sell Put Spread case, the payment currency should be USDC.
```bash
ts-node scripts/trade.ts -o -i BTC-3JUL24-61250-P --sell --put --combo -p usdc -a 0.1 --pair 60500
```

### Examples For Close Positions

Every cases are similar to the open positions, but you need to convert the `-o` flag from `-c` to close the position.
In close script, The value of amount(`-a`) flag is the amount of contract. The decimal of the amount is same as underlying asset's decimal. 

Once more, it doesn't need to be given payment(`-p`) flag when closing position.

If you want to close the position of `BTC-3JUL24-61250-P`, buy put option with 0.01 contracts:
```bash
ts-node scripts/trade.ts -c -i BTC-3JUL24-61250-P --buy --put --naked -a 0.01
```

If you want to close all position of corresponding instrument, you can use `all` option to `-a`  at following command:
```bash
ts-node scripts/trade.ts -c -i BTC-3JUL24-61250-P --buy --put --combo -a all --pair 60500
```