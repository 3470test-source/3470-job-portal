const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve uploaded images
app.use("/uploads", express.static("uploads"));

// 🔥 In-memory DB
let jobs = [];

// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ================= POST JOB =================
app.post("/jobs", upload.single("logo"), (req, res) => {

  const job = {
    id: jobs.length + 1,
    title: req.body.title,
    company: req.body.company,
    experience: req.body.experience,
    location: req.body.location,
    salary: req.body.salary,
    skills: req.body.skills,
    description: req.body.description,
    logo: req.file ? "/uploads/" + req.file.filename : "",
    createdAt: new Date()
  };

  jobs.push(job);

  res.json({ message: "Job Posted Successfully" });
});

// ================= GET JOBS =================
app.get("/jobs", (req, res) => {
  res.json(jobs);
});


// ================= DELETE JOB =================
app.delete("/jobs/:id", (req, res) => {

  const jobId = parseInt(req.params.id);

  jobs = jobs.filter(job => job.id !== jobId);

  res.json({ message: "Job deleted successfully" });
});


// ================= START SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});