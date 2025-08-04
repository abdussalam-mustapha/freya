const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Getting deployed contract addresses...\n");

  try {
    // Deploy InvoiceManager to get address
    console.log("📋 Deploying InvoiceManager...");
    const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
    const invoiceManager = await InvoiceManager.deploy({
      gasPrice: 60000000000,
      gasLimit: 3000000
    });
    await invoiceManager.waitForDeployment();
    const invoiceManagerAddress = await invoiceManager.getAddress();
    console.log("✅ InvoiceManager:", invoiceManagerAddress);

    // Deploy Escrow to get address
    console.log("\n🔒 Deploying Escrow...");
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy({
      gasPrice: 60000000000,
      gasLimit: 3000000
    });
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("✅ Escrow:", escrowAddress);

    console.log("\n📝 Contract Addresses:");
    console.log("NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS=" + invoiceManagerAddress);
    console.log("NEXT_PUBLIC_ESCROW_ADDRESS=" + escrowAddress);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
