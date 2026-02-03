import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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

    {selectedFile && (
      <p className="file-info">Selected: <strong>{selectedFile.name}</strong></p>
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
