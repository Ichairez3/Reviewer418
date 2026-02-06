import { useState } from 'react'
import './SubmissionPage.css'

interface SubmissionPageprops {
    username: string
    onLogout: () => void
}

export function SubmissionPage({ username, onLogout }: SubmissionPageProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [submissionHistory, setSubmissionHistory] = useState<Array<{
        id: String
        filename: String
        size: String
        timestamp: String
    }>>([])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            console.log('File selected:', file.name)
        }
    }

    const handleSubmit = () => {
        setIsVerifying(true)
    }

    const handleConfirmSubmit = async () => {
        if (!selectedFile) return

        try {
            const formData = new FormData()
            formData.append('file', selectedfile)
            formData.append('username', username)
            formData.append('timestamp', new Date().toISOString())

            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                console.log('File Submitted:', data)
            }
        } catch (err) {
            console.log('No server available, using local storage.')
        }

        const newSubmission = {
            id: Data.now().toString(),
            filename: selectedFile.name,
            size: formatFileSize(selectedFile.size),
            timestamp: new Date().toLocaleString(),
        }

        setSubmissionHistory([newSubmission, ...submissionHistory])
        console.log('File Submitted:', selectedFile?.name, 'by', username)
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
        <div className = "submission-container">
            <div className = "header">
                <h1>Paper Submission Portal</h1>
                <div className = "user-info">
                    <span className="username-display">Welcome, {username}</span>
                    <button className="logout-btn" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </div>

            <div className="content">
                <button className="submit-btn" onClick={handleTurnInClick}>
                    Turn Paper In Here
                </button>

                <input
                    id = "fileInput"
                    type = "file"
                    onChange = {handleFileChange}
                    style = {{ display: 'none' }}
                    accept = ".pdf, .doc, .docx, .txt"
                />

                {selectedFile && !isVerifying && (
                    <div className = "file-info-container">
                        <p className = "file-info">
                            Selected: <strong>{selectedFile.name}</strong>
                        </p>
                        <button className="submit-btn" onClick={handleSubmit}>
                            Submit
                        </button>
                    </div>
                )}

                {isVerifying && selectedFile && (
                    <div className = "verification-screen">
                        <h2>Verify Your Submission</h2>
                        <div className = "verification-details">
                            <p>
                                <strong>Username:</strong> {username}
                            </p>
                            <p>
                                <strong>File Name:</strong> {selectedFile.name}
                            </p>
                            <p>
                                <strong>File Size:</strong> {formatFileSize(selectedFile.size)}
                            </p>
                            <p>
                                <strong>File Type:</strong> {selectedFile.type || 'Unknown'}
                            </p>
                            <p>
                                <strong>Submission Time:</strong>{' '}
                                {new Date().toLocaleString()}
                            </p>
                        </div>
                        <p className="verification-message">
                            Please confirm this is the correct file
                        </p>
                        <div className= "verification-button">
                            <button className="confirm-btn" onClick={handleConfirmSubmit}>
                                Confirm & Submit
                            </button>
                            <button className = "cancel-btn" onClick = {handleCancel}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {isSubmitted && (
                    <div className = "success-message">File Submitted Successfully</div>
                )}
            </div>

            {submissionHistory.length > 0 && (
                <div className = "submission-history">
                    <h2>Your Submissions</h2>
                    <div className = "history-list">
                        {submissionHistory.map((submission) => (
                            <div key={submission.id} className = "history-item">
                                <div className="history-details">
                                    <p className="history-filename">{submission.filename}</p>
                                    <p className = "history-meta">
                                        {submission.size} • {submission.timestamp}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}