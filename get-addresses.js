const hre = require("hardhat");

async function main() {
  console.log("🔍 Getting deployed contract addresses...");
  
  // Deploy contracts and get addresses
  const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
  const invoiceManager = await InvoiceManager.deploy();
  await invoiceManager.waitForDeployment();
  
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  
  const invoiceManagerAddress = await invoiceManager.getAddress();
  const escrowAddress = await escrow.getAddress();
  
  console.log("📋 InvoiceManager Address:", invoiceManagerAddress);
  console.log("🔒 Escrow Address:", escrowAddress);
  
  console.log("\n📝 Update your .env file with these addresses:");
  console.log(`NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS=${invoiceManagerAddress}`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
