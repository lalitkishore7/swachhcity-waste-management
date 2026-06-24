-- ========================================
-- SwachhCity MySQL Database Schema
-- ========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS swachhcity_db;
USE swachhcity_db;

-- ========================================
-- Table 1: Users (Citizens, Workers, Admins)
-- ========================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    role ENUM('citizen', 'worker', 'admin') DEFAULT 'citizen',
    profile_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 2: User Locations
-- ========================================
CREATE TABLE user_locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address VARCHAR(500),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_lat_lng (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 3: Workers (Extended profile for workers)
-- ========================================
CREATE TABLE workers (
    worker_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    worker_code VARCHAR(20) UNIQUE NOT NULL,
    assigned_area_name VARCHAR(200),
    assigned_area_polygon JSON, -- Store area boundaries as GeoJSON
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT TRUE,
    tasks_completed INT DEFAULT 0,
    tasks_pending INT DEFAULT 0,
    average_response_time_minutes INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    joined_date DATE NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_available (is_available),
    INDEX idx_current_location (current_latitude, current_longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 4: Complaints
-- ========================================
CREATE TABLE complaints (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., "SWCH-2025-00001"
    user_id INT,
    image_url VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address VARCHAR(500),
    landmark VARCHAR(200),
    city VARCHAR(100),
    pincode VARCHAR(10),
    
    -- ML Detection Results
    garbage_detected BOOLEAN DEFAULT FALSE,
    detection_confidence DECIMAL(5, 2), -- 0.00 to 100.00
    severity_score INT CHECK (severity_score BETWEEN 0 AND 10),
    garbage_type ENUM('plastic', 'organic', 'metal', 'glass', 'e-waste', 'mixed', 'other'),
    estimated_quantity ENUM('small', 'medium', 'large', 'very_large'),
    
    -- Priority & Status
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('pending', 'verified', 'assigned', 'in_progress', 'completed', 'rejected') DEFAULT 'pending',
    
    -- Assignment Details
    assigned_worker_id INT,
    assigned_at TIMESTAMP NULL,
    
    -- Completion Details
    completed_at TIMESTAMP NULL,
    after_cleanup_image_url VARCHAR(500),
    worker_notes TEXT,
    
    -- User Feedback
    user_rating INT CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    verification_time TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_worker_id) REFERENCES workers(worker_id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_worker_id (assigned_worker_id),
    INDEX idx_created_at (created_at),
    INDEX idx_location (latitude, longitude),
    INDEX idx_complaint_number (complaint_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 5: ML Detection Details (Detailed detection results)
-- ========================================
CREATE TABLE ml_detection_details (
    detection_id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT UNIQUE NOT NULL,
    model_version VARCHAR(50) NOT NULL, -- e.g., "YOLOv8-v1.0"
    processing_time_ms INT, -- Milliseconds
    detected_objects JSON, -- Array of detected objects with bounding boxes
    raw_prediction_data JSON, -- Full ML model output
    detection_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    INDEX idx_complaint_id (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 6: Complaint Status History (Audit trail)
-- ========================================
CREATE TABLE complaint_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id INT,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_complaint_id (complaint_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 7: Worker Assignments History
-- ========================================
CREATE TABLE worker_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    worker_id INT NOT NULL,
    assigned_by_user_id INT, -- Admin who assigned, NULL if auto-assigned
    assignment_type ENUM('auto', 'manual') DEFAULT 'auto',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    response_time_minutes INT, -- Time from assignment to acceptance
    completion_time_minutes INT, -- Time from acceptance to completion
    
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_complaint_id (complaint_id),
    INDEX idx_worker_id (worker_id),
    INDEX idx_assigned_at (assigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 8: Notifications
-- ========================================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('complaint_submitted', 'complaint_verified', 'worker_assigned', 
              'task_completed', 'system_alert', 'rating_received') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_complaint_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 9: Hotspot Predictions
-- ========================================
CREATE TABLE hotspot_predictions (
    hotspot_id INT AUTO_INCREMENT PRIMARY KEY,
    area_name VARCHAR(200),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    prediction_score DECIMAL(5, 2) NOT NULL, -- 0.00 to 100.00
    predicted_complaints_count INT,
    prediction_period_start DATE NOT NULL,
    prediction_period_end DATE NOT NULL,
    historical_complaint_count INT DEFAULT 0,
    population_density INT,
    area_type ENUM('residential', 'commercial', 'industrial', 'mixed'),
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_location (latitude, longitude),
    INDEX idx_prediction_period (prediction_period_start, prediction_period_end),
    INDEX idx_prediction_score (prediction_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 10: Analytics Dashboard Data (Pre-computed metrics)
-- ========================================
CREATE TABLE dashboard_analytics (
    analytics_id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    
    -- Complaint Metrics
    total_complaints INT DEFAULT 0,
    pending_complaints INT DEFAULT 0,
    verified_complaints INT DEFAULT 0,
    assigned_complaints INT DEFAULT 0,
    completed_complaints INT DEFAULT 0,
    rejected_complaints INT DEFAULT 0,
    
    -- Worker Metrics
    active_workers INT DEFAULT 0,
    average_response_time_minutes INT DEFAULT 0,
    average_completion_time_minutes INT DEFAULT 0,
    
    -- Garbage Type Distribution
    plastic_count INT DEFAULT 0,
    organic_count INT DEFAULT 0,
    metal_count INT DEFAULT 0,
    glass_count INT DEFAULT 0,
    ewaste_count INT DEFAULT 0,
    mixed_count INT DEFAULT 0,
    
    -- Priority Distribution
    low_priority_count INT DEFAULT 0,
    medium_priority_count INT DEFAULT 0,
    high_priority_count INT DEFAULT 0,
    critical_priority_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_date (date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 11: System Settings
-- ========================================
CREATE TABLE system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(500),
    updated_by_user_id INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table 12: Audit Logs (Track all important actions)
-- ========================================
CREATE TABLE audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'complaint', 'user', 'worker', etc.
    entity_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Indexes for Performance Optimization
-- ========================================

-- Geospatial index for location-based queries
CREATE INDEX idx_complaints_location ON complaints(latitude, longitude);
CREATE INDEX idx_workers_location ON workers(current_latitude, current_longitude);

-- Composite indexes for common queries
CREATE INDEX idx_complaints_status_priority ON complaints(status, priority);
CREATE INDEX idx_complaints_user_status ON complaints(user_id, status);
CREATE INDEX idx_complaints_worker_status ON complaints(assigned_worker_id, status);

-- ========================================
-- Sample Data Insertion
-- ========================================

-- Insert admin user
INSERT INTO users (name, email, password_hash, phone, role) VALUES
('Admin User', 'admin@swachhcity.com', '$2b$10$abcdefghijklmnopqrstuv', '9999999999', 'admin');

-- Insert sample workers
INSERT INTO users (name, email, password_hash, phone, role) VALUES
('Rajesh Kumar', 'rajesh@swachhcity.com', '$2b$10$abcdefghijklmnopqrstuv', '9876543210', 'worker'),
('Priya Sharma', 'priya@swachhcity.com', '$2b$10$abcdefghijklmnopqrstuv', '9876543211', 'worker');

-- Insert sample citizens
INSERT INTO users (name, email, password_hash, phone, role) VALUES
('Amit Patel', 'amit@example.com', '$2b$10$abcdefghijklmnopqrstuv', '9876543212', 'citizen'),
('Sneha Reddy', 'sneha@example.com', '$2b$10$abcdefghijklmnopqrstuv', '9876543213', 'citizen');

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_auto_assignment_distance_km', '5', 'Maximum distance in KM for auto-assigning workers'),
('min_detection_confidence', '60', 'Minimum confidence percentage for garbage detection'),
('default_priority_threshold_low', '3', 'Severity score threshold for low priority'),
('default_priority_threshold_medium', '6', 'Severity score threshold for medium priority'),
('default_priority_threshold_high', '8', 'Severity score threshold for high priority');

-- ========================================
-- Stored Procedures
-- ========================================

-- Procedure to calculate worker performance
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS calculate_worker_performance(IN worker_id_param INT)
BEGIN
    UPDATE workers w
    SET 
        tasks_completed = (
            SELECT COUNT(*) 
            FROM worker_assignments 
            WHERE worker_id = worker_id_param 
            AND completed_at IS NOT NULL
        ),
        tasks_pending = (
            SELECT COUNT(*) 
            FROM complaints 
            WHERE assigned_worker_id = worker_id_param 
            AND status IN ('assigned', 'in_progress')
        ),
        average_response_time_minutes = (
            SELECT AVG(response_time_minutes) 
            FROM worker_assignments 
            WHERE worker_id = worker_id_param 
            AND response_time_minutes IS NOT NULL
        )
    WHERE w.worker_id = worker_id_param;
END //
DELIMITER ;

-- Procedure to get dashboard statistics
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS get_dashboard_stats(IN date_param DATE)
BEGIN
    SELECT 
        COUNT(*) as total_complaints,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_complaints,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_complaints,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_complaints,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_complaints,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_complaints,
        SUM(CASE WHEN garbage_type = 'plastic' THEN 1 ELSE 0 END) as plastic_count,
        SUM(CASE WHEN garbage_type = 'organic' THEN 1 ELSE 0 END) as organic_count
    FROM complaints
    WHERE DATE(created_at) = date_param;
END //
DELIMITER ;

-- ========================================
-- Views for Common Queries
-- ========================================

-- View: Active complaints with worker details
CREATE OR REPLACE VIEW active_complaints_view AS
SELECT 
    c.complaint_id,
    c.complaint_number,
    c.status,
    c.priority,
    c.severity_score,
    c.garbage_type,
    c.address,
    c.created_at,
    u.name as citizen_name,
    u.email as citizen_email,
    w.worker_code,
    wu.name as worker_name
FROM complaints c
JOIN users u ON c.user_id = u.user_id
LEFT JOIN workers w ON c.assigned_worker_id = w.worker_id
LEFT JOIN users wu ON w.user_id = wu.user_id
WHERE c.status IN ('pending', 'verified', 'assigned', 'in_progress');

-- View: Worker performance summary
CREATE OR REPLACE VIEW worker_performance_view AS
SELECT 
    w.worker_id,
    w.worker_code,
    u.name as worker_name,
    w.tasks_completed,
    w.tasks_pending,
    w.average_response_time_minutes,
    w.rating,
    w.total_ratings,
    w.is_available
FROM workers w
JOIN users u ON w.user_id = u.user_id;

-- ========================================
-- Triggers
-- ========================================

-- Trigger: Auto-generate complaint number
DELIMITER //
DROP TRIGGER IF EXISTS generate_complaint_number //
CREATE TRIGGER generate_complaint_number
BEFORE INSERT ON complaints
FOR EACH ROW
BEGIN
    DECLARE next_number INT;
    SET next_number = (SELECT COALESCE(MAX(CAST(SUBSTRING(complaint_number, 11) AS UNSIGNED)), 0) + 1 
                       FROM complaints 
                       WHERE complaint_number LIKE CONCAT('SWCH-', YEAR(CURDATE()), '-%'));
    SET NEW.complaint_number = CONCAT('SWCH-', YEAR(CURDATE()), '-', LPAD(next_number, 5, '0'));
END //
DELIMITER ;

-- Trigger: Update complaint status history
DELIMITER //
DROP TRIGGER IF EXISTS track_status_change //
CREATE TRIGGER track_status_change
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO complaint_status_history (complaint_id, previous_status, new_status, changed_at)
        VALUES (NEW.complaint_id, OLD.status, NEW.status, NOW());
    END IF;
END //
DELIMITER ;

-- ========================================
-- End of Schema
-- ========================================
