import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      console.log('File selected:', file.name)
    }
  }

  const handleTurnInClick = () => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement
    fileInput?.click()
  }

  const handleSubmit = () => {
    setIsVerifying(true)
  }

  const handleConfirmSubmit = () => {
    console.log('File submitted:', selectedFile?.name)
    setIsSubmitted(true)
    setSelectedFile(null)
    setIsVerifying(false)
    setTimeout(() => setIsSubmitted(false), 3000)
  }

  const handleCancel = () => {
    setIsVerifying(false)
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
        <div className="verification-button">
          <button className="confirm-btn" onClick={handleConfirmSubmit}>
            Confirm & Submit
          </button>
          <button className="cancel-btn" onClick={handleCancel}>
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

  )
}


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

export default App
