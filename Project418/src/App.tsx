import { useState, useEffect } from 'react'
import { Login } from './Login'
import { SubmissionPage } from './SubmissionPage'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setErrorMessage(null)
      console.log('File selected:', file.name)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
      setIsLoggedIn(true)
    }
  }, [])

  const handleConfirmSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage("No file selected")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:5000/api/papers', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const data = await response.json()
      console.log('File uploaded successfully:', data)
      setIsSubmitted(true)
      setSelectedFile(null)
      setIsVerifying(false)
      setTimeout(() => setIsSubmitted(false), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred while uploading the file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsVerifying(false)
    setErrorMessage(null)
  }
  
  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(2) + 'KB'
  }

  return (
    <div className="container">
      <h1>Paper Submission Portal</h1>
      <button className="submit-btn" onClick={handleTurnInClick}>
        Turn paper in here
      </button>
      
      <input
      id="fileInput"
      type="file"
      onChange={handleFileChange}
      style={{ display: 'none'}}
      accept = ".pdf, .doc, .docx, .txt"
    />

    {selectedFile && !isVerifying && (
      <div className = "file-info-container">
        <p className = "file-info"> Selected: <strong>{selectedFile.name}</strong></p>
        <button className = "submit-btn" onClick={handleSubmit}>
          submit
        </button>
      </div>
    )}
    
    {isVerifying && selectedFile && (
      <div className="verification-screen">
        <h2>Verify Your Submission</h2>
        <div className="verification-details">
          <p><strong>File Name:</strong> {selectedFile.name}</p>
          <p><strong>File Size:</strong> {formatFileSize(selectedFile.size)}</p>
          <p><strong>File Type:</strong> {selectedFile.type || 'Unknown'}</p>
        </div>
        <p className="verification-message">Please confirm that this is the correct file before submitting.</p>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        <div className="verification-button">
          <button className="confirm-btn" onClick={handleConfirmSubmit} disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Confirm & Submit'}
          </button>
          <button className="cancel-btn" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </button>
        </div>
      </div>
    )}

    {isSubmitted && (
      <div className="success-message">
        File Submitted Successfully
      </div>
    )}

    </div>

  const handleLogin = (user: string) => {
    setUsername(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername('')
    localStorage.clear()
  }

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <SubmissionPage username={username} onLogout={handleLogout} />
      )}
    </>
  )
}

export default App


  /*
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}
*/
