// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint public immutable rewardsPerHour = 1000; // 0.01%

    uint public stakeBalance = 0;

    event Deposit(address sender, uint amount);

    mapping(address => uint) public balanceOf;
    mapping(address => uint) public lastUpdated;
    mapping(address => uint) public claimed;

    constructor(IERC20 token_) {
        token = token_;
    }

    function rewardBalance() external view returns (uint) {
        return _rewardBalance();
    }

    function _rewardBalance() internal view returns (uint) {
        return token.balanceOf(address(this)) - stakeBalance;
    }

    function deposit(uint amount_) external {
        _deposit(amount_);
    }

    function _deposit(uint amount_) internal {
        token.safeTransferFrom(msg.sender, address(this), amount_);
        balanceOf[msg.sender] += amount_;
        lastUpdated[msg.sender] = block.timestamp;
        stakeBalance += amount_;
        emit Deposit(msg.sender, amount_);
    }

    function rewards(address address_) external view returns (uint) {
        return _rewards(address_);
    }

    function _rewards(address address_) internal view returns (uint) {
        return (block.timestamp - lastUpdated[address_]) * balanceOf[address_] / (rewardsPerHour * 1 hours);
    }

    function claim() external {
        uint amount = _rewards(msg.sender);
        token.safeTransfer(msg.sender, amount);
        _update(amount);
    }

    function _update(uint amount_) internal {
        claimed[msg.sender] += amount_;
        lastUpdated[msg.sender] = block.timestamp;
    }

    function compound() external {
        _compound();
    }

    function _compound() internal {
        uint amount = _rewards(msg.sender);
        balanceOf[msg.sender] += amount;
        stakeBalance += amount;
        _update(amount);
    }

}
