-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fonction updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table persons
CREATE TABLE IF NOT EXISTS persons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    birth_date  DATE,
    death_date  DATE,
    birth_place VARCHAR(200),
    profession  VARCHAR(200),
    bio         TEXT,
    photo_url   TEXT,
    gender      VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS persons_updated_at ON persons;
CREATE TRIGGER persons_updated_at
    BEFORE UPDATE ON persons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table marriages (N mariages possibles par personne)
CREATE TABLE IF NOT EXISTS marriages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spouse1_id  UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    spouse2_id  UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    start_date  DATE,
    end_date    DATE,
    end_reason  VARCHAR(20) CHECK (end_reason IN ('death', 'divorce', 'separation')),
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_marriage CHECK (spouse1_id != spouse2_id)
);

-- Table parent_child
CREATE TABLE IF NOT EXISTS parent_child (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id         UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    child_id          UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'biological' CHECK (relationship_type IN ('biological', 'adoptive')),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, child_id),
    CONSTRAINT no_self_parent CHECK (parent_id != child_id)
);

-- Table attachments (pièces jointes)
CREATE TABLE IF NOT EXISTS attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id   UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    file_name   VARCHAR(500) NOT NULL,
    file_type   VARCHAR(100),
    file_size   BIGINT,
    storage_key TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index full-text search sur les noms (français)
CREATE INDEX IF NOT EXISTS idx_persons_fts
    ON persons USING gin(to_tsvector('french', first_name || ' ' || last_name));

CREATE INDEX IF NOT EXISTS idx_marriages_s1 ON marriages(spouse1_id);
CREATE INDEX IF NOT EXISTS idx_marriages_s2 ON marriages(spouse2_id);
CREATE INDEX IF NOT EXISTS idx_parent_parent ON parent_child(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child  ON parent_child(child_id);
CREATE INDEX IF NOT EXISTS idx_attach_person ON attachments(person_id);
