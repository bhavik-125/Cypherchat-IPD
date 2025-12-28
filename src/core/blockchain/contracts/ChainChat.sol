// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ChainChat {
    struct Message {
        address sender;
        address receiver;
        string content; // Encrypted text
        uint256 timestamp;
        bool isRead;
    }

    struct User {
        string name;
        bool exists;
    }

    mapping(address => User) public users;
    mapping(bytes32 => Message[]) private conversations;
    
    event UserRegistered(address indexed userAddress, string name);
    event MessageSent(address indexed from, address indexed to, uint256 timestamp);

    // 1. Register User
    function register(string memory _name) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        users[msg.sender] = User(_name, true);
        emit UserRegistered(msg.sender, _name);
    }

    // 2. Send Message
    function sendMessage(address _to, string memory _content) public {
        require(users[msg.sender].exists, "You must register first");
        require(users[_to].exists, "Recipient is not registered");
        
        bytes32 chatCode = _getChatCode(msg.sender, _to);
        conversations[chatCode].push(Message(msg.sender, _to, _content, block.timestamp, false));
        
        emit MessageSent(msg.sender, _to, block.timestamp);
    }

    // 3. Get Messages
    function getMessages(address _user1, address _user2) public view returns (Message[] memory) {
        bytes32 chatCode = _getChatCode(_user1, _user2);
        return conversations[chatCode];
    }

    // Helper: Generate unique chat ID for two users
    function _getChatCode(address _user1, address _user2) private pure returns (bytes32) {
        if (_user1 < _user2) {
            return keccak256(abi.encodePacked(_user1, _user2));
        } else {
            return keccak256(abi.encodePacked(_user2, _user1));
        }
    }
}