import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber, Contract } from "ethers"
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
        it("Should have 0.01% rewards per hour", async function () {
            expect(await staking.rewardsPerHour()).to.eq(
                1000
            )
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

    describe("Rewards", function () {

        let token: Contract, staking: Contract
        let signer: SignerWithAddress
        let amount = ethers.utils.parseEther("100000")

        beforeEach(async function () {
            [token, staking] = await loadFixture(deployFixture)
            const signers = await ethers.getSigners()
            signer = signers[0]
            await token.approve(staking.address, amount)
            await staking.deposit(amount)
        })

        it("Should have 100 rewards after one hour", async function () {
            await time.increase(60*60)
            expect(await staking.rewards(signer.address)).to.eq(ethers.utils.parseEther("100"))
        })
        it("Should have 1/36 rewards after one second", async function () {
            await time.increase(1)
            expect(await staking.rewards(signer.address)).to.eq(amount.div(1000).div(3600))
        })
        it("Should have 1 reward after 36 seconds", async function () {
            await time.increase(36)
            expect(await staking.rewards(signer.address)).to.eq(ethers.utils.parseEther("1"))
        })

    })

    describe("Claim", function () {
        let token: Contract, staking: Contract
        let signer: SignerWithAddress
        let amount = ethers.utils.parseEther("100000")
        let reward = ethers.utils.parseEther("100")

        beforeEach(async function () {
            [token, staking] = await loadFixture(deployFixture)
            const signers = await ethers.getSigners()
            signer = signers[0]
            await token.approve(staking.address, amount)
            await staking.deposit(amount)
            await time.increase(60*60-1)
        })

        it("should change token balances", async function () {
            await expect(staking.claim()).to.changeTokenBalances(token,
                [signer, staking],
                [reward, reward.mul(-1)]
            )
        })

        it("Should increment claimed", async function () {
            await staking.claim()
            expect(await staking.claimed(signer.address)).to.eq(reward)
        })

        it("Should update lastUpdated claimed", async function () {
            await staking.claim()
            const timestamp = await time.latest()
            expect(await staking.lastUpdated(signer.address)).to.eq(timestamp)
        })

        it("Should not change the balanceOf(address)", async function () {
            const balanceOf = await staking.balanceOf(signer.address)
            await staking.claim()
            expect(await staking.balanceOf(signer.address)).to.eq(balanceOf)
        })

        it("Should not change the stake balance", async function () {
            const balance = await staking.stakeBalance()
            await staking.claim()
            expect(await staking.stakeBalance()).to.eq(balance)
        })
        it("Should decrement the reward balance", async function () {
            const balance = await staking.rewardBalance()
            await staking.claim()
            expect(await staking.rewardBalance()).to.eq(balance.sub(reward))
        })

        describe("Events", function () {
            it("Should emit Claim event", async function () {
                await expect(staking.claim()).to.emit(staking, "Claim").withArgs(
                    signer.address, reward
                )
            })
        })
    })

    describe("Compound", function () {

        let token: Contract, staking: Contract
        let signer: SignerWithAddress
        let amount = ethers.utils.parseEther("100000")
        let reward = ethers.utils.parseEther("100")

        beforeEach(async function () {
            [token, staking] = await loadFixture(deployFixture)
            const signers = await ethers.getSigners()
            signer = signers[0]
            await token.approve(staking.address, amount)
            await staking.deposit(amount)
            await time.increase(60*60-1)
        })

        it("Should not change token balances", async function () {
            await expect(staking.compound()).to.changeTokenBalances(token,
                [signer, staking],
                [0, 0]
            )
        })
        it("Should increment claimed", async function () {
            const claimed = await staking.claimed(signer.address)
            await staking.compound()
            expect(await staking.claimed(signer.address)).to.eq(claimed.add(reward))
        })
        it("Should increment balanceOf(address)", async function () {
            const balanceOf = await staking.balanceOf(signer.address)
            await staking.compound()
            expect(await staking.balanceOf(signer.address)).to.eq(balanceOf.add(reward))
        })
        it("Should increment staking balance", async function () {
            const balance = await staking.stakeBalance()
            await staking.compound()
            expect(await staking.stakeBalance()).to.eq(balance.add(reward))
        })
        it("Should decrement the rewards balance", async function () {
            const balance = await staking.rewardBalance()
            await staking.compound()
            expect(await staking.rewardBalance()).to.eq(balance.sub(reward))
        })
        it("Should update lastUpdated", async function () {
            await staking.compound()
            const timestamp = await time.latest()
            expect(await staking.lastUpdated(signer.address)).to.eq(timestamp)
        })

        describe("Events", function () {
            it("Should emit Compound event", async function () {
                await expect(staking.compound()).to.emit(staking, "Compound").withArgs(
                    signer.address, reward
                )
            })
        })
    })

    describe("Withdraw", async function () {

        let token: Contract, staking: Contract
        let signer: SignerWithAddress
        let amount: BigNumber
        let reward = ethers.utils.parseEther("100")

        beforeEach(async function () {
            [token, staking] = await loadFixture(deployFixture)
            const signers = await ethers.getSigners()
            signer = signers[0]
            amount = ethers.utils.parseEther("100000")
            await token.approve(staking.address, amount)
            await staking.deposit(amount)
            await time.increase(60*60-1)
        })

        it("Should change token balances", async function () {
            amount = amount.div(2)
            await expect(staking.withdraw(amount)).to.changeTokenBalances(token,
                [signer, staking],
                [amount, amount.mul(-1)]
            )
        })
        it("Should decrement balanceOf(address)", async function () {
            const balanceOf = await staking.balanceOf(signer.address)
            await staking.withdraw(amount)
            expect(await staking.balanceOf(signer.address)).to.eq(balanceOf.sub(amount).add(reward))
        })
        it("Should compound rewards", async function () {
            await staking.withdraw(amount)
            const timestamp = await time.latest()
            expect(await staking.balanceOf(signer.address)).to.eq(reward)
            expect(await staking.claimed(signer.address)).to.eq(reward)
            expect(await staking.lastUpdated(signer.address)).to.eq(timestamp)
        })
        it("Should decrement staking balance", async function () {
            const balance = await staking.stakeBalance()
            await staking.withdraw(amount)
            expect(await staking.stakeBalance()).to.eq(balance.sub(amount).add(reward))
        })

        describe("Validations", function () {
            it("Should revert if amount gt balanceOf(address)", async function () {
                await expect(staking.withdraw(amount.add(1))).to.be.revertedWith("Insufficient funds")
            })
        })

        describe("Events", function () {
            it("Should emit Withdraw event", async function () {
                await expect(staking.withdraw(amount)).to.emit(staking, "Withdraw").withArgs(
                    signer.address, amount
                )
            })
        })

    })

})