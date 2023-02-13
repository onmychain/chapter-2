import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
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
        it("Should have 0.1% rewards per second", async function () {
            expect(await staking.rewardsPerSecond()).to.eq(ethers.utils.parseEther("0.0001"))
        })
    })

    describe("Deposit", function () {

        let token: Contract, staking: Contract
        let signer: SignerWithAddress
        let amount = ethers.utils.parseEther("100000")

        beforeEach(async function () {
            [token, staking] = await loadFixture(deployFixture)
            const signers = await ethers.getSigners()
            signer = signers[0]
            await token.approve(staking.address, amount)
        })

        it("Should transfer amount", async function () {
            await expect(staking.deposit(amount)).to.changeTokenBalances(token, 
                [signer, staking],
                [amount.mul(-1), amount]
            )
        })
        it("Should have a balanceOf(address) equal to amount transfered", async function () {
            await staking.deposit(amount)
            expect(await staking.balanceOf(signer.address)).to.eq(amount)
        })
        it("Should have a lastUpdated(address) equal to the latest block timestamp", async function () {
            await staking.deposit(amount)
            const latest = await time.latest()
            expect(await staking.lastUpdated(signer.address)).to.eq(latest)
        })
        it("Should have 0 claimed rewards", async function () {
            await staking.deposit(amount)
            expect(await staking.claimed(signer.address)).to.eq(0)
        })
        it("Should increase the stake balance by amount", async function () {
            await staking.deposit(amount)
            expect(await staking.stakeBalance()).to.eq(amount)
        })
        it("Should not change the reward balance", async function () {
            await staking.deposit(amount)
            expect(await staking.rewardBalance()).to.eq(initialRewards)
        })

        describe("Validations", function () {
            it("Should revert if staking address not approved", async function () {
                amount = ethers.utils.parseEther("1000000")
                await expect(staking.deposit(amount)).to.be.reverted
            })
            it("Should revert if address has insufficient balance", async function () {
                await token.approve(staking.address, totalSupply)
                await expect(staking.deposit(totalSupply)).to.be.reverted
            })
        })

        describe("Events", function () {
            it("Should emit Deposit event", async function () {
                await expect(staking.deposit(amount)).to.emit(staking, "Deposit").withArgs(
                    signer.address, amount
                )
            })
        })

    })

})