const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo connect error:", err));

// Simple test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Example API route
app.get("/api/notes", async (req, res) => {
  res.json([{ _id: "1", text: "hello from server" }]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
