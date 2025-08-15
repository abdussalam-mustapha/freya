const hre = require("hardhat");

async function main() {
  console.log("🔗 Integrating NFT contract with InvoiceManager...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  // Contract addresses - MAINNET DEPLOYMENT
  const INVOICE_MANAGER_ADDRESS = "0x90315a0d95aDDc5705A641b334EAEa31d7D87FB7";
  const INVOICE_NFT_ADDRESS = "0xCecD9d0D29933518ea4Ad90f7d788D326A96B97E";
  
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
    
    // Get current gas price for mainnet transactions
    const gasPrice = await hre.ethers.provider.getFeeData();
    console.log(`Current gas price: ${gasPrice.gasPrice} wei`);
    
    // Step 3: Set NFT contract address in InvoiceManager (only if deployer is owner)
    if (managerOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("🔧 Setting NFT contract address in InvoiceManager...");
      const setTx = await invoiceManager.setInvoiceNFT(INVOICE_NFT_ADDRESS, {
        gasPrice: gasPrice.gasPrice ? gasPrice.gasPrice * 2n : undefined,
        gasLimit: 200000
      });
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
      const transferTx = await invoiceNFT.transferOwnership(INVOICE_MANAGER_ADDRESS, {
        gasPrice: gasPrice.gasPrice ? gasPrice.gasPrice * 2n : undefined,
        gasLimit: 100000
      });
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
