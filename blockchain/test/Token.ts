import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"

describe("Token", function () {
    
    const name = "Token"
    const symbol = "TKN"
    const totalSupply = ethers.utils.parseEther("100000000")

    async function deployFixture() {
        const Token = await ethers.getContractFactory("Token")
        const token = await Token.deploy(name, symbol, totalSupply)
        await token.deployed()
        return token
    }

    describe("Deployment", function () {
        it("Should have a name", async function () {
            const token = await loadFixture(deployFixture)
            expect(await token.name()).to.eq(name)
        })
        it("Should have a symbol", async function () {
            const token = await loadFixture(deployFixture)
            expect(await token.symbol()).to.eq(symbol)
        })
        it("Should have a totalSupply", async function () {
            const token = await loadFixture(deployFixture)
            expect(await token.totalSupply()).to.eq(totalSupply)
        })
    })
})