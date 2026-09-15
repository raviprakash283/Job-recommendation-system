const db = require("./db");

async function createCandidate({
  name,
  skills,
  yearsOfExperience,
  location,
  expectedSalary
}) {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");  // start

    const result = await client.query(
      `INSERT INTO candidates
        (name, years_of_experience, location, expected_salary)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         name,
         years_of_experience AS "yearsOfExperience",
         location,
         expected_salary AS "expectedSalary"`,
      [name, yearsOfExperience, location, expectedSalary]
    );

    const candidate = result.rows[0];

    //  ONE query
    await client.query(
      `INSERT INTO candidate_skills (candidate_id, skill)
       SELECT $1, lower(trim(skill))
       FROM unnest($2::text[]) AS skill
       ON CONFLICT (candidate_id, skill) DO NOTHING`,
      [candidate.id, skills]
    );

    await client.query("COMMIT");

    return {
      ...candidate,
      skills: skills.map((s) => s.trim().toLowerCase())
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createJob({
  title,
  requiredSkills,
  minYearsExperience,
  location,
  salaryRange,
  remoteAllowed
}) {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create job
    const result = await client.query(
      `
      INSERT INTO jobs (
        title,
        min_years_experience,
        location,
        salary_min,
        salary_max,
        remote_allowed
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        title,
        min_years_experience AS "minYearsExperience",
        location,
        salary_min AS "salaryMin",
        salary_max AS "salaryMax",
        remote_allowed AS "remoteAllowed"
      `,
      [
        title,
        minYearsExperience,
        location,
        salaryRange.min,
        salaryRange.max,
        remoteAllowed
      ]
    );

    const job = result.rows[0];

    // 2. Insert ALL skills in one query
    if (requiredSkills.length > 0) {
      const values = [];
      const placeholders = [];

      requiredSkills.forEach((skill, index) => {
        const base = index * 3;

        placeholders.push(
          `($${base + 1}, lower(trim($${base + 2})), $${base + 3})`
        );

        values.push(
          job.id,
          skill.name,
          skill.type
        );
      });

      await client.query(
        `
        INSERT INTO job_skills (
          job_id,
          skill,
          requirement_type
        )
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (job_id, skill)
        DO UPDATE SET
          requirement_type = EXCLUDED.requirement_type
        `,
        values
      );
    }

    await client.query("COMMIT");

    return {
      id: job.id,
      title: job.title,
      minYearsExperience: Number(job.minYearsExperience),
      location: job.location,
      salaryRange: {
        min: Number(job.salaryMin),
        max: Number(job.salaryMax)
      },
      remoteAllowed: job.remoteAllowed,
      requiredSkills: requiredSkills.map((s) => ({
        name: s.name.trim().toLowerCase(),
        type: s.type
      }))
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getCandidate(id) {
  const result = await db.query(
    `SELECT c.id, c.name, c.years_of_experience AS "yearsOfExperience",
            c.location, c.expected_salary AS "expectedSalary",
            COALESCE(array_agg(cs.skill) FILTER (WHERE cs.skill IS NOT NULL), '{}') AS skills
     FROM candidates c
     LEFT JOIN candidate_skills cs ON cs.candidate_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    yearsOfExperience: Number(row.yearsOfExperience),
    expectedSalary: Number(row.expectedSalary),
    skills: row.skills
  };
}

async function getJobsForCandidate(candidateId) {
  // 
  // 
  const result = await db.query(
    `SELECT j.id, j.title, j.min_years_experience AS "minYearsExperience",
            j.location, j.salary_min AS "salaryMin", j.salary_max AS "salaryMax",
            j.remote_allowed AS "remoteAllowed",
            COALESCE(
              json_agg(
                json_build_object(
                  'name', js.skill,
                  'type', js.requirement_type
                )
              ) FILTER (WHERE js.id IS NOT NULL), '[]'
            ) AS "requiredSkills"
     FROM jobs j
     LEFT JOIN job_skills js ON js.job_id = j.id
     WHERE NOT EXISTS (
       SELECT 1
       FROM job_skills required
       WHERE required.job_id = j.id
         AND required.requirement_type = 'must-have'
         AND NOT EXISTS (
           SELECT 1
           FROM candidate_skills owned
           WHERE owned.candidate_id = $1
             AND owned.skill = required.skill
         )
     )
     GROUP BY j.id
     ORDER BY j.id`,
    [candidateId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    minYearsExperience: Number(row.minYearsExperience),
    location: row.location,
    salaryRange: { min: Number(row.salaryMin), max: Number(row.salaryMax) },
    remoteAllowed: row.remoteAllowed,
    requiredSkills: row.requiredSkills
  }));
}

async function getJob(id) {
  const result = await db.query(
    `SELECT j.id, j.title, j.min_years_experience AS "minYearsExperience",
            j.location, j.salary_min AS "salaryMin", j.salary_max AS "salaryMax",
            j.remote_allowed AS "remoteAllowed",
            COALESCE(
              json_agg(
                json_build_object('name', js.skill, 'type', js.requirement_type)
              ) FILTER (WHERE js.id IS NOT NULL), '[]'
            ) AS "requiredSkills"
     FROM jobs j
     LEFT JOIN job_skills js ON js.job_id = j.id
     WHERE j.id = $1
     GROUP BY j.id`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    minYearsExperience: Number(row.minYearsExperience),
    location: row.location,
    salaryRange: { min: Number(row.salaryMin), max: Number(row.salaryMax) },
    remoteAllowed: row.remoteAllowed,
    requiredSkills: row.requiredSkills
  };
}

async function getCandidatesForJob(jobId) {
  // 
  const result = await db.query(
    `SELECT c.id, c.name, c.years_of_experience AS "yearsOfExperience",
            c.location, c.expected_salary AS "expectedSalary",
            COALESCE(array_agg(cs.skill) FILTER (WHERE cs.skill IS NOT NULL), '{}') AS skills
     FROM candidates c
     LEFT JOIN candidate_skills cs ON cs.candidate_id = c.id
     WHERE NOT EXISTS (
       SELECT 1
       FROM job_skills required
       WHERE required.job_id = $1
         AND required.requirement_type = 'must-have'
         AND NOT EXISTS (
           SELECT 1 FROM candidate_skills owned
           WHERE owned.candidate_id = c.id
             AND owned.skill = required.skill
         )
     )
     GROUP BY c.id
     ORDER BY c.id`,
    [jobId]
  );
  return result.rows.map((row) => ({
    ...row,
    yearsOfExperience: Number(row.yearsOfExperience),
    expectedSalary: Number(row.expectedSalary)
  }));
}

module.exports = {
  createCandidate,
  createJob,
  getCandidate,
  getJobsForCandidate,
  getJob,
  getCandidatesForJob
};
