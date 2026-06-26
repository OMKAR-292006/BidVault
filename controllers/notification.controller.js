const db = require('../config/db');

// Get all notifications for user
const getNotifications = async (req, res) => {
    try {
        const user_id = req.user.id;

        const [notifications] = await db.query(
            `SELECT n.*, a.title AS auction_title, a.image_url AS auction_image
             FROM notifications n
             LEFT JOIN auction_items a ON n.auction_id = a.id
             WHERE n.user_id = ?
             ORDER BY n.created_at DESC`,
            [user_id]
        );

        res.json({ count: notifications.length, notifications });
    } catch (err) {
        console.error('getNotifications error:', err);
        res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
};

// Mark single notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, user_id]
        );

        res.json({ message: 'Notification marked as read.' });
    } catch (err) {
        console.error('markAsRead error:', err);
        res.status(500).json({ error: 'Failed to update notification.' });
    }
};

// Mark all notifications as read
const markAllRead = async (req, res) => {
    try {
        const user_id = req.user.id;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [user_id]
        );

        res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('markAllRead error:', err);
        res.status(500).json({ error: 'Failed to update notifications.' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllRead
};
