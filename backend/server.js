require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const db = require("./db");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());


// ================= SECRET =================
const SECRET_KEY = process.env.JWT_SECRET;


// ================= STATIC =================
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

// const upload = multer({ storage });

// ✅ Only PDF allowed
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed ❌"), false);
    }
  }
});


// ================= JWT MIDDLEWARE =================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied ❌" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token ❌" });
    }

    req.user = user;
    next();
  });
}




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

  // ✅ Attach job details
  const finalResult = result.map(app => {
    const job = jobs.find(j => j.id == app.jobId);
    return { ...app, job };
  });

  res.json(finalResult);
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



// ================= REGISTER =================
app.post("/register", upload.single("resume"), async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  // ✅ Password match check
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match ❌" });
  }

  const resumePath = req.file ? "/uploads/" + req.file.filename : "";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO job_seekers (name, email, phone, password, resume)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [name, email, phone, hashedPassword, resumePath],
      (err) => {
        if (err) {
          console.error(err);

          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(400)
              .json({ message: "Email already exists ❌" });
          }

          return res.status(500).json({ message: "Database error ❌" });
        }

        res.json({ message: "Account created successfully 🎉" });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Server error ❌" });
  }
});



// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM job_seekers WHERE email=?";

  db.query(sql, [email], async (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error ❌" });
    }

    if (result.length === 0) {
      return res.status(400).json({ message: "User not found ❌" });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password ❌" });
    }

    const token = jwt.sign({ id: user.id }, SECRET_KEY, {
      expiresIn: "1d"
    });

    res.json({
      message: "Login successful ✅",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
});


// ================= GET PROFILE (PROTECTED) =================
app.get("/profile", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = "SELECT id, name, email, phone, resume FROM job_seekers WHERE id=?";

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Server error ❌" });
    }

    res.json(result[0]);
  });
});



// ================= START SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

