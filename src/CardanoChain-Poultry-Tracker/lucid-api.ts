import { Application, Router } from "https://deno.land/x/oak@v12.5.0/mod.ts";
import {
  Lucid,
  Blockfrost,
  Address,
  MintingPolicy,
  PolicyId,
  Unit,
  fromText,
  Data,
  applyParamsToScript,
} from "https://deno.land/x/lucid@0.9.1/mod.ts";

const router = new Router();

// API Endpoint: Mint NFT
router.post("/mint", async (context) => {
  try {

    const body = await context.request.body({ type: "json" }).value;

    // Initialize Lucid with Blockfrost API
    const lucid = await Lucid.new(
      new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", body.blockfrostKey),
      "Preprod"
    );

    // Load wallet from seed
    lucid.selectWalletFromSeed(body.secretSeed);


    const tokenName = body.tokenName;
    const tn = fromText(tokenName);

    // Get wallet address
    const addr: Address = await lucid.wallet.address();
    console.log("Wallet Address:", addr);

    // Fetch UTXOs
    const utxos = await lucid.utxosAt(addr);
    if (utxos.length === 0) {
      context.response.status = 400;
      context.response.body = { error: "No UTXOs available for minting." };
      return;
    }

    // Select the first UTXO
    const utxo = utxos[0];
    console.log("Selected UTXO:", utxo);

    // Validate txHash format
    if (!utxo.txHash.match(/^[0-9a-fA-F]{64}$/)) {
      context.response.status = 400;
      context.response.body = { error: "Invalid transaction hash format." };
      return;
    }

    // Minting Policy Parameters
    const Params = Data.Tuple([Data.String, Data.BigInt, Data.String]);
    type Params = Data.Static<typeof Params>;

    const nftPolicy: MintingPolicy = {
      type: "PlutusV2",
      script: applyParamsToScript<Params>(
        body.cborHex,
        [utxo.txHash, BigInt(utxo.outputIndex), tn],
        Params
      ),
    };
    
    const policyId: PolicyId = lucid.utils.mintingPolicyToId(nftPolicy);
    console.log("Policy ID:", policyId);

    const unit: Unit = policyId + tn;
    console.log("Minting Unit:", unit);

    // Build and sign the transaction
    const tx = await lucid
      .newTx()
      .mintAssets({ [unit]: 1n }, Data.void())
      .attachMintingPolicy(nftPolicy)
      .collectFrom([utxo])
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();

    // Respond with success
    context.response.body = {
      status: "success",
      txHash,
      unit,
      policyId,
    };
  } catch (error) {
    console.error("Error:", error);
    context.response.status = 500;
    context.response.body = { error: error.message };
  }
});

// Start Oak Application
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });