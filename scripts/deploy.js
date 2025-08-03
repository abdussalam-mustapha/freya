const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Freya Invoice Portal deployment...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
    console.warn("⚠️  Warning: Low balance. Make sure you have enough funds for deployment.");
  }
  
  try {
    // Deploy InvoiceManager
    console.log("\n📋 Deploying InvoiceManager contract...");
    const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
    const invoiceManager = await InvoiceManager.deploy();
    await invoiceManager.deployed();
    
    console.log("✅ InvoiceManager deployed to:", invoiceManager.address);
    
    // Deploy Escrow
    console.log("\n🔒 Deploying Escrow contract...");
    const Escrow = await hre.ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    await escrow.deployed();
    
    console.log("✅ Escrow deployed to:", escrow.address);
    
    // Wait for a few block confirmations
    console.log("\n⏳ Waiting for block confirmations...");
    await invoiceManager.deployTransaction.wait(3);
    await escrow.deployTransaction.wait(3);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 InvoiceManager:", invoiceManager.address);
    console.log("🔒 Escrow:", escrow.address);
    
    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      deployer: deployer.address,
      contracts: {
        InvoiceManager: invoiceManager.address,
        Escrow: escrow.address
      },
      timestamp: new Date().toISOString(),
      blockNumber: await hre.ethers.provider.getBlockNumber()
    };
    
    console.log("\n📄 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n🔧 Next steps:");
    console.log("1. Update your frontend .env.local file with these contract addresses");
    console.log("2. Verify contracts on block explorer if needed");
    console.log("3. Test the deployment with your frontend");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment script failed:", error);
    process.exit(1);
  });
