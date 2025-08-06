const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying InvoiceNFT contract...");

  // Get the contract factory
  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");

  // Deploy the contract
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  
  const invoiceNFTAddress = await invoiceNFT.getAddress();
  console.log(`✅ InvoiceNFT deployed to: ${invoiceNFTAddress}`);

  // Verify the contract on Sonic testnet (if verification is available)
  if (network.name === "sonic-testnet" || network.name === "sonic") {
    console.log("🔍 Verifying contract...");
    try {
      console.log("🔍 Verifying InvoiceNFT contract...");
      await hre.run("verify:verify", {
        address: invoiceNFTAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully");
      console.log("✅ InvoiceNFT contract verified successfully!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  return {
    invoiceNFT: invoiceNFTAddress,
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
