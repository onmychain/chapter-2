import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { Contract } from "ethers"
import { ethers } from "hardhat"

describe("Staking", function () {

    const totalSupply = ethers.utils.parseEther("100000000")
    const initialRewards = totalSupply.mul(8).div(10)

    async function deployFixture() {
        const Token = await ethers.getContractFactory("Token")
        const token = await Token.deploy("Token", "TKN", totalSupply)
        await token.deployed()

        const Staking = await ethers.getContractFactory("Staking")
        const staking = await Staking.deploy(token.address)
        await staking.deployed()

        await token.transfer(staking.address, initialRewards)

        return [token, staking]
    }

    describe("Deployment", function () {

        let token: Contract, staking: Contract

        beforeEach(async function () {
            [token, staking] = await loadFixture(deployFixture)
        })

        it("Should have a token", async function () {
            expect(await staking.token()).to.eq(token.address)
        })
        it("Should have 80,000,000 reward balance", async function () {
            expect(await staking.rewardBalance()).to.eq(initialRewards)
        })
        it("Should have 0 stake balance", async function () {
            expect(await staking.stakeBalance()).to.eq(0)
        })
    })
})