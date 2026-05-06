const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed."));
    }
  }
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await ensureSystemOwner();
  })
  .catch((err) => console.error("Mongo connect error:", err));

// User schema for authentication
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  systemRole: {
    type: String,
    enum: ['user', 'admin', 'owner'],
    default: 'user'
  }
});

const User = mongoose.model('User', userSchema);

const SYSTEM_OWNER_USERNAME = 'test-dev';

const isSystemOwner = async (username) => {
  if (!username) {
    return false;
  }

  const user = await User.findOne({ username });
  return user?.systemRole === 'owner';
};

const isSystemAdmin = async (username) => {
  if (!username) {
    return false;
  }

  const user = await User.findOne({ username });
  return user?.systemRole === 'owner' || user?.systemRole === 'admin';
};

const ensureSystemOwner = async () => {
  try {
    const preferredOwner = await User.findOne({ username: SYSTEM_OWNER_USERNAME });
    if (preferredOwner && preferredOwner.systemRole !== 'owner') {
      preferredOwner.systemRole = 'owner';
      await preferredOwner.save();
      console.log(`Promoted ${SYSTEM_OWNER_USERNAME} to system owner`);
      return;
    }

    const existingOwner = await User.findOne({ systemRole: 'owner' });
    if (existingOwner) {
      return;
    }

    const firstUser = await User.findOne().sort({ _id: 1 });
    if (firstUser) {
      firstUser.systemRole = 'owner';
      await firstUser.save();
      console.log(`Promoted ${firstUser.username} to system owner`);
    }
  } catch (error) {
    console.error('Failed to ensure system owner:', error);
  }
};


// Define Paper Schema
const paperSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  fileData: {
    type: Buffer,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  originalName: {
    type: String,
    required: true
  },
  submitterEmail: {
    type: String,
    required: true
  }
});

const Paper = mongoose.model("Paper", paperSchema);

// Conference schema
const conferenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  paperRequirements: {
    type: String,
    default: ''
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Conference = mongoose.model("Conference", conferenceSchema);

// Submission schema
const submissionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  authors: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Paper', 'Poster', 'Workshop'],
    required: true
  },
  conference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const Submission = mongoose.model("Submission", submissionSchema);

// Reviewer schema
const reviewerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  expertise: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Reviewer = mongoose.model("Reviewer", reviewerSchema);

// Review schema
const reviewSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reviewer',
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 10
  },
  comments: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const Review = mongoose.model("Review", reviewSchema);

