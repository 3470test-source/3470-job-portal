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


app.use(express.urlencoded({ extended: true }));

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

const upload = multer({ storage });

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









// // Register API
// app.post("/register", upload.single("resume"), async (req, res) => {
//   try {
//     const { name, email, phone, password, confirmPassword } = req.body;

//     if (password !== confirmPassword) {
//       return res.json({ success: false, message: "Passwords do not match" });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Save to DB
//     const sql = "INSERT INTO users (name, email, phone, password, resume) VALUES (?, ?, ?, ?, ?)";
//     db.query(sql, [name, email, phone, hashedPassword, req.file.filename], async (err, result) => {

//       if (err) {
//         return res.json({ success: false, message: "Email already exists" });
//       }

//       // Send email
//       await transporter.sendMail({
//         from: process.env.GMAIL_USER,
//         to: email,
//         subject: "Registration Successful",
//         html: `<h2>Welcome ${name}</h2>
//                <p>Your registration is successful.</p>`
//       });

//       res.json({ success: true, message: "Registered successfully & email sent!" });
//     });

//   } catch (error) {
//     res.json({ success: false, message: "Server error" });
//   }
// });




app.post("/register", upload.single("resume"), async (req, res) => {

    try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                message: "Missing required fields ❌"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Resume file is required ❌"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO jobseekers (name, email, phone, password, resume)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(sql,
            [name, email, phone, hashedPassword, req.file.filename],
            (err) => {

                if (err) {
                    console.log("MYSQL ERROR:", err);

                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({
                            message: "Email already exists ❌"
                        });
                    }

                    return res.status(500).json({
                        message: "Database error ❌"
                    });
                }

                return res.json({
                    message: "Jobseeker registered successfully 🎉"
                });
            }
        );

    } catch (err) {
        console.log("SERVER ERROR:", err);
        return res.status(500).json({
            message: err.message
        });
    }
});
















// app.post("/register", upload.single("resume"), async (req, res) => {
//   const { name, email, phone, password, confirmPassword } = req.body;

//   if (password !== confirmPassword) {
//     return res.status(400).json({
//       success: false,
//       message: "Passwords do not match ❌"
//     });
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
//       async (err) => {
//         if (err) {
//           if (err.code === "ER_DUP_ENTRY") {
//             return res.status(400).json({
//               success: false,
//               message: "Email already exists ❌"
//             });
//           }

//           return res.status(500).json({
//             success: false,
//             message: "Database error ❌"
//           });
//         }

//         // ✅ Use transporter from top
//         try {
//           await transporter.sendMail({
//             from: "your_email@gmail.com",
//             to: email,
//             subject: "Registration Successful 🎉",
//             html: `
//               <h2>Welcome, ${name} 👋</h2>
//               <p>Your account has been created successfully.</p>
//               <p>You can now login.</p>
//             `
//           });

//           return res.status(201).json({
//             success: true,
//             message:
//               "Welcome! Your account has been created 🎉. A confirmation email has been sent. Please login."
//           });

//         } catch (emailError) {
//           return res.status(201).json({
//             success: true,
//             message: "Account created successfully 🎉. Please login."
//           });
//         }
//       }
//     );
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: "Server error ❌"
//     });
//   }
// });







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





          /*----- Employer side details ------*/ 

app.post("/employer/register", async (req, res) => {
  const { company, name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO employers (company_name, name, email, password)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [company, name, email, hashedPassword], async (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Email already exists ❌" });
        }
        return res.status(500).json({ message: "Database error ❌" });
      }

      // 📧 Send Email
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Employer Registration Successfully",
        html: `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
      
      <div style="max-width: 500px; margin: auto; background: #ffffff; padding: 25px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center;">
        
        <h2 style="color: #28a745;">Welcome ${name} 🎉</h2>
        
        <p style="font-size: 16px; color: #333;">
          Your employer account is ready ✅
        </p>

        <div style="text-align: left; margin-top: 20px;">
          <p><b>Email:</b> ${email}</p>
          <p><b>Password:</b> ${password}</p>
        </div>

        <a href="http://127.0.0.1:5501/frontend/employer_login.html"
           style="display: inline-block; margin-top: 20px; padding: 12px 20px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
           Login Now
        </a>

      </div>
    </div>
  `
});

      res.json({ message: "Your employer account has been created. A confirmation email has been sent." });
    });

  } catch (err) {
    res.status(500).json({ message: "Server error ❌" });
  }
});



/*---- Employer Login API ----*/
app.post("/employer/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM employers WHERE email=?";

  db.query(sql, [email], async (err, result) => {
    if (result.length === 0) {
      return res.status(400).json({ message: "Employer not found ❌" });
    }

    const employer = result[0];

    const isMatch = await bcrypt.compare(password, employer.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password ❌" });
    }

    const token = jwt.sign(
      { id: employer.id, role: "employer" },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Employer login success ✅",
      token,
      employer: {
        id: employer.id,
        name: employer.name,
        email: employer.email
      }
    });
  });
});


// ================= START SERVER =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});













