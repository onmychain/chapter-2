import { ethers } from "hardhat";

async function main() {
    const name = "Token"
    const symbol = "TKN"
    const totalSupply = ethers.utils.parseEther("100000000")

    const Token = await ethers.getContractFactory("Token")
    const token = await Token.deploy(name, symbol, totalSupply)
    await token.deployed()
    console.log(`Deployed the token to ${token.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
