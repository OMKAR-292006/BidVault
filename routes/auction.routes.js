const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'auction-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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
