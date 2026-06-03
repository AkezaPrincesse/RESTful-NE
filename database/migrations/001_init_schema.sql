-- FEMS Database Schema
-- Fire Extinguisher Management System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'inspector', 'user')),
    phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    first_login BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
    created_by UUID,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fire Extinguishers table
CREATE TABLE IF NOT EXISTS extinguishers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Water', 'CO2', 'Foam', 'Dry Chemical')),
    size VARCHAR(20) NOT NULL CHECK (size IN ('2.5 lbs', '5 lbs', '9 lbs', '12 lbs')),
    installation_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Expired', 'Under Maintenance', 'Decommissioned')),
    last_inspection_date DATE,
    next_inspection_date DATE,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    notes TEXT,
    registered_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extinguisher_id UUID NOT NULL REFERENCES extinguishers(id) ON DELETE CASCADE,
    scheduled_by UUID NOT NULL REFERENCES users(id),
    assigned_inspector UUID REFERENCES users(id),
    scheduled_date TIMESTAMP NOT NULL,
    inspection_type VARCHAR(50) DEFAULT 'routine' CHECK (inspection_type IN ('routine', 'emergency', 'annual', 'monthly')),
    status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    notes TEXT,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extinguisher_id UUID NOT NULL REFERENCES extinguishers(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES inspections(id),
    performed_by UUID NOT NULL REFERENCES users(id),
    action_taken TEXT NOT NULL,
    action_date DATE NOT NULL,
    conditions_noted TEXT,
    pressure_reading DECIMAL(5,2),
    weight_reading DECIMAL(5,2),
    seal_intact BOOLEAN,
    pin_intact BOOLEAN,
    label_readable BOOLEAN,
    physical_damage BOOLEAN DEFAULT false,
    result VARCHAR(30) DEFAULT 'pass' CHECK (result IN ('pass', 'fail', 'needs_attention')),
    next_service_date DATE,
    cost DECIMAL(10,2),
    parts_replaced TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'success')),
    is_read BOOLEAN DEFAULT false,
    related_entity VARCHAR(50),
    related_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extinguishers_status ON extinguishers(status);
CREATE INDEX IF NOT EXISTS idx_extinguishers_expiry ON extinguishers(expiry_date);
CREATE INDEX IF NOT EXISTS idx_extinguishers_location ON extinguishers(location);
CREATE INDEX IF NOT EXISTS idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_extinguisher ON inspections(extinguisher_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_extinguisher ON maintenance_logs(extinguisher_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_logs(action_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_extinguishers_updated_at BEFORE UPDATE ON extinguishers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
