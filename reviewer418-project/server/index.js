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
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo connect error:", err));

// User schema for authentication
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);


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
  }
});

const Paper = mongoose.model("Paper", paperSchema);

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
    const user = new User({ username, email, password: hashed });
    await user.save();

    res.status(201).json({ message: 'User created' });
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
    res.json({ message: 'Login successful', username: user.username });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Example API route
app.get("/api/notes", async (req, res) => {
  res.json([{ _id: "1", text: "hello from server" }]);
});

// File upload endpoint
app.post("/api/papers", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const paper = new Paper({
      fileName: req.file.originalname,
      fileData: req.file.buffer,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      originalName: req.file.originalname
    });

    const savedPaper = await paper.save();
    res.status(200).json({ 
      message: "File uploaded successfully",
      paperId: savedPaper._id,
      fileName: savedPaper.fileName
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
