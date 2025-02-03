import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const [message, setMessage] = useState('init');

  // useEffect(() => {
  //   fetch('/api')
  //     .then((res) => res.json())
  //     .then((data) => setMessage(data.message))
  //     .catch((err) => setMessage(err))
  // })

  const handleUpload = () => {
    const file = document.getElementById('fileInput').files[0];
    const formData = new FormData();

    formData.append('file', file);
    
    fetch('/upload', {
      method: 'POST',
      body: formData
    })
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage(err))
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h3>{message}</h3>
        {/* upload file directly */}
        <input type="file" id="fileInput" />
        <button onClick={handleUpload}>Upload</button>
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
