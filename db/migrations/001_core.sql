CREATE TABLE users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK(email = lower(email)),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120), password_hash text NOT NULL,
 is_admin boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE roles (code text PRIMARY KEY);
INSERT INTO roles VALUES ('director'), ('designer'), ('reviewer'), ('approver'), ('viewer');
CREATE TABLE projects (
 id uuid PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
 municipality text NOT NULL, department text NOT NULL, building_use text NOT NULL CHECK(building_use IN ('vivienda','oficinas','comercio','mixto')),
 status text NOT NULL DEFAULT 'borrador' CHECK(status IN ('borrador','en_revision','observado','aprobado','emitido')),
 notes text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
 project_id uuid NOT NULL REFERENCES projects(id), user_id uuid NOT NULL REFERENCES users(id),
 role text NOT NULL REFERENCES roles(code), PRIMARY KEY(project_id,user_id)
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE login_limits (email text PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, reset_at timestamptz NOT NULL);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES users(id), project_id uuid REFERENCES projects(id),
 action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_project_date ON audit_events(project_id,created_at DESC);
CREATE FUNCTION protect_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit events are append-only'; END; $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION protect_audit();
CREATE FUNCTION protect_project_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IN ('aprobado','emitido') THEN RAISE EXCEPTION 'Approved records are immutable'; END IF;
 IF NEW.status <> OLD.status THEN RAISE EXCEPTION 'State transitions require a future reviewed-version workflow'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER project_guard BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION protect_project_state();
