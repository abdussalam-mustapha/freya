const hre = require("hardhat");

async function main() {
  console.log("🔍 Getting NFT contract address from latest deployment...");
  
  // Deploy InvoiceNFT to get the address
  const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  
  const invoiceNFTAddress = await invoiceNFT.getAddress();
  console.log(`📋 InvoiceNFT Address: ${invoiceNFTAddress}`);
  
  return invoiceNFTAddress;
}

main()
  .then((address) => {
    console.log("✅ Complete address:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
