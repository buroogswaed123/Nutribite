import express from "express";
import multer from "multer";
import path from "path";

const app = express();

// Storage setup for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profile"); // save in profile folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique name
  }
});

const uploadProfile = multer({ storage: profileStorage });

// Route to upload profile image
app.post("/upload/profile", uploadProfile.single("image"), (req, res) => {
  res.json({
    success: true,
    url: `/uploads/profile/${req.file.filename}`
  });
});

// Storage setup for menu images
const menuStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/menu"); // save in menu folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const uploadMenu = multer({ storage: menuStorage });

// Route to upload menu image
app.post("/upload/menu", uploadMenu.single("image"), (req, res) => {
  res.json({
    success: true,
    url: `/uploads/menu/${req.file.filename}`
  });
});
