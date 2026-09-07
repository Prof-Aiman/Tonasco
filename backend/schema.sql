CREATE TABLE IF NOT EXISTS jigs (
  id BIGSERIAL PRIMARY KEY,
  jig_code VARCHAR(80) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  machine VARCHAR(120),
  location VARCHAR(160),
  status VARCHAR(30) NOT NULL DEFAULT 'Available'
    CHECK (status IN ('Available', 'In Use', 'Maintenance', 'Overdue')),
  rfid_uid VARCHAR(120) UNIQUE,
  qr_code VARCHAR(160) UNIQUE,
  last_inspection DATE,
  next_inspection DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jigs_status ON jigs(status);
CREATE INDEX IF NOT EXISTS idx_jigs_location ON jigs(location);
CREATE INDEX IF NOT EXISTS idx_jigs_machine ON jigs(machine);

CREATE TABLE IF NOT EXISTS jig_movements (
  id BIGSERIAL PRIMARY KEY,
  jig_id BIGINT NOT NULL REFERENCES jigs(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL
    CHECK (movement_type IN ('CHECK_OUT', 'RETURN', 'TRANSFER')),
  employee_id VARCHAR(80) NOT NULL,
  employee_name VARCHAR(160) NOT NULL,
  machine VARCHAR(120),
  location VARCHAR(160),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jig_movements_jig ON jig_movements(jig_id);
CREATE INDEX IF NOT EXISTS idx_jig_movements_created ON jig_movements(created_at DESC);

CREATE TABLE IF NOT EXISTS jig_maintenance (
  id BIGSERIAL PRIMARY KEY,
  jig_id BIGINT NOT NULL REFERENCES jigs(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(160),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jig_maintenance_jig ON jig_maintenance(jig_id);
CREATE INDEX IF NOT EXISTS idx_jig_maintenance_status ON jig_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_jig_maintenance_due ON jig_maintenance(due_date);

-- Starter sample records. Safe to run more than once.
INSERT INTO jigs
  (jig_code, description, machine, location, status, last_inspection, next_inspection)
VALUES
  ('JIG-CNC-001', 'Housing Drilling Jig', 'A500Z', 'Rack A-01', 'Available', '2026-08-15', '2026-11-15'),
  ('JIG-CNC-002', 'Datum Checking Fixture', 'NTX1000', 'Machine Area', 'In Use', '2026-08-10', '2026-11-10'),
  ('JIG-WLD-018', 'Welding Assembly Fixture', 'Welding 02', 'Rack B-05', 'Maintenance', '2026-08-02', '2026-09-02'),
  ('JIG-INS-012', 'CMM Inspection Fixture', 'CMM', 'Inspection Room', 'Available', '2026-08-18', '2026-11-18'),
  ('JIG-MIL-034', 'Milling Support Fixture', 'DA300', 'Production Line 1', 'Overdue', '2026-07-18', '2026-08-18')
ON CONFLICT (jig_code) DO NOTHING;
