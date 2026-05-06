import { useState, useEffect } from 'react'
import './SubmissionPage.css'
import logo from './assets/logo.png'
import { loadReviewerRequests } from './reviewerRequests'

interface SubmissionPageProps {
    username: string
    email: string
    onBackToMain: () => void
}

interface Conference {
    _id: string
    name: string
    date: string
    location: string
    paperRequirements?: string
}

interface Submission {
    _id: string
    originalName: string
    fileName: string
    fileSize: number
    uploadedAt: string
    submitterEmail: string
    conferenceId?: string
    status?: 'pending' | 'accepted' | 'rejected' | 'pending_revision' | 'pending_final_approval'
    revisionDeadline?: string
}

type PaperStatus = 'pending' | 'accepted' | 'rejected' | 'pending_revision' | 'pending_final_approval'
type PaperStatusOverride = {
    status: PaperStatus
    revisionDeadline?: string
}

const PAPER_STATUS_OVERRIDES_KEY = 'reviewer418PaperStatusOverrides'

interface ConferenceUser {
    userId: string
    username: string
    role?: 'organizer' | 'reviewer' | 'submitter'
    roles?: Array<'organizer' | 'reviewer' | 'submitter'>
}

export function SubmissionPage({ username, email, onBackToMain }: SubmissionPageProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [selectedConference, setSelectedConference] = useState<string>('')
    const [conferences, setConferences] = useState<Conference[]>([])
    const [isVerifying, setIsVerifying] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit')
    const [submissionHistory, setSubmissionHistory] = useState<Array<{//thinking about applying the changes I made in the reviewer page code.
        id: string
        filename: string
        size: string
        timestamp: string
        status: PaperStatus
        revisionDeadline?: string
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
                if (data.length === 1) {
                    setSelectedConference(data[0]._id)
                }
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
            const assignedReviewers = await pickRandomReviewers(selectedConference)
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('email', email)
            formData.append('conferenceId', selectedConference)
            formData.append('status', 'pending')
            formData.append('assignedReviewerIds', JSON.stringify(assignedReviewers.map((reviewer) => reviewer.userId)))
            formData.append('assignedReviewers', JSON.stringify(assignedReviewers.map((reviewer) => reviewer.username)))

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
                    status: data.status || 'pending',
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

    const pickRandomReviewers = async (conferenceId: string) => {
        if (!conferenceId) {
            return []
        }

        try {
            const response = await fetch(`/api/conferences/${conferenceId}/users`)
            if (!response.ok) {
                return []
            }

            const conferenceUsers: ConferenceUser[] = await response.json()
            const reviewers = conferenceUsers.filter((user) => {
                const roles = user.roles || (user.role ? [user.role] : [])
                return roles.includes('reviewer') && user.username !== username
            })

            return pickWeightedReviewers(reviewers, 3)
        } catch (err) {
            console.error('Failed to assign random reviewers:', err)
            return []
        }
    }

    const pickWeightedReviewers = (reviewers: ConferenceUser[], count: number) => {
        const requestedReviewers = new Set(loadReviewerRequests().map((request) => request.username))
        const selectedReviewers: ConferenceUser[] = []
        const remainingReviewers = [...reviewers]

        while (selectedReviewers.length < count && remainingReviewers.length > 0) {
            const weightedPool = remainingReviewers.flatMap((reviewer) => {
                const weight = requestedReviewers.has(reviewer.username) ? 3 : 1
                return Array.from({ length: weight }, () => reviewer)
            })
            const pickedReviewer = weightedPool[Math.floor(Math.random() * weightedPool.length)]

            selectedReviewers.push(pickedReviewer)
            const pickedIndex = remainingReviewers.findIndex((reviewer) =>
                reviewer.userId === pickedReviewer.userId || reviewer.username === pickedReviewer.username
            )
            if (pickedIndex >= 0) {
                remainingReviewers.splice(pickedIndex, 1)
            }
        }

        return selectedReviewers
    }

    const fetchSubmissions = async () => {
        try {
            const response = await fetch('/api/papers')
            if (response.ok) {
                const papers = await response.json()
                const statusOverrides = loadPaperStatusOverrides()
                const userPapers = papers.filter((paper: Submission) => paper.submitterEmail === email)
                const formatted = userPapers.map((paper: Submission) => {
                    const override = statusOverrides[paper._id]
                    return {
                        id: paper._id,
                        filename: paper.originalName,
                        size: formatFileSize(paper.fileSize),
                        timestamp: new Date(paper.uploadedAt).toLocaleString(),
                        status: override?.status || paper.status || 'pending',
                        revisionDeadline: override?.revisionDeadline || paper.revisionDeadline,
                    }
                })
                setSubmissionHistory(formatted)
            }
        } catch (err) {
            console.error('Failed to fetch submissions:', err)
        }
    }

    const loadPaperStatusOverrides = (): Record<string, PaperStatusOverride> => {
        try {
            return JSON.parse(localStorage.getItem(PAPER_STATUS_OVERRIDES_KEY) || '{}')
        } catch (err) {
            console.error('Failed to load paper status overrides:', err)
            return {}
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

    const selectedConferenceDetails = conferences.find((conference) => conference._id === selectedConference)
    const selectedConferenceRequirements = selectedConferenceDetails?.paperRequirements
        ?.split('\n')
        .map((line) => line.trim())
        .filter(Boolean) ?? []


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
                                    
                                    {conferences.length > 1 ? (
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
                                        </div>
                                    ) : conferences.length === 0 ? (
                                        <div className="conference-selector">
                                            <p className="no-conferences-message">No conferences available</p>
                                        </div>
                                    ) : null}

                                    {selectedConference && (
                                        <div className="file-details">
                                            <h3>Conference Requirements</h3>
                                            {selectedConferenceRequirements.length > 0 ? (
                                                <ul>
                                                    {selectedConferenceRequirements.map((requirement, index) => (
                                                        <li key={`${selectedConference}-${index}`}>{requirement}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p>No extra paper requirements were posted for this conference.</p>
                                            )}
                                        </div>
                                    )}
                                    
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
                                            <span className={`status-badge ${submission.status}`}>
                                                {submission.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="card-meta">
                                            <strong>Size:</strong> {submission.size}
                                        </p>
                                        <p className="card-meta">
                                            <strong>Submitted:</strong> {submission.timestamp}
                                        </p>
                                        {submission.revisionDeadline && (
                                            <p className="card-meta">
                                                <strong>Revision Due:</strong> {new Date(submission.revisionDeadline).toLocaleDateString()}
                                            </p>
                                        )}
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

        </div>
    )
}
