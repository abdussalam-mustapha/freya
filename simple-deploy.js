const hre = require("hardhat");

async function main() {
  const InvoiceManager = await hre.ethers.getContractFactory("InvoiceManager");
  const invoiceManager = await InvoiceManager.deploy();
  await invoiceManager.waitForDeployment();
  
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  
  console.log(await invoiceManager.getAddress());
  console.log(await escrow.getAddress());
}

main().catch(console.error);
