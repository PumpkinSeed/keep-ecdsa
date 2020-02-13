import { createSnapshot, restoreSnapshot } from "./helpers/snapshot";

const { expectRevert } = require('openzeppelin-test-helpers');

const ECDSAKeepFactoryStub = artifacts.require('ECDSAKeepFactoryStub');
const KeepBonding = artifacts.require('KeepBonding');
const TokenStakingStub = artifacts.require("TokenStakingStub")
const BondedSortitionPool = artifacts.require('BondedSortitionPool');
const BondedSortitionPoolFactory = artifacts.require('BondedSortitionPoolFactory');
const RandomBeaconStub = artifacts.require('RandomBeaconStub')

const BN = web3.utils.BN

const chai = require('chai')
chai.use(require('bn-chai')(BN))
const expect = chai.expect

contract("ECDSAKeepFactory", async accounts => {
    let keepFactory
    let bondedSortitionPoolFactory
    let tokenStaking
    let keepBonding
    let randomBeacon

    const application = accounts[1]
    const member1 = accounts[2]
    const member2 = accounts[3]
    const member3 = accounts[4]

    describe("registerMemberCandidate", async () => {
        before(async () => {
            bondedSortitionPoolFactory = await BondedSortitionPoolFactory.new()
            tokenStaking = await TokenStakingStub.new()
            keepBonding = await KeepBonding.new()
            randomBeacon = await RandomBeaconStub.new()
            keepFactory = await ECDSAKeepFactoryStub.new(
                bondedSortitionPoolFactory.address,
                tokenStaking.address,
                keepBonding.address,
                randomBeacon.address
            )

            const stakeBalance = await keepFactory.minimumStake.call()
            await tokenStaking.setBalance(stakeBalance);

            const bondingValue = new BN(100)
            await keepBonding.deposit(member1, { value: bondingValue })
            await keepBonding.deposit(member2, { value: bondingValue })
            await keepBonding.deposit(member3, { value: bondingValue })
        })

        beforeEach(async () => {
            await createSnapshot()
        })

        afterEach(async () => {
            await restoreSnapshot()
        })

        it("creates a signer pool", async () => {
            await keepFactory.registerMemberCandidate(application, { from: member1 })

            const signerPoolAddress = await keepFactory.getSignerPool(application)

            assert.notEqual(
                signerPoolAddress,
                "0x0000000000000000000000000000000000000000",
                "incorrect registered signer pool",
            )
        })

        it("inserts operator with the correct staking weight in the pool", async () => {
            const minimumStake = await keepFactory.minimumStake.call()
            const minimumStakeMultiplier = new BN("10")
            await tokenStaking.setBalance(minimumStake.mul(minimumStakeMultiplier))

            await keepFactory.registerMemberCandidate(application, { from: member1 })

            const signerPoolAddress = await keepFactory.getSignerPool(application)
            const signerPool = await BondedSortitionPool.at(signerPoolAddress)

            const actualWeight = await signerPool.getPoolWeight.call(member1)
            const expectedWeight = minimumStakeMultiplier

            expect(actualWeight).to.eq.BN(expectedWeight, 'invalid staking weight')
        })

        it("inserts operators to the same pool", async () => {
            await keepFactory.registerMemberCandidate(application, { from: member1 })
            await keepFactory.registerMemberCandidate(application, { from: member2 })

            const signerPoolAddress = await keepFactory.getSignerPool(application)

            const signerPool = await BondedSortitionPool.at(signerPoolAddress)

            assert.isTrue(await signerPool.isOperatorInPool(member1), "operator 1 is not in the pool")
            assert.isTrue(await signerPool.isOperatorInPool(member2), "operator 2 is not in the pool")
        })

        it("does not add an operator to the pool if it is already there", async () => {
            await keepFactory.registerMemberCandidate(application, { from: member1 })
            const signerPoolAddress = await keepFactory.getSignerPool(application)

            const signerPool = await BondedSortitionPool.at(signerPoolAddress)

            assert.isTrue(await signerPool.isOperatorInPool(member1), "operator is not in the pool")

            await keepFactory.registerMemberCandidate(application, { from: member1 })

            assert.isTrue(await signerPool.isOperatorInPool(member1), "operator is not in the pool")
        })

        it("does not add an operator to the pool if it does not have a minimum stake", async() => {
            await tokenStaking.setBalance(new BN("1"))

            await expectRevert(
                keepFactory.registerMemberCandidate(application, { from: member1 }),
                "Operator not eligible"
            )
        })

        it("inserts operators to different pools", async () => {
            const application1 = '0x0000000000000000000000000000000000000001'
            const application2 = '0x0000000000000000000000000000000000000002'

            await keepFactory.registerMemberCandidate(application1, { from: member1 })
            await keepFactory.registerMemberCandidate(application2, { from: member2 })

            const signerPool1Address = await keepFactory.getSignerPool(application1)
            const signerPool1 = await BondedSortitionPool.at(signerPool1Address)

            assert.isTrue(await signerPool1.isOperatorInPool(member1), "operator 1 is not in the pool")
            assert.isFalse(await signerPool1.isOperatorInPool(member2), "operator 2 is in the pool")

            const signerPool2Address = await keepFactory.getSignerPool(application2)
            const signerPool2 = await BondedSortitionPool.at(signerPool2Address)

            assert.isFalse(await signerPool2.isOperatorInPool(member1), "operator 1 is in the pool")
            assert.isTrue(await signerPool2.isOperatorInPool(member2), "operator 2 is not in the pool")
        })
    })

    describe("registerMemberCandidate", async () => {
        before(async () => {
            bondedSortitionPoolFactory = await BondedSortitionPoolFactory.new()
            tokenStaking = await TokenStakingStub.new()
            keepBonding = await KeepBonding.new()
            randomBeacon = await RandomBeaconStub.new()
            keepFactory = await ECDSAKeepFactoryStub.new(
                bondedSortitionPoolFactory.address,
                tokenStaking.address,
                keepBonding.address,
                randomBeacon.address
            )

            const stakeBalance = await keepFactory.minimumStake.call()
            await tokenStaking.setBalance(stakeBalance);

            const bondingValue = new BN(100)
            await keepBonding.deposit(member1, { value: bondingValue })
            await keepBonding.deposit(member2, { value: bondingValue })
        })

        beforeEach(async () => {
            await createSnapshot()
        })

        afterEach(async () => {
            await restoreSnapshot()
        })

        it("inserts operators to different pools", async () => {
            const application1 = '0x0000000000000000000000000000000000000001'
            const application2 = '0x0000000000000000000000000000000000000002'

            await keepFactory.registerMemberCandidate(application1, { from: member1 })
            await keepFactory.registerMemberCandidate(application2, { from: member2 })

            const signerPool1Address = await keepFactory.getSignerPool(application1)
            const signerPool1 = await BondedSortitionPool.at(signerPool1Address)

            assert.isTrue(await signerPool1.isOperatorInPool(member1), "operator 1 is not in the pool")
            assert.isFalse(await signerPool1.isOperatorInPool(member2), "operator 2 is in the pool")

            const signerPool2Address = await keepFactory.getSignerPool(application2)
            const signerPool2 = await BondedSortitionPool.at(signerPool2Address)

            assert.isFalse(await signerPool2.isOperatorInPool(member1), "operator 1 is in the pool")
            assert.isTrue(await signerPool2.isOperatorInPool(member2), "operator 2 is not in the pool")
        })
    })

    describe("openKeep", async () => {
        const keepOwner = "0xbc4862697a1099074168d54A555c4A60169c18BD"
        const groupSize = new BN(3)
        const threshold = new BN(3)

        const singleBond = new BN(1)
        const bond = singleBond.mul(groupSize)

        let feeEstimate

        async function initializeNewFactory() {
            // Tests are executed with real implementation of sortition pools.
            // We don't use stub to ensure that keep members selection works correctly.
            bondedSortitionPoolFactory = await BondedSortitionPoolFactory.new()
            tokenStaking = await TokenStakingStub.new()
            keepBonding = await KeepBonding.new()
            randomBeacon = await RandomBeaconStub.new()
            keepFactory = await ECDSAKeepFactoryStub.new(
                bondedSortitionPoolFactory.address,
                tokenStaking.address,
                keepBonding.address,
                randomBeacon.address
            )

            feeEstimate = await keepFactory.openKeepFeeEstimate()
        }

        beforeEach(async () => {
            await initializeNewFactory()

            const stakeBalance = await keepFactory.minimumStake.call()
            await tokenStaking.setBalance(stakeBalance)

            await keepBonding.deposit(member1, { value: singleBond })
            await keepBonding.deposit(member2, { value: singleBond })
            await keepBonding.deposit(member3, { value: singleBond })

            await keepFactory.registerMemberCandidate(application, { from: member1 })
            await keepFactory.registerMemberCandidate(application, { from: member2 })
            await keepFactory.registerMemberCandidate(application, { from: member3 })
        })


        it("reverts if no member candidates are registered", async () => {
            await expectRevert(
                keepFactory.openKeep(
                    groupSize,
                    threshold,
                    keepOwner,
                    bond,
                    { value: feeEstimate }
                ),
                "No signer pool for this application"
            )
        })

        it("reverts if bond equals zero", async () => {
            let bond = 0

            await expectRevert(
                keepFactory.openKeep(
                    groupSize,
                    threshold,
                    keepOwner,
                    bond,
                    { from: application, value: feeEstimate },
                ),
                "Bond per member must be greater than zero"
            )
        })

        it("reverts if value is less than the required fee estimate", async () => {
            const insufficientFee = feeEstimate.sub(new BN(1))

            await expectRevert(
                keepFactory.openKeep(
                    groupSize,
                    threshold,
                    keepOwner,
                    bond,
                    { from: application, fee: insufficientFee },
                ),
                "Insufficient payment for opening a new keep"
            )
        })

        it("opens keep with multiple members", async () => {
            let blockNumber = await web3.eth.getBlockNumber()

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate },
            )

            let eventList = await keepFactory.getPastEvents('ECDSAKeepCreated', {
                fromBlock: blockNumber,
                toBlock: 'latest'
            })

            assert.equal(eventList.length, 1, "incorrect number of emitted events")

            assert.sameMembers(
                eventList[0].returnValues.members,
                [member1, member2, member3],
                "incorrect keep member in emitted event",
            )
        })

        it("opens bonds for keep", async () => {
            let blockNumber = await web3.eth.getBlockNumber()

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate },
            )

            let eventList = await keepFactory.getPastEvents('ECDSAKeepCreated', {
                fromBlock: blockNumber,
                toBlock: 'latest'
            })

            const keepAddress = eventList[0].returnValues.keepAddress

            expect(
                await keepBonding.bondAmount(member1, keepAddress, keepAddress)
            ).to.eq.BN(singleBond, 'invalid bond value for member1')

            expect(
                await keepBonding.bondAmount(member2, keepAddress, keepAddress)
            ).to.eq.BN(singleBond, 'invalid bond value for member2')

            expect(
                await keepBonding.bondAmount(member3, keepAddress, keepAddress)
            ).to.eq.BN(singleBond, 'invalid bond value for member3')
        })

        // This tests cases are to check roundings for member bonds.
        // Ex. requested bond = 11 & group size = 3 => bond per member ≈ 3,66 but 
        // `11.div(3) = 3` so in the current implementation we round the bond up to 4
        describe("member bonds rounding", async () => {
            let blockNumber

            beforeEach(async () => {
                await initializeNewFactory()
                const stakeBalance = await keepFactory.minimumStake.call()
                await tokenStaking.setBalance(stakeBalance)
                blockNumber = await web3.eth.getBlockNumber()
            })

            it("rounds up a member bond with smaller values", async () => {
                const bond = new BN(16)
                const unbondedAmount = new BN(40)
                // without rounding, bond.div(groupSize): 16/3=5.3333
                // expected member bond with rounding up is 6 
                const expectedMemberBond = new BN(6)
    
                await depositAndRegisterMembers(unbondedAmount)
    
                await keepFactory.openKeep(
                    groupSize,
                    threshold,
                    keepOwner,
                    bond,
                    { from: application, value: feeEstimate },
                )
    
                let eventList = await keepFactory.getPastEvents('ECDSAKeepCreated', {
                    fromBlock: blockNumber,
                    toBlock: 'latest'
                })
    
                const keepAddress = eventList[0].returnValues.keepAddress
    
                expect(
                    await keepBonding.bondAmount(member1, keepAddress, keepAddress)
                ).to.eq.BN(expectedMemberBond, 'invalid bond value for member1')
    
                expect(
                    await keepBonding.bondAmount(member2, keepAddress, keepAddress)
                ).to.eq.BN(expectedMemberBond, 'invalid bond value for member2')
    
                expect(
                    await keepBonding.bondAmount(member3, keepAddress, keepAddress)
                ).to.eq.BN(expectedMemberBond, 'invalid bond value for member3')
            })

            it("rounds up a member bond with higher values", async () => {
                const bond = new BN(11003431)
                const unbondedAmount = new BN(4200500)
                // without rounding, bond.div(groupSize): 11003431/3=3667810,3333333
                // expected member bond with rounding up is 3667811 
                const expectedMemberBond = new BN(3667811)

                await depositAndRegisterMembers(unbondedAmount)
    
                await keepFactory.openKeep(
                    groupSize,
                    threshold,
                    keepOwner,
                    bond,
                    { from: application, value: feeEstimate },
                )
    
                let eventList = await keepFactory.getPastEvents('ECDSAKeepCreated', {
                    fromBlock: blockNumber,
                    toBlock: 'latest'
                })
    
                const keepAddress = eventList[0].returnValues.keepAddress
    
                expect(
                    await keepBonding.bondAmount(member1, keepAddress, keepAddress)
                ).to.eq.BN(expectedMemberBond, 'invalid bond value for member1')
    
                expect(
                    await keepBonding.bondAmount(member2, keepAddress, keepAddress)
                ).to.eq.BN(expectedMemberBond, 'invalid bond value for member2')
    
                expect(
                    await keepBonding.bondAmount(member3, keepAddress, keepAddress)
                ).to.eq.BN(expectedMemberBond, 'invalid bond value for member3')
            })

            async function depositAndRegisterMembers(unbondedAmount) {
                await keepBonding.deposit(member1, { value: unbondedAmount })
                await keepBonding.deposit(member2, { value: unbondedAmount })
                await keepBonding.deposit(member3, { value: unbondedAmount })
    
                await keepFactory.registerMemberCandidate(application, { from: member1 })
                await keepFactory.registerMemberCandidate(application, { from: member2 })
                await keepFactory.registerMemberCandidate(application, { from: member3 })
            }
        })

        it("reverts if not enough member candidates are registered", async () => {
            await initializeNewFactory()

            let groupSize = 2
            let threshold = 2

            const stakeBalance = await keepFactory.minimumStake.call()
            await tokenStaking.setBalance(stakeBalance)

            await keepBonding.deposit(member1, { value: singleBond })

            await keepFactory.registerMemberCandidate(application, { from: member1 })

            await expectRevert(
                keepFactory.openKeep(
                    groupSize,
                    threshold,
                    keepOwner,
                    bond,
                    { from: application, value: feeEstimate }
                ),
                "Not enough operators in pool"
            )
        })

        // TODO: This is temporary, we don't expect a group to be formed if a member
        // doesn't have sufficient unbonded value.
        it("reverts if one member has insufficient unbonded value", async () => {
            await initializeNewFactory()

            const stakeBalance = await keepFactory.minimumStake.call()
            await tokenStaking.setBalance(stakeBalance)

            await keepBonding.deposit(member1, { value: singleBond })
            await keepBonding.deposit(member2, { value: singleBond })
            await keepBonding.deposit(member3, { value: singleBond.sub(new BN(1)) })

            await keepFactory.registerMemberCandidate(application, { from: member1 })
            await keepFactory.registerMemberCandidate(application, { from: member2 })
            
            await expectRevert(
                keepFactory.registerMemberCandidate(application, { from: member3 }),
                "Operator not eligible."
            )
        })

        it("opens keep with multiple members and emits an event", async () => {
            let blockNumber = await web3.eth.getBlockNumber()

            let keepAddress = await keepFactory.openKeep.call(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate }
            )

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate }
            )

            let eventList = await keepFactory.getPastEvents('ECDSAKeepCreated', {
                fromBlock: blockNumber,
                toBlock: 'latest'
            })

            assert.isTrue(
                web3.utils.isAddress(keepAddress),
                `keep address ${keepAddress} is not a valid address`,
            );

            assert.equal(eventList.length, 1, "incorrect number of emitted events")

            assert.equal(
                eventList[0].returnValues.keepAddress,
                keepAddress,
                "incorrect keep address in emitted event",
            )

            assert.sameMembers(
                eventList[0].returnValues.members,
                [member1, member2, member3],
                "incorrect keep member in emitted event",
            )

            assert.equal(
                eventList[0].returnValues.owner,
                keepOwner,
                "incorrect keep owner in emitted event",
            )
        })

        it("requests new random group selection seed from random beacon", async () => {
            const expectedNewEntry = new BN(789)

            await randomBeacon.setEntry(expectedNewEntry)

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate }
            )

            assert.equal(
                await randomBeacon.requestCount.call(),
                1,
                "incorrect number of beacon calls",
            )

            expect(
                await keepFactory.getGroupSelectionSeed()
            ).to.eq.BN(expectedNewEntry, "incorrect new group selection seed")
        })

        it("calculates new group selection seed", async () => {
            // Set entry to `0` so the beacon stub won't execute the callback.
            await randomBeacon.setEntry(0)

            const groupSelectionSeed = new BN(12)
            await keepFactory.initialGroupSelectionSeed(groupSelectionSeed)

            const expectedNewGroupSelectionSeed = web3.utils.toBN(
                web3.utils.soliditySha3(groupSelectionSeed, keepFactory.address)
            )

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate }
            )

            expect(
                await keepFactory.getGroupSelectionSeed()
            ).to.eq.BN(
                expectedNewGroupSelectionSeed,
                "incorrect new group selection seed"
            )
        })

        it("ignores beacon request relay entry failure", async () => {
            await randomBeacon.setShouldFail(true)

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: feeEstimate }
            )

            // TODO: Add verification of what we will do in case of the failure.
        })

        it("forwards payment to random beacon", async () => {
            const value = new BN(150)

            await keepFactory.openKeep(
                groupSize,
                threshold,
                keepOwner,
                bond,
                { from: application, value: value }
            )

            expect(
                await web3.eth.getBalance(randomBeacon.address)
            ).to.eq.BN(
                value,
                "incorrect random beacon balance"
            )
        })
    })

    describe("setGroupSelectionSeed", async () => {
        const newGroupSelectionSeed = new BN(2345675)

        before(async () => {
            bondedSortitionPoolFactory = await BondedSortitionPoolFactory.new()
            tokenStaking = await TokenStakingStub.new()
            keepBonding = await KeepBonding.new()
            randomBeacon = accounts[1]
            keepFactory = await ECDSAKeepFactoryStub.new(
                bondedSortitionPoolFactory.address,
                tokenStaking.address,
                keepBonding.address,
                randomBeacon
            )
        })

        beforeEach(async () => {
            await createSnapshot()
        })

        afterEach(async () => {
            await restoreSnapshot()
        })

        it("sets group selection seed", async () => {
            await keepFactory.setGroupSelectionSeed(newGroupSelectionSeed, { from: randomBeacon })

            expect(
                await keepFactory.getGroupSelectionSeed()
            ).to.eq.BN(
                newGroupSelectionSeed,
                "incorrect new group selection seed"
            )
        })

        it("reverts if called not by the random beacon", async () => {
            await expectRevert(
                keepFactory.setGroupSelectionSeed(newGroupSelectionSeed, { from: accounts[2] }),
                "Caller is not the random beacon"
            )
        })
    })
})
