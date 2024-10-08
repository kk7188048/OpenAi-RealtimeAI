import React, { useState } from 'react';
import axios from 'axios';

const SaveName: React.FC = () => {
    const [name, setName] = useState<string>('');
    const [responseMessage, setResponseMessage] = useState<string>('');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Prevent the default form submission

        try {
            const response = await axios.post('http://localhost:3001/save-name', {
                name: name,
            });
            setResponseMessage('Name saved successfully: ' + response.data);
            setName(''); // Clear the input field after successful submission
        } catch (error) {
            console.error('Error saving name:', error);
            setResponseMessage('Error saving name: ' + (error as Error).message);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
            <h1>Save Your Name</h1>
            <form onSubmit={handleSubmit}>
                <label htmlFor="name">Name:</label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ margin: '10px 0', padding: '8px', width: '100%' }}
                />
                <button type="submit" style={{ padding: '10px', width: '100%' }}>
                    Save Name
                </button>
            </form>
            <div style={{ marginTop: '20px', color: 'green' }}>
                {responseMessage}
            </div>
        </div>
    );
}

export default SaveName;
