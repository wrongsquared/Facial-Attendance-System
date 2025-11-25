import React, { useState } from 'react';
import './Login.css';

function LogoutDialog({ isOpen, onClose, onConfirm }) {
  const [selectedOption, setSelectedOption] = useState('cancel');

  const handleConfirm = () => {
    if (selectedOption === 'logout') {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  if (!isOpen) return null;

  return (
    <div className="logout-dialog-overlay">
      <div className="logout-dialog">
        <h3>Log out</h3>
        <p>Are you sure?</p>
        
        <div className="logout-options">
          <div 
            className={`logout-option ${selectedOption === 'logout' ? 'selected' : ''}`}
            onClick={() => handleOptionChange('logout')}
          >
            <input
              type="radio"
              className="option-radio"
              checked={selectedOption === 'logout'}
              onChange={() => handleOptionChange('logout')}
            />
            <span className="option-label">Log out</span>
          </div>
          
          <div 
            className={`logout-option ${selectedOption === 'cancel' ? 'selected' : ''}`}
            onClick={() => handleOptionChange('cancel')}
          >
            <input
              type="radio"
              className="option-radio"
              checked={selectedOption === 'cancel'}
              onChange={() => handleOptionChange('cancel')}
            />
            <span className="option-label">Cancel</span>
          </div>
        </div>
        
        <div className="dialog-actions">
          <button 
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedOption}
          >
            Confirm
          </button>
          <button 
            className="cancel-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutDialog;