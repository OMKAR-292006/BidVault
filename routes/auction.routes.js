const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// ── Cloudinary config ─────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Multer storage → Cloudinary ───────────────
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'bidvault',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 1200, crop: 'limit' }]
    }
});

const upload = multer({ storage });

const {
    getAllAuctions,
    getAuctionById,
    createAuction,
    updateAuction,
    deleteAuction,
    getAuctionBids
} = require('../controllers/auction.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validateAuction } = require('../middleware/validate.middleware');

router.get('/', getAllAuctions);              // GET    /api/auctions
router.get('/:id', getAuctionById);              // GET    /api/auctions/1
router.get('/:id/bids', getAuctionBids);              // GET    /api/auctions/1/bids
router.post('/', verifyToken, upload.single('image'), validateAuction, createAuction);  // POST   /api/auctions
router.put('/:id', verifyToken, upload.single('image'), validateAuction, updateAuction);  // PUT    /api/auctions/1
router.delete('/:id', verifyToken, deleteAuction);  // DELETE /api/auctions/1

module.exports = router;
