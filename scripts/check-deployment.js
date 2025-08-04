const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking contract deployment status...\n");

  // Get the deployed contract addresses
  const INVOICE_MANAGER_ADDRESS = "0x8836edF198081396BD8209c8320eD7d942441c33";
  const ESCROW_ADDRESS = "0x90EBF2f6e06E6B57130A3752c0d3B73b2d62A607";

  try {
    // Check if there's code at the contract addresses
    console.log("📋 Checking InvoiceManager contract...");
    const invoiceManagerCode = await ethers.provider.getCode(INVOICE_MANAGER_ADDRESS);
    console.log(`Contract code length: ${invoiceManagerCode.length} characters`);
    console.log(`Has code: ${invoiceManagerCode !== '0x'}`);
    
    if (invoiceManagerCode === '0x') {
      console.log("❌ No contract found at InvoiceManager address!");
      return;
    }

    console.log("\n🔒 Checking Escrow contract...");
    const escrowCode = await ethers.provider.getCode(ESCROW_ADDRESS);
    console.log(`Contract code length: ${escrowCode.length} characters`);
    console.log(`Has code: ${escrowCode !== '0x'}`);

    // Try to get the contract instance and call a simple function
    console.log("\n📞 Testing contract function calls...");
    const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
    const invoiceManager = InvoiceManager.attach(INVOICE_MANAGER_ADDRESS);

    // Test nextInvoiceId call
    try {
      const nextId = await invoiceManager.nextInvoiceId();
      console.log(`✅ nextInvoiceId: ${nextId.toString()}`);
    } catch (error) {
      console.log(`❌ nextInvoiceId failed: ${error.message}`);
    }

    // Check network connection
    console.log("\n🌐 Network info:");
    const network = await ethers.provider.getNetwork();
    console.log(`Network name: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}`);
    console.log(`Block number: ${await ethers.provider.getBlockNumber()}`);

    // Check account balance
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Deployer address: ${deployer.address}`);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  } catch (error) {
    console.error("❌ Error checking deployment:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
