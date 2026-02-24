import { useState } from 'react'
import { Menu } from './Menu'
import './SubmissionPage.css'

interface SubmissionPageProps {
    username: string
    onLogout: () => void
}

export function SubmissionPage({ username, onLogout }: SubmissionPageProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showPreviousSubmissions, setShowPreviousSubmissions] = useState(false)
    const [submissionHistory, setSubmissionHistory] = useState<Array<{
        id: string
        filename: string
        size: string
        timestamp: string
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
            formData.append('file', selectedFile)

            const response = await fetch('/api/papers', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                console.log('File uploaded to database:', data)
                
                const newSubmission = {
                    id: data.paperId || Date.now().toString(),
                    filename: data.fileName || selectedFile.name,
                    size: formatFileSize(selectedFile.size),
                    timestamp: new Date().toLocaleString(),
                }

                setSubmissionHistory([newSubmission, ...submissionHistory])
                setIsSubmitted(true)
                setSelectedFile(null)
                setIsVerifying(false)
                setTimeout(() => setIsSubmitted(false), 3000)
            } else {
                const error = await response.json()
                console.error('Upload error:', error)
                alert('Failed to upload file: ' + error.error)
            }
        } catch (err) {
            console.error('Upload failed:', err)
            alert('Failed to connect to server. Make sure the backend is running on http://localhost:5000')
        }
    }

    const handleCancel = () => {
        setIsVerifying(false)
    }

    const handleTurnInClick = () => {
        document.getElementById('fileInput')?.click()
    }

    const formatFileSize = (bytes: number) => {
        return (bytes / 1024).toFixed(2) + 'KB'
    }

        const handleShowPreviousSubmissions = () => {
        setShowPreviousSubmissions(true)
    }

    const handleShowAccount = () => {
        setShowAccountModal(true)
    }

    const closeModals = () => {
        setShowAccountModal(false)
        setShowPreviousSubmissions(false)
    }

    return (
        <div className = "submission-container">
            <Menu 
                username={username}
                onShowPreviousSubmissions={handleShowPreviousSubmissions}
                onShowAccount={handleShowAccount}
            />
            <div className = "header">
                <h1>Tea Submission Portal</h1>
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

            {/* Account Modal */}
            {showAccountModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Account Information</h2>
                            <button className="modal-close" onClick={closeModals}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="account-info-item">
                                <span className="account-label">Username:</span>
                                <span className="account-value">{username}</span>
                            </div>
                            <div className="account-info-item">
                                <span className="account-label">Total Submissions:</span>
                                <span className="account-value">{submissionHistory.length}</span>
                            </div>
                            <div className="account-info-item">
                                <span className="account-label">Last Submission:</span>
                                <span className="account-value">
                                    {submissionHistory.length > 0 
                                        ? submissionHistory[0].timestamp 
                                        : 'No submissions yet'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Previous Submissions Modal */}
            {showPreviousSubmissions && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Previous Submissions</h2>
                            <button className="modal-close" onClick={closeModals}>×</button>
                        </div>
                        <div className="modal-body">
                            {submissionHistory.length > 0 ? (
                                <div className="submissions-list-modal">
                                    {submissionHistory.map((submission) => (
                                        <div key={submission.id} className="submission-item-modal">
                                            <p className="submission-filename">{submission.filename}</p>
                                            <p className="submission-meta">
                                                Size: {submission.size}
                                            </p>
                                            <p className="submission-meta">
                                                Time: {submission.timestamp}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-submissions">No submissions yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}