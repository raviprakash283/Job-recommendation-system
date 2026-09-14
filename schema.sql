

 CREATE TABLE IF NOT EXISTS candidates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL ,
  years_of_experience NUMERIC(5,2)  NOT NULL CHECK (years_of_experience >= 0),
  location TEXT NOT NULL,
  expected_salary  NUMERIC(14,2) NOT NULL  CHECK (expected_salary >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

   CREATE TABLE IF NOT EXISTS candidate_skills (
    candidate_id BIGINT NOT NULL REFERENCES  candidates(id) ON DELETE CASCADE,
    skill TEXT NOT NULL CHECK  (length(trim(skill)) > 0),
    PRIMARY KEY  (candidate_id, skill)
  );

 CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
   min_years_experience   NUMERIC(5,2) NOT NULL CHECK (min_years_experience >= 0),
  location TEXT NOT NULL,
   salary_min NUMERIC(14,2) NOT NULL  CHECK (salary_min >= 0),
  salary_max NUMERIC(14,2) NOT NULL CHECK (salary_max >= salary_min),
  remote_allowed  BOOLEAN NOT NULL  DEFAULT FALSE,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

 CREATE TABLE IF NOT EXISTS job_skills (
   id BIGSERIAL PRIMARY KEY ,
   job_id BIGINT NOT NULL  REFERENCES jobs(id) ON DELETE CASCADE,
   skill TEXT NOT NULL CHECK  (length(trim(skill)) > 0),
   requirement_type  TEXT  NOT NULL CHECK (requirement_type IN ('must-have', 'nice-to-have')),
   UNIQUE (job_id, skill)
);

  
