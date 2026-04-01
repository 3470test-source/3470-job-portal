require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const db = require("./db");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());


// ================= SECRET =================
const SECRET_KEY = process.env.JWT_SECRET;


/* ==========================
   NODEMAILER (GMAIL)
========================== */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});


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
// app.post("/register", upload.single("resume"), async (req, res) => {
//   const { name, email, phone, password, confirmPassword } = req.body;

//   // ✅ Password match check
//   if (password !== confirmPassword) {
//     return res.status(400).json({ message: "Passwords do not match ❌" });
//   }

//   const resumePath = req.file ? "/uploads/" + req.file.filename : "";

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const sql = `
//       INSERT INTO job_seekers (name, email, phone, password, resume)
//       VALUES (?, ?, ?, ?, ?)
//     `;

//     db.query(
//       sql,
//       [name, email, phone, hashedPassword, resumePath],
//       (err) => {
//         if (err) {
//           console.error(err);

//           if (err.code === "ER_DUP_ENTRY") {
//             return res
//               .status(400)
//               .json({ message: "Email already exists ❌" });
//           }

//           return res.status(500).json({ message: "Database error ❌" });
//         }

//         res.json({ message: "Account created successfully 🎉" });
//       }
//     );
//   } catch (err) {
//     res.status(500).json({ message: "Server error ❌" });
//   }
// });




app.post("/register", upload.single("resume"), async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  // ✅ 1. Password match check
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match ❌" });
  }

  // ✅ 2. Resume path
  const resumePath = req.file ? "/uploads/" + req.file.filename : "";

  try {
    // ✅ 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO job_seekers (name, email, phone, password, resume)
      VALUES (?, ?, ?, ?, ?)
    `;

    // ✅ 4. Insert into DB
    db.query(
      sql,
      [name, email, phone, hashedPassword, resumePath],
      async (err, result) => {
        if (err) {
          console.error(err);

          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(400)
              .json({ message: "Email already exists ❌" });
          }

          return res.status(500).json({ message: "Database error ❌" });
        }

        // ✅ 5. Send Email
       const mailOptions = {
         from: `"3470 HealthCare" <${process.env.GMAIL_USER}>`,
         to: email,
         subject: "Registration successfully 🎉",
         html: `
            <div style="font-family: Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
    
              <div style="max-width:600px; margin:auto; background:#ffffff; padding:25px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
      
                <h2 style="color:#2c3e50; text-align:center;">Welcome ${name} 👋</h2>
      
                <p style="font-size:16px; color:#555;">
                  Your account has been created successfully 🎉
                </p>

              <div style="background:#f1f1f1; padding:15px; border-radius:8px; margin:20px 0;">
                  <p style="margin:5px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin:5px 0;"><strong>Password:</strong> ${password}</p>
              </div>

              <p style="font-size:15px; color:#555;">
                  You can now login using your credentials.
              </p>

              <div style="text-align:center; margin-top:25px;">
                  <a href="http://127.0.0.1:5501/frontend/login.html" 
                style="background-color:#007bff; color:#ffffff; padding:12px 25px; text-decoration:none; border-radius:6px; font-size:16px; display:inline-block;">
           Login Now
        </a>
      </div>

      <p style="margin-top:30px; font-size:13px; color:#888; text-align:center;">
        © 3470 HealthCare. All rights reserved.
      </p>

    </div>
  </div>
  `
};

        try {
          await transporter.sendMail(mailOptions);

          // ✅ 6. Success response
          res.status(200).json({
            message: "Account created & email sent 🎉"
          });

        } catch (emailError) {
          console.error("Email Error:", emailError);

          // ⚠️ Email failed but account created
          res.status(200).json({
            message: "Account created but email failed ⚠️"
          });
        }
      }
    );

  } catch (err) {
    console.error(err);
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

