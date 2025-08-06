const hre = require("hardhat");

async function main() {
  console.log("🔗 Integrating NFT contract with InvoiceManager...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  // Contract addresses
  const INVOICE_MANAGER_ADDRESS = "0xfC91C84f52c33fc4073Dc951d15868a7d650EA6E";
  const INVOICE_NFT_ADDRESS = "0x2f4DED1c6aef0865bc3eF4Ad133B21593E72A499";
  
  // Get contract instances
  const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
  const invoiceManager = InvoiceManager.attach(INVOICE_MANAGER_ADDRESS);
  
  const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = InvoiceNFT.attach(INVOICE_NFT_ADDRESS);
  
  try {
    // Step 1: Check current owner of InvoiceManager
    console.log("🔍 Checking InvoiceManager owner...");
    const managerOwner = await invoiceManager.owner();
    console.log("📋 InvoiceManager owner:", managerOwner);
    
    // Step 2: Check current owner of InvoiceNFT
    console.log("🔍 Checking InvoiceNFT owner...");
    const nftOwner = await invoiceNFT.owner();
    console.log("📋 InvoiceNFT owner:", nftOwner);
    
    // Step 3: Set NFT contract address in InvoiceManager (only if deployer is owner)
    if (managerOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("🔧 Setting NFT contract address in InvoiceManager...");
      const setTx = await invoiceManager.setInvoiceNFT(INVOICE_NFT_ADDRESS);
      await setTx.wait();
      console.log("✅ NFT contract address set successfully!");
      console.log("📋 Transaction hash:", setTx.hash);
      
      // Verify the setting
      const currentNFTAddress = await invoiceManager.invoiceNFT();
      console.log("🔍 Current NFT contract address in manager:", currentNFTAddress);
    } else {
      console.log("⚠️ Cannot set NFT address - deployer is not the owner of InvoiceManager");
    }
    
    // Step 4: Transfer NFT contract ownership to InvoiceManager (only if deployer is NFT owner)
    if (nftOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("🔧 Transferring NFT contract ownership to InvoiceManager...");
      const transferTx = await invoiceNFT.transferOwnership(INVOICE_MANAGER_ADDRESS);
      await transferTx.wait();
      console.log("✅ NFT contract ownership transferred successfully!");
      console.log("📋 Transaction hash:", transferTx.hash);
      
      // Verify the transfer
      const newNFTOwner = await invoiceNFT.owner();
      console.log("🔍 New NFT contract owner:", newNFTOwner);
    } else {
      console.log("⚠️ Cannot transfer NFT ownership - deployer is not the owner of InvoiceNFT");
    }
    
    console.log("🎉 NFT integration completed!");
    
  } catch (error) {
    console.error("❌ Error during integration:", error.message);
    
    // Additional debugging
    if (error.message.includes("execution reverted")) {
      console.log("🔍 Debug info:");
      console.log("- Deployer address:", deployer.address);
      console.log("- InvoiceManager address:", INVOICE_MANAGER_ADDRESS);
      console.log("- InvoiceNFT address:", INVOICE_NFT_ADDRESS);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
