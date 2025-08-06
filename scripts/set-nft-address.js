const hre = require("hardhat");

async function main() {
  console.log("🔗 Setting NFT contract address in InvoiceManager...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  // Contract addresses
  const INVOICE_MANAGER_ADDRESS = "0xfC91C84f52c33fc4073Dc951d15868a7d650EA6E";
  const INVOICE_NFT_ADDRESS = "0x2f4DED1c6aef0865bc3eF4Ad133B21593E72A499"; // Deployed NFT contract address
  
  // Get contract instances
  const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
  const invoiceManager = InvoiceManager.attach(INVOICE_MANAGER_ADDRESS);
  
  try {
    console.log("🔧 Setting NFT contract address...");
    const tx = await invoiceManager.setInvoiceNFT(INVOICE_NFT_ADDRESS);
    await tx.wait();
    
    console.log("✅ NFT contract address set successfully!");
    console.log("📋 Transaction hash:", tx.hash);
    
    // Verify the setting
    const currentNFTAddress = await invoiceManager.invoiceNFT();
    console.log("🔍 Current NFT contract address:", currentNFTAddress);
    
  } catch (error) {
    console.error("❌ Error setting NFT address:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
