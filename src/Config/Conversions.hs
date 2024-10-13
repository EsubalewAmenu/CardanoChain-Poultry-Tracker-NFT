{-# LANGUAGE GADTs #-}

module Conversions
  (
  validatorHash
  , validatorHash'
  , policyHash
  , currencySymbol
  , bytesToHex

  ) where

import qualified Cardano.Api                 as Api

import qualified Data.ByteString             as BS

-- import PlutusTx.Prelude                      ((.))
import qualified Data.ByteString.Base16      as BS16

import           Plutus.V2.Ledger.Api        (CurrencySymbol (CurrencySymbol),
                                              MintingPolicy,
                                              MintingPolicyHash (MintingPolicyHash), Validator)
import qualified Plutus.V2.Ledger.Api        as Plutus
import           PlutusTx.Builtins.Internal  (BuiltinByteString (..))
import           Serialise         (policyToScript, validatorToScript)


hashScript :: Api.PlutusScript Api.PlutusScriptV2 -> Api.ScriptHash
hashScript = Api.hashScript . Api.PlutusScript Api.PlutusScriptV2

validatorHash :: Validator -> Api.ScriptHash
validatorHash = hashScript . validatorToScript

validatorHash' :: Validator -> Plutus.ValidatorHash
validatorHash' = Plutus.ValidatorHash . BuiltinByteString . Api.serialiseToRawBytes . hashScript . validatorToScript

policyHash :: MintingPolicy -> MintingPolicyHash
policyHash = MintingPolicyHash . BuiltinByteString . Api.serialiseToRawBytes . hashScript . policyToScript

currencySymbol :: MintingPolicy -> CurrencySymbol
currencySymbol = CurrencySymbol . BuiltinByteString . Api.serialiseToRawBytes . hashScript . policyToScript


-- bytesFromHex :: BS.ByteString -> BS.ByteString
-- bytesFromHex = either error id . BS16.decode

bytesToHex :: BS.ByteString -> BS.ByteString
bytesToHex = BS16.encode

