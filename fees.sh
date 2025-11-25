cat fees.sh
#!/usr/bin/env bash
set -euo pipefail

#########################
#   CONTRACT ADDRESSES  #
#########################

BASE_CONTRACT="0x3C1AF89cf9773744e0DAe9EBB7e3289e1AeCF0E7"
MEZO_CONTRACT="0xcBaf5066aDc2299C14112E8A79645900eeb3A76a"

#########################
#         RPC URLS      #
#########################

BASE_RPC="${BASE_RPC:-https://sepolia.base.org}"
MEZO_RPC="${MEZO_RPC:-https://rpc.test.mezo.org}"

#########################
#     TOKEN METADATA    #
#########################

TOKEN_SYMBOL_BASE="${TOKEN_SYMBOL_BASE:-USDC}"
TOKEN_DECIMALS_BASE="${TOKEN_DECIMALS_BASE:-6}"

TOKEN_SYMBOL_MEZO="${TOKEN_SYMBOL_MEZO:-mUSD}"
TOKEN_DECIMALS_MEZO="${TOKEN_DECIMALS_MEZO:-18}"

#########################
#   PER-NETWORK WALLETS #
#########################

OWNER_PK_BASE="${OWNER_PK_BASE:-}"
OWNER_PK_MEZO="${OWNER_PK_MEZO:-}"

TREASURY_BASE="${TREASURY_BASE:-}"
TREASURY_MEZO="${TREASURY_MEZO:-}"

#########################
#  BASIC SAFETY CHECKS  #
#########################

if ! command -v cast >/dev/null 2>&1; then
  echo "ERROR: 'cast' not found. Install Foundry: https://book.getfoundry.sh/getting-started/installation"
  exit 1
fi

HAVE_PYTHON=0
if command -v python3 >/dev/null 2>&1; then
  HAVE_PYTHON=1
fi

########################################
#  HELPER: CHECK + OPTIONAL WITHDRAW   #
########################################

check_and_withdraw() {
  local NAME=$1
  local RPC=$2
  local CONTRACT=$3
  local OWNER_PK=$4
  local TREASURY=$5
  local SYMBOL=$6
  local DECIMALS=$7

  echo "======================================"
  echo "Network : $NAME"
  echo "Contract: $CONTRACT"
  echo "RPC     : $RPC"
  echo "Token   : $SYMBOL (decimals: $DECIMALS)"
  echo "--------------------------------------"

  # cast returns e.g. "10000 [1e4]" → grab only the first token
  local raw_fees
  raw_fees=$(cast call "$CONTRACT" "availableFees()(uint256)" --rpc-url "$RPC")
  local fees="${raw_fees%% *}"

  echo "availableFees (raw units) : $fees [$raw_fees]"

  if [[ "$HAVE_PYTHON" -eq 1 ]]; then
    local human
    human=$(python3 - <<EOF
from decimal import Decimal, getcontext
getcontext().prec = 50
fees = Decimal("$fees")
decimals = $DECIMALS
if decimals == 0:
    print(fees)
else:
    print(fees / (Decimal(10) ** decimals))
EOF
)
    echo "availableFees (human)     : $human $SYMBOL"
  else
    echo "availableFees (human)     : [install python3 to auto-format] $SYMBOL"
  fi

  # If we don't have keys/treasury, just show fees and skip withdraw
  if [[ -z "$OWNER_PK" || -z "$TREASURY" ]]; then
    echo "No OWNER_PK or TREASURY configured for $NAME → showing fees only, not withdrawing."
    echo
    return
  fi

  if [[ "${WITHDRAW:-0}" != "1" ]]; then
    echo "WITHDRAW != 1 → not withdrawing on $NAME."
    echo "Set WITHDRAW=1 to actually call withdrawFees."
    echo
    return
  fi

  echo "WITHDRAW=1 → calling withdrawFees($TREASURY, 0) on $NAME ..."
  cast send "$CONTRACT" "withdrawFees(address,uint256)" "$TREASURY" 0 \
    --rpc-url "$RPC" \
    --private-key "$OWNER_PK"

  echo "Withdraw transaction sent on $NAME."
  echo
}

#########################
#         RUN          #
#########################

check_and_withdraw \
  "Base Sepolia" \
  "$BASE_RPC" \
  "$BASE_CONTRACT" \
  "$OWNER_PK_BASE" \
  "$TREASURY_BASE" \
  "$TOKEN_SYMBOL_BASE" \
  "$TOKEN_DECIMALS_BASE"

check_and_withdraw \
  "Mezo Testnet" \
  "$MEZO_RPC" \
  "$MEZO_CONTRACT" \
  "$OWNER_PK_MEZO" \
  "$TREASURY_MEZO" \
  "$TOKEN_SYMBOL_MEZO" \
  "$TOKEN_DECIMALS_MEZO"
