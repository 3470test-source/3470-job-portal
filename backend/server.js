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

let applications = []; // ✅ NEW

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
    id: Date.now(),
    title: req.body.title,
    company: req.body.company,
    experience: req.body.experience,
    location: req.body.location,
    salary: req.body.salary,
    skills: req.body.skills,
    highlights: req.body.highlights,  
    description: req.body.description,
    education: req.body.education,   
    category: req.body.category,     
    industry: req.body.industry,
    department: req.body.department,
    jobType: req.body.jobType,
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



// ================= APPLY JOB =================
app.post("/apply", upload.single("resume"), (req, res) => {

  const { jobId, userId } = req.body;

  // ❌ Prevent duplicate apply
  const alreadyApplied = applications.find(
    app => app.jobId == jobId && app.userId == userId
  );

  if (alreadyApplied) {
    return res.json({ message: "Already Applied ✅" });
  }

  const application = {
    id: Date.now(),
    jobId,
    userId,
    resume: req.file ? "/uploads/" + req.file.filename : "",
    status: "APPLIED",
    appliedAt: new Date()
  };

  applications.push(application);

  res.json({ message: "Application submitted 🎉" });
});



// ================= MY APPLICATIONS =================
app.get("/applications/:userId", (req, res) => {

  const userApps = applications.filter(
    app => app.userId == req.params.userId
  );

  const result = userApps.map(app => {
    const job = jobs.find(j => j.id == app.jobId);
    return { ...app, job };
  });

  res.json(result);
});



// ================= GET APPLICANTS =================
app.get("/applicants/:jobId", (req, res) => {

  const { status } = req.query;

  let result = applications.filter(app => app.jobId == req.params.jobId);
  

  if (status) {
    result = result.filter(app => app.status === status);
  }

  res.json(result);
});




// ================= UPDATE STATUS =================
app.put("/application/status", (req, res) => {

  const { id, status } = req.body;

  const appData = applications.find(a => a.id == id);

  if (appData) {
    appData.status = status;
  }

  res.json({ message: "Status updated ✅" });
});






// ================= GET SINGLE JOB =================
app.get("/jobs/:id", (req, res) => {

  const job = jobs.find(j => j.id == req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" }); // ✅ FIXED
  }

  res.json(job);
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