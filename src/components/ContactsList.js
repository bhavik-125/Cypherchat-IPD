import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';

const ContactsList = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    // Load contacts from localStorage or contract
    const savedContacts = JSON.parse(localStorage.getItem('cypherchat-contacts') || '[]');
    setContacts(savedContacts);
    setLoading(false);
  };

  const addContact = async (address) => {
    const user = await contractService.getUser(address);
    if (user) {
      const newContacts = [...contacts, user];
      setContacts(newContacts);
      localStorage.setItem('cypherchat-contacts', JSON.stringify(newContacts));
    }
  };

  return (
    <div className="contacts-list">
      <h3>Contacts</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {contacts.map((contact, index) => (
            <li key={index}>
              <strong>{contact.name}</strong>
              <small>{contact.address.slice(0, 10)}...</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContactsList;