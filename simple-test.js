const hre = require("hardhat");

async function main() {
  console.log("🔍 Simple contract connectivity test...");
  
  const contractAddress = "0x8836edF198081396BD8209c8320eD7d942441c33";
  
  try {
    // Test 1: Check if we can connect to the network
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("✅ Network connected. Current block:", blockNumber);
    
    // Test 2: Check if contract exists
    const code = await hre.ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ No contract deployed at address:", contractAddress);
      return;
    }
    console.log("✅ Contract exists at address:", contractAddress);
    
    // Test 3: Try to call a simple view function
    const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
    const contract = InvoiceManager.attach(contractAddress);
    
    const nextId = await contract.nextInvoiceId();
    console.log("✅ Contract call successful. Next Invoice ID:", nextId.toString());
    
    // Test 4: Check deployer balance
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH");
    
    if (balance < hre.ethers.parseEther("0.001")) {
      console.log("⚠️ Low balance - might not be enough for transactions");
    }
    
    console.log("🎉 All basic tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main().catch(console.error);
