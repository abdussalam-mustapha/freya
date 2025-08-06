const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Freya Invoice Platform with NFT Receipts...");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy InvoiceNFT contract first
  console.log("\n1️⃣ Deploying InvoiceNFT contract...");
  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.deployed();
  console.log("✅ InvoiceNFT deployed to:", invoiceNFT.address);

  // Deploy InvoiceManager contract
  console.log("\n2️⃣ Deploying InvoiceManager contract...");
  const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
  const invoiceManager = await InvoiceManager.deploy();
  await invoiceManager.deployed();
  console.log("✅ InvoiceManager deployed to:", invoiceManager.address);

  // Deploy Escrow contract
  console.log("\n3️⃣ Deploying Escrow contract...");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(invoiceManager.address);
  await escrow.deployed();
  console.log("✅ Escrow deployed to:", escrow.address);

  // Set up integrations
  console.log("\n🔗 Setting up contract integrations...");

  // Set fee recipient to deployer (can be changed later)
  console.log("⚙️ Setting fee recipient...");
  await invoiceManager.setFeeRecipient(deployer.address);
  console.log("✅ Fee recipient set to:", deployer.address);

  // Connect NFT contract to InvoiceManager
  console.log("⚙️ Connecting NFT contract to InvoiceManager...");
  await invoiceManager.setInvoiceNFT(invoiceNFT.address);
  console.log("✅ NFT contract connected to InvoiceManager");

  // Transfer ownership of NFT contract to InvoiceManager
  console.log("⚙️ Transferring NFT contract ownership to InvoiceManager...");
  await invoiceNFT.transferOwnership(invoiceManager.address);
  console.log("✅ NFT contract ownership transferred to InvoiceManager");

  // Verify contracts on Sonic testnet (if verification is available)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await invoiceNFT.deployTransaction.wait(5);
    await invoiceManager.deployTransaction.wait(5);
    await escrow.deployTransaction.wait(5);

    try {
      console.log("🔍 Verifying InvoiceNFT contract...");
      await hre.run("verify:verify", {
        address: invoiceNFT.address,
        constructorArguments: [],
      });
      console.log("✅ InvoiceNFT verified successfully");
    } catch (error) {
      console.log("❌ InvoiceNFT verification failed:", error.message);
    }

    try {
      console.log("🔍 Verifying InvoiceManager contract...");
      await hre.run("verify:verify", {
        address: invoiceManager.address,
        constructorArguments: [],
      });
      console.log("✅ InvoiceManager verified successfully");
    } catch (error) {
      console.log("❌ InvoiceManager verification failed:", error.message);
    }

    try {
      console.log("🔍 Verifying Escrow contract...");
      await hre.run("verify:verify", {
        address: escrow.address,
        constructorArguments: [invoiceManager.address],
      });
      console.log("✅ Escrow verified successfully");
    } catch (error) {
      console.log("❌ Escrow verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment Summary:");
  console.log("========================");
  console.log("InvoiceNFT:", invoiceNFT.address);
  console.log("InvoiceManager:", invoiceManager.address);
  console.log("Escrow:", escrow.address);
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("========================");

  console.log("\n📋 Next Steps:");
  console.log("1. Update frontend .env files with new contract addresses");
  console.log("2. Update backend .env files with new contract addresses");
  console.log("3. Test NFT minting functionality");
  console.log("4. Deploy to production when ready");

  return {
    invoiceNFT: invoiceNFT.address,
    invoiceManager: invoiceManager.address,
    escrow: escrow.address,
    deployer: deployer.address,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
