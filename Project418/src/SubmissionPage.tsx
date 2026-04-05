import { useState, useEffect } from 'react'
import { Menu } from './Menu'
import './SubmissionPage.css'
import logo from './assets/logo.png'

interface SubmissionPageProps {
    username: string
    email: string
    onLogout: () => void
    onBackToMain: () => void
}

interface Conference {
    _id: string
    name: string
    date: string
    location: string
}

interface Submission {
    _id: string
    originalName: string
    fileName: string
    fileSize: number
    uploadedAt: string
    submitterEmail: string
}

export function SubmissionPage({ username, email, onLogout, onBackToMain }: SubmissionPageProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [selectedConference, setSelectedConference] = useState<string>('')
    const [conferences, setConferences] = useState<Conference[]>([])
    const [isVerifying, setIsVerifying] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [showAccountModal, setShowAccountModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit')
    const [submissionHistory, setSubmissionHistory] = useState<Array<{
        id: string
        filename: string
        size: string
        timestamp: string
    }>>([])
    const [isDownloading, setIsDownloading] = useState<string | null>(null)

    useEffect(() => {
        fetchSubmissions()
        fetchConferences()
    }, [email])

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            console.log('File selected:', file.name)
        }
    }

    const fetchConferences = async () => {
        try {
            const response = await fetch('/api/conferences')
            if (response.ok) {
                const data = await response.json()
                setConferences(data)
            }
        } catch (err) {
            console.error('Failed to fetch conferences:', err)
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
            formData.append('email', email)

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
                fetchSubmissions()
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

    const fetchSubmissions = async () => {
        try {
            const response = await fetch('/api/papers')
            if (response.ok) {
                const papers = await response.json()
                const userPapers = papers.filter((paper: Submission) => paper.submitterEmail === email)
                const formatted = userPapers.map((paper: Submission) => ({
                    id: paper._id,
                    filename: paper.originalName,
                    size: formatFileSize(paper.fileSize),
                    timestamp: new Date(paper.uploadedAt).toLocaleString(),
                }))
                setSubmissionHistory(formatted)
            }
        } catch (err) {
            console.error('Failed to fetch submissions:', err)
        }
    }

    const handleDownload = async (paperId: string, filename: string) => {
        setIsDownloading(paperId)
        try {
            const response = await fetch(`/api/papers/${paperId}`)
            if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            } else {
                alert('Failed to download file')
            }
        } catch (err) {
            console.error('Download failed:', err)
            alert('Failed to download file')
        } finally {
            setIsDownloading(null)
        }
    }

    const handleCancel = () => {
        setIsVerifying(false)
    }

    const handleReturnToStart = () => {
        setSelectedFile(null)
        setIsVerifying(false)
    }

    const handleTurnInClick = () => {
        document.getElementById('fileInput')?.click()
    }

    const formatFileSize = (bytes: number) => {
        return (bytes / 1024).toFixed(2) + 'KB'
    }

    const handleShowAccount = () => {
        setShowAccountModal(true)
    }

    const handleShowSettings = () => {
        setShowSettingsModal(true)
    }

    const closeModals = () => {
        setShowAccountModal(false)
        setShowSettingsModal(false)
    }

    return (
        <div className="submission-container">
            <div className="submission-header">
                <div className="header-content">
                    <img 
                        src={logo} 
                        alt="Reviewer418 Logo" 
                        className="header-logo"
                        onClick={onBackToMain}
                        style={{ cursor: 'pointer' }}
                        title="Click to change role"
                    />
                    <h1>Submission Portal</h1>
                </div>
                <div className="header-actions">
                    <Menu 
                        username={username}
                        onShowPreviousSubmissions={() => setActiveTab('history')}
                        onShowAccount={handleShowAccount}
                        onShowSettings={handleShowSettings}
                    />
                </div>
            </div>

            {isSubmitted && (
                <div className="success-message">File Submitted Successfully!</div>
            )}

            <div className="submission-content">
                <div className="tabs">
                    <button 
                        className={`tab ${activeTab === 'submit' ? 'active' : ''}`}
                        onClick={() => setActiveTab('submit')}
                    >
                        Submit New Paper
                    </button>
                    <button 
                        className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        My Submissions ({submissionHistory.length})
                    </button>
                </div>

                {activeTab === 'submit' && (
                    <div className="submit-section">
                        <div className="submit-panel">
                            {!selectedFile && !isVerifying && (
                                <div className="upload-container">
                                    <h2>Upload Your Paper</h2>
                                    <p>Select a PDF, DOC, DOCX, or TXT file to submit</p>
                                    
                                    <div className="conference-selector">
                                        <label htmlFor="conference">Select Conference</label>
                                        <select 
                                            id="conference"
                                            value={selectedConference}
                                            onChange={(e) => setSelectedConference(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Choose a conference --</option>
                                            {conferences.map((conf) => (
                                                <option key={conf._id} value={conf._id}>
                                                    {conf.name} ({new Date(conf.date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        {conferences.length === 0 && (
                                            <p className="no-conferences-message">No conferences available</p>
                                        )}
                                    </div>
                                    
                                    <button className="submit-btn" onClick={handleTurnInClick} disabled={!selectedConference}>
                                        Choose File
                                    </button>
                                </div>
                            )}

                            {selectedFile && !isVerifying && (
                                <div className="file-preview">
                                    <h2>File Selected</h2>
                                    <div className="file-details">
                                        <p><strong>Filename:</strong> {selectedFile.name}</p>
                                        <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                                        <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
                                    </div>
                                    <div className="file-action-buttons">
                                        <button className="submit-btn" onClick={handleSubmit}>
                                            Review & Submit
                                        </button>
                                        <button className="return-btn" onClick={handleReturnToStart}>
                                            Choose Different File
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isVerifying && selectedFile && (
                                <div className="verification-modal">
                                    <h2>Verify Your Submission</h2>
                                    <div className="verification-details">
                                        <div className="detail-row">
                                            <span className="label">Username:</span>
                                            <span className="value">{username}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Email:</span>
                                            <span className="value">{email}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Conference:</span>
                                            <span className="value">{conferences.find(c => c._id === selectedConference)?.name || 'Not selected'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">File Name:</span>
                                            <span className="value">{selectedFile.name}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">File Size:</span>
                                            <span className="value">{formatFileSize(selectedFile.size)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">File Type:</span>
                                            <span className="value">{selectedFile.type || 'Unknown'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Submission Time:</span>
                                            <span className="value">{new Date().toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <p className="verification-message">
                                        Please confirm this is the correct file to submit
                                    </p>
                                    <div className="verification-buttons">
                                        <button className="confirm-btn" onClick={handleConfirmSubmit}>
                                            Confirm & Submit
                                        </button>
                                        <button className="return-btn" onClick={handleCancel}>
                                            Back to Review
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-section">
                        <h2>My Submissions</h2>
                        {submissionHistory.length === 0 ? (
                            <div className="empty-state">
                                <p>No submissions yet. Start by uploading a paper!</p>
                            </div>
                        ) : (
                            <div className="submissions-grid">
                                {submissionHistory.map((submission) => (
                                    <div key={submission.id} className="submission-card">
                                        <div className="card-header">
                                            <h3>{submission.filename}</h3>
                                        </div>
                                        <p className="card-meta">
                                            <strong>Size:</strong> {submission.size}
                                        </p>
                                        <p className="card-meta">
                                            <strong>Submitted:</strong> {submission.timestamp}
                                        </p>
                                        <button 
                                            className="download-btn"
                                            onClick={() => handleDownload(submission.id, submission.filename)}
                                            disabled={isDownloading === submission.id}
                                        >
                                            {isDownloading === submission.id ? 'Downloading...' : '⬇ Download'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf, .doc, .docx, .txt"
            />

            {/* Account Modal */}
            {showAccountModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Account Information</h3>
                            <button className="close-btn" onClick={closeModals}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="account-info-item">
                                <span className="account-label">Username:</span>
                                <span className="account-value">{username}</span>
                            </div>
                            <div className="account-info-item">
                                <span className="account-label">Email:</span>
                                <span className="account-value">{email}</span>
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

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="modal-overlay" onClick={closeModals}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Settings</h3>
                            <button className="close-btn" onClick={closeModals}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="settings-section">
                                <p>Settings coming soon...</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}