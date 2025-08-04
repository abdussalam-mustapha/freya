const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging specific invoice retrieval...\n");

  const INVOICE_MANAGER_ADDRESS = "0xfC91C84f52c33fc4073Dc951d15868a7d650EA6E";

  try {
    const InvoiceManager = await ethers.getContractFactory("InvoiceManager");
    const invoiceManager = InvoiceManager.attach(INVOICE_MANAGER_ADDRESS);

    // Check total invoices
    const nextId = await invoiceManager.nextInvoiceId();
    console.log(`📊 Next Invoice ID: ${nextId.toString()}`);
    console.log(`📊 Total invoices created: ${nextId.toString() - 1}`);

    // Get user invoices for the deployer
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Checking invoices for: ${deployer.address}`);
    
    const userInvoices = await invoiceManager.getUserInvoices(deployer.address);
    console.log(`📋 User invoices: [${userInvoices.map(id => id.toString()).join(', ')}]`);

    // Try to get each invoice individually
    for (let i = 0; i < userInvoices.length; i++) {
      const invoiceId = userInvoices[i];
      console.log(`\n🔍 Attempting to get invoice ${invoiceId.toString()}...`);
      
      try {
        const invoice = await invoiceManager.getInvoice(invoiceId);
        console.log(`✅ Invoice ${invoiceId.toString()} retrieved successfully:`);
        console.log(`   ID: ${invoice[0].toString()}`);
        console.log(`   Issuer: ${invoice[1]}`);
        console.log(`   Client: ${invoice[2]}`);
        console.log(`   Amount: ${ethers.formatEther(invoice[4])} ETH`);
        console.log(`   Description: ${invoice[7]}`);
        console.log(`   Status: ${invoice[8]}`);
      } catch (error) {
        console.log(`❌ Failed to get invoice ${invoiceId.toString()}:`);
        console.log(`   Error: ${error.message}`);
        
        // Try to get more details about the error
        if (error.message.includes("out-of-bounds")) {
          console.log(`   This suggests the invoice data is corrupted or doesn't exist`);
        }
      }
    }

    // Check if we can get invoices that don't exist in getUserInvoices
    console.log(`\n🔍 Testing direct invoice access...`);
    for (let id = 1; id < nextId; id++) {
      try {
        const invoice = await invoiceManager.getInvoice(id);
        console.log(`✅ Direct access to invoice ${id} successful`);
        console.log(`   Description: ${invoice[7]}`);
      } catch (error) {
        console.log(`❌ Direct access to invoice ${id} failed: ${error.message.split('\n')[0]}`);
      }
    }

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