// ConferenceUser schema - tracks users and their roles in each conference
const conferenceUserSchema = new mongoose.Schema({
  conference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conference',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  roles: {
    type: [String],
    enum: ['organizer', 'reviewer', 'submitter'],
    default: ['reviewer']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const ConferenceUser = mongoose.model("ConferenceUser", conferenceUserSchema);

// Simple test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Authentication routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userCount = await User.countDocuments();
    const shouldBeOwner = userCount === 0;
    const user = new User({
      username,
      email,
      password: hashed,
      systemRole: shouldBeOwner ? 'owner' : 'user'
    });
    await user.save();

    if (username === SYSTEM_OWNER_USERNAME && user.systemRole !== 'owner') {
      user.systemRole = 'owner';
      await user.save();
    }

    res.status(201).json({
      message: 'User created',
      username: user.username,
      email: user.email,
      systemRole: user.systemRole
    });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // authentication succeeded
    res.json({
      message: 'Login successful',
      username: user.username,
      email: user.email,
      systemRole: user.systemRole || 'user'
    });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (for user management in conferences)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, _id: 1, email: 1, systemRole: 1 }).sort({ username: 1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId, { username: 1, _id: 1, email: 1, systemRole: 1, password: 1 });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//change username
app.put('/api/users/:userId', async (req, res) => {
  try {    
    const newUsername = req.body.username;

    //check if new username is already taken
    const usernameExists = await User.findOne({ username: newUsername });
    if (usernameExists != null) {
      return res.status(400).json({ error: 'Username already taken' });
    }
  
    //find user by id
    const user = await User.findOneAndUpdate({ _id: req.params.userId }, { username: newUsername }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);


    
  } catch (err) {
    console.error('Error updating username:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

//change password
app.put('/api/users/:userId/password', async (req, res) => {
  try {
    const newPassword = req.body.password;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate({ _id: req.params.userId }, { password: hashedPassword }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);

  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Conference routes
app.post("/api/conferences", async (req, res) => {
  try {
    const { name, date, location, paperRequirements, createdBy } = req.body;
    if (!createdBy) {
      return res.status(400).json({ error: 'createdBy username is required' });
    }

    const requesterIsSystemAdmin = await isSystemAdmin(createdBy);
    if (!requesterIsSystemAdmin) {
      return res.status(403).json({ error: 'Only the owner or admins can create conferences' });
    }

    const conference = new Conference({
      name,
      date,
      location,
      paperRequirements: paperRequirements || '',
      createdBy
    });
    const saved = await conference.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conferences", async (req, res) => {
  try {
    const requestedBy = req.query.requestedBy;
    const requesterIsSystemAdmin = await isSystemAdmin(typeof requestedBy === 'string' ? requestedBy : '');
    const filter = requesterIsSystemAdmin
      ? {}
      : {
          $or: [
            { isHidden: false },
            { isHidden: { $exists: false } }
          ]
        };
    const conferences = await Conference.find(filter).sort({ date: -1 });
    res.json(conferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conferences/:id", async (req, res) => {
  try {
    const conference = await Conference.findById(req.params.id);
    if (!conference) {
      return res.status(404).json({ error: "Conference not found" });
    }
    res.json(conference);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:userId/system-role', async (req, res) => {
  try {
    const { requestedBy, systemRole } = req.body;

    if (!requestedBy) {
      return res.status(400).json({ error: 'requestedBy username is required' });
    }

    if (!['user', 'admin'].includes(systemRole)) {
      return res.status(400).json({ error: 'systemRole must be user or admin' });
    }

    const requesterIsAdmin = await isSystemAdmin(requestedBy);
    if (!requesterIsAdmin) {
      return res.status(403).json({ error: 'Only the owner or admins can manage admin privileges' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.systemRole === 'owner') {
      return res.status(403).json({ error: 'The owner account cannot be changed from this screen' });
    }

    targetUser.systemRole = systemRole;
    await targetUser.save();

    res.json({
      _id: targetUser._id,
      username: targetUser.username,
      email: targetUser.email,
      systemRole: targetUser.systemRole
    });
  } catch (err) {
    console.error('Error updating system role:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put("/api/conferences/:id/requirements", async (req, res) => {
  try {
    const { requestedBy, paperRequirements } = req.body;

    if (!requestedBy) {
      return res.status(400).json({ error: 'requestedBy username is required' });
    }

    const conference = await Conference.findById(req.params.id);
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    const requesterConferenceUser = await ConferenceUser.findOne({
      conference: req.params.id,
      username: requestedBy
    });

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    const isCreator = conference.createdBy === requestedBy;
    const isOrganizer = requesterConferenceUser && requesterConferenceUser.roles.includes('organizer');

    if (!requesterIsSystemAdmin && !isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Only the system owner/admin, conference owner, or organizer can edit paper requirements' });
    }

    if (!conference.createdBy) {
      conference.createdBy = requestedBy;
    }
    conference.paperRequirements = typeof paperRequirements === 'string' ? paperRequirements : '';
    const updatedConference = await conference.save();
    res.json(updatedConference);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/conferences/:id/visibility", async (req, res) => {
  try {
    const { requestedBy, isHidden } = req.body;

    if (!requestedBy) {
      return res.status(400).json({ error: 'requestedBy username is required' });
    }

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    if (!requesterIsSystemAdmin) {
      return res.status(403).json({ error: 'Only the owner or admins can hide conferences' });
    }

    const conference = await Conference.findById(req.params.id);
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    conference.isHidden = Boolean(isHidden);
    const updatedConference = await conference.save();
    res.json(updatedConference);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/conferences/:id", async (req, res) => {
  try {
    const { requestedBy } = req.body;

    if (!requestedBy) {
      return res.status(400).json({ error: 'requestedBy username is required' });
    }

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    if (!requesterIsSystemAdmin) {
      return res.status(403).json({ error: 'Only the owner or admins can delete conferences' });
    }

    const conference = await Conference.findById(req.params.id);
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    const submissions = await Submission.find({ conference: req.params.id }, { _id: 1 });
    const submissionIds = submissions.map((submission) => submission._id);

    if (submissionIds.length > 0) {
      await Review.deleteMany({ submission: { $in: submissionIds } });
      await Submission.deleteMany({ conference: req.params.id });
    }

    await ConferenceUser.deleteMany({ conference: req.params.id });
    await Conference.findByIdAndDelete(req.params.id);

    res.json({ message: 'Conference deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users in a conference
app.get("/api/conferences/:conferenceId/users", async (req, res) => {
  try {
    const conferenceUsers = await ConferenceUser.find({ 
      conference: req.params.conferenceId 
    }).sort({ addedAt: -1 });
    res.json(conferenceUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add user to conference
app.post("/api/conferences/:conferenceId/users", async (req, res) => {
  try {
    const { username, roles, requestedBy } = req.body;
    const { conferenceId } = req.params;

    if (!username || !roles || roles.length === 0) {
      return res.status(400).json({ error: 'Username and at least one role are required' });
    }

    // Check if requester is an organizer or conference creator
    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    const requesterConferenceUser = await ConferenceUser.findOne({
      conference: conferenceId,
      username: requestedBy
    });

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    const isCreator = conference.createdBy === requestedBy;
    const isOrganizer = requesterConferenceUser && requesterConferenceUser.roles.includes('organizer');

    if (!requesterIsSystemAdmin && !isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Only conference creators and organizers can add users' });
    }

    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already in conference
    const existingConferenceUser = await ConferenceUser.findOne({
      conference: conferenceId,
      userId: user._id
    });

    if (existingConferenceUser) {
      // Update existing user's roles
      existingConferenceUser.roles = roles;
      const updated = await existingConferenceUser.save();
      return res.json(updated);
    }

    // Create new conference user entry
    const conferenceUser = new ConferenceUser({
      conference: conferenceId,
      userId: user._id,
      username: user.username,
      roles: roles
    });

    const saved = await conferenceUser.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user from conference
app.delete("/api/conferences/:conferenceId/users/:userId", async (req, res) => {
  try {
    const { conferenceId, userId } = req.params;
    const { requestedBy } = req.body;

    // Check if requester is an organizer or conference creator
    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    const requesterConferenceUser = await ConferenceUser.findOne({
      conference: conferenceId,
      username: requestedBy
    });

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    const isCreator = conference.createdBy === requestedBy;
    const isOrganizer = requesterConferenceUser && requesterConferenceUser.roles.includes('organizer');

    if (!requesterIsSystemAdmin && !isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Only conference creators and organizers can remove users' });
    }

    // Delete the conference user
    const result = await ConferenceUser.findByIdAndDelete(userId);
    if (!result) {
      return res.status(404).json({ error: 'User not found in conference' });
    }

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user roles in a conference
app.put("/api/conferences/:conferenceId/users/:userId", async (req, res) => {
  try {
    const { conferenceId, userId } = req.params;
    const { roles, requestedBy } = req.body;

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ error: 'At least one role is required' });
    }

    // Check if requester is an organizer or conference creator
    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    const requesterConferenceUser = await ConferenceUser.findOne({
      conference: conferenceId,
      username: requestedBy
    });

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    const isCreator = conference.createdBy === requestedBy;
    const isOrganizer = requesterConferenceUser && requesterConferenceUser.roles.includes('organizer');

    if (!requesterIsSystemAdmin && !isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Only conference creators and organizers can edit user roles' });
    }

    // Update the conference user's roles
    const conferenceUser = await ConferenceUser.findByIdAndUpdate(
      userId,
      { roles: roles },
      { new: true }
    );

    if (!conferenceUser) {
      return res.status(404).json({ error: 'User not found in conference' });
    }

    res.json(conferenceUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submission routes
app.post("/api/submissions", async (req, res) => {
  try {
    const { title, authors, type, conferenceId, userId, fileId } = req.body;
    const submission = new Submission({ 
      title, 
      authors, 
      type, 
      conference: conferenceId, 
      userId, 
      fileId 
    });
    const saved = await submission.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate('conference')
      .populate('userId', 'username')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/conferences/:conferenceId/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find({ conference: req.params.conferenceId })
      .populate('userId', 'username')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reviewer routes
app.post("/api/reviewers", async (req, res) => {
  try {
    const { name, expertise, userId } = req.body;
    const reviewer = new Reviewer({ name, expertise, userId });
    const saved = await reviewer.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/reviewers", async (req, res) => {
  try {
    const reviewers = await Reviewer.find();
    res.json(reviewers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Review routes
app.post("/api/reviews", async (req, res) => {
  try {
    const { submissionId, reviewer, score, comments } = req.body;
    const review = new Review({
      submission: submissionId,
      reviewer: reviewer,//reviewerid
      score,
      comments
    });
    const saved = await review.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get("/api/submissions/:submissionId/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ submission: req.params.submissionId })
      .populate('reviewer');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/reviewers/:reviewerId/reviews", async (req, res) => {
  try {
    const reviews = await Review.find({ reviewer: req.params.reviewerId })
      .populate('submission');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
app.post("/api/papers", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!req.body.email) {
      return res.status(400).json({ error: "Email is required for submission" });
    }

    const paper = new Paper({
      fileName: req.file.originalname,
      fileData: req.file.buffer,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      originalName: req.file.originalname,
      submitterEmail: req.body.email
    });

    const savedPaper = await paper.save();
    res.status(200).json({ 
      message: "File uploaded successfully",
      paperId: savedPaper._id,
      fileName: savedPaper.fileName,
      submitterEmail: savedPaper.submitterEmail
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all papers
app.get("/api/papers", async (req, res) => {
  try {
    const papers = await Paper.find({}, "-fileData"); // Exclude large fileData from list
    res.json(papers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific paper by ID
app.get("/api/papers/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }
    
    res.setHeader("Content-Type", paper.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${paper.originalName}"`);
    res.send(paper.fileData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/papers/:id", async (req, res) => {
  try {
    const { requestedBy } = req.body;

    if (!requestedBy) {
      return res.status(400).json({ error: 'requestedBy username is required' });
    }

    const requesterIsSystemAdmin = await isSystemAdmin(requestedBy);
    if (!requesterIsSystemAdmin) {
      return res.status(403).json({ error: 'Only the owner or admins can delete submissions' });
    }

    const deletedPaper = await Paper.findByIdAndDelete(req.params.id);
    if (!deletedPaper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    await Submission.deleteMany({ fileId: req.params.id });

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
