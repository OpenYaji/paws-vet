-- Add is_read column to notification_logs table to track read status
ALTER TABLE notification_logs
ADD COLUMN is_read BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance when filtering unread notifications
CREATE INDEX idx_notifications_is_read ON notification_logs(recipient_id, is_read)
WHERE is_read = FALSE;
