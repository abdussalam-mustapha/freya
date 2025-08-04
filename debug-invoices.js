const hre = require("hardhat");

async function main() {
  console.log("🔍 Debugging invoice retrieval...");
  
  const contractAddress = "0x8836edF198081396BD8209c8320eD7d942441c33";
  const userAddress = "0xFd151D52238dd8DC27373D6E410086ec0322D124";
  
  try {
    // Get contract instance
    const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
    const contract = InvoiceManager.attach(contractAddress);
    
    // Test 1: Check nextInvoiceId (total count)
    console.log("\n📊 Test 1: Checking total invoice count...");
    const nextId = await contract.nextInvoiceId();
    console.log("Next Invoice ID (total created + 1):", nextId.toString());
    console.log("Total invoices created:", (nextId - 1).toString());
    
    // Test 2: Get user invoices
    console.log("\n👤 Test 2: Getting user invoices...");
    const userInvoices = await contract.getUserInvoices(userAddress);
    console.log("User invoice IDs:", userInvoices.map(id => id.toString()));
    console.log("User has", userInvoices.length, "invoices");
    
    // Test 3: Get details for each invoice
    if (userInvoices.length > 0) {
      console.log("\n📋 Test 3: Getting invoice details...");
      for (let i = 0; i < userInvoices.length; i++) {
        const invoiceId = userInvoices[i];
        console.log(`\n--- Invoice ${invoiceId.toString()} ---`);
        
        try {
          const invoice = await contract.getInvoice(invoiceId);
          console.log("Invoice details:", {
            id: invoice.id.toString(),
            issuer: invoice.issuer,
            client: invoice.client,
            amount: hre.ethers.formatEther(invoice.amount),
            description: invoice.description,
            status: invoice.status.toString(),
            dueDate: new Date(invoice.dueDate.toNumber() * 1000).toISOString(),
            createdAt: new Date(invoice.createdAt.toNumber() * 1000).toISOString()
          });
        } catch (error) {
          console.error(`Error getting invoice ${invoiceId}:`, error.message);
        }
      }
    } else {
      console.log("❌ No invoices found for user");
    }
    
    // Test 4: Check if invoices exist by ID (iterate through possible IDs)
    console.log("\n🔍 Test 4: Checking invoices by ID...");
    const totalCreated = nextId - 1;
    for (let i = 1; i <= totalCreated; i++) {
      try {
        const invoice = await contract.getInvoice(i);
        console.log(`Invoice ${i} exists - Issuer: ${invoice.issuer}, Client: ${invoice.client}`);
      } catch (error) {
        console.log(`Invoice ${i} does not exist or error:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

main().catch(console.error);
