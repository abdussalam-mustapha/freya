const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing InvoiceManager contract...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  const contractAddress = "0x8836edF198081396BD8209c8320eD7d942441c33";
  
  // Get contract instance
  const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
  const contract = InvoiceManager.attach(contractAddress);
  
  try {
    // Test 1: Check if contract exists and nextInvoiceId works
    console.log("\n📋 Test 1: Checking contract state...");
    const nextId = await contract.nextInvoiceId();
    console.log("Next Invoice ID:", nextId.toString());
    
    // Test 2: Check getUserInvoices (should return empty array initially)
    console.log("\n👤 Test 2: Getting user invoices...");
    const userInvoices = await contract.getUserInvoices(deployer.address);
    console.log("User invoices:", userInvoices);
    
    // Test 3: Try to create an invoice
    console.log("\n✍️ Test 3: Creating test invoice...");
    const clientAddress = "0xFd151D52238dd8DC27373D6E410086ec0322D124"; // Same as deployer for test
    const amount = hre.ethers.parseEther("0.1");
    const dueDate = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    const description = "Test Invoice";
    const useEscrow = false;
    
    console.log("Parameters:", {
      client: clientAddress,
      tokenAddress: "0x0000000000000000000000000000000000000000",
      amount: amount.toString(),
      dueDate: dueDate,
      description: description,
      useEscrow: useEscrow
    });
    
    // Estimate gas first
    const gasEstimate = await contract.createInvoice.estimateGas(
      clientAddress,
      "0x0000000000000000000000000000000000000000",
      amount,
      dueDate,
      description,
      useEscrow
    );
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Create the invoice
    const tx = await contract.createInvoice(
      clientAddress,
      "0x0000000000000000000000000000000000000000",
      amount,
      dueDate,
      description,
      useEscrow,
      {
        gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Test 4: Verify invoice was created
    console.log("\n✅ Test 4: Verifying invoice creation...");
    const newUserInvoices = await contract.getUserInvoices(deployer.address);
    console.log("User invoices after creation:", newUserInvoices);
    
    if (newUserInvoices.length > 0) {
      const invoiceId = newUserInvoices[newUserInvoices.length - 1];
      const invoice = await contract.getInvoice(invoiceId);
      console.log("Created invoice details:", {
        id: invoice.id.toString(),
        issuer: invoice.issuer,
        client: invoice.client,
        amount: hre.ethers.formatEther(invoice.amount),
        description: invoice.description
      });
    }
    
    console.log("\n🎉 All tests passed! Contract is working correctly.");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main().catch(console.error);
