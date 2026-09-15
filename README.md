# Job Recommendation  API

A transparent, rule-based job recommendation API built with Node.js, Express, JavaScript and PostgreSQL.

## Features

- Create candidate profiles.
- Create job postings.
- Rank jobs for a candidate.
- Filter jobs when a must-have skill is missing.
- Prefer exact location, then remote, then mismatch.
- Score salary fit transparently.
- Configurable scoring weights through environment variables.
- Bonus reverse view: rank candidates for a job.
- PostgreSQL transactions and parameterized SQL.
- Unit tests focused on scoring edge cases.
- Docker Compose setup for API + PostgreSQL.

---

## Run locally

Requirements:

- Node.js 
- PostgreSQL 

```bash
git clone   https://github.com/raviprakash283/Job-recommendation-system
cd job-recommendation
npm install
```

Create a database, then run:

```bash
psql "$DATABASE_URL" -f schema.sql
```

Example environment:

```bash
cp .env.example .env
```

Set `DATABASE_URL`, then:

```bash
npm start
```

API runs on `http://localhost:3000`.

Run tests:

```bash
npm test
```

### Docker

```bash
docker compose up --build
```

The API will be available at `http://localhost:3000`.

---

# Scoring formula

This is the most important design decision in the project.

The default weights are:

 Dimension | Weight 
      ---|---
  Skills | 50 
  Experience | 20 
  Location | 15 
  Salary | 15 
 **Total** | **100** 

I gave skills the largest weight because a candidate who cannot satisfy a core technical requirement is generally not a good fit, even if salary and location look attractive. Experience is the second-largest factor because it affects seniority and the amount of ramp-up required. Location and salary are important, but I intentionally keep them below job capability.

The weights are configurable using:

```text
SKILLS_WEIGHT=50
EXPERIENCE_WEIGHT=20
LOCATION_WEIGHT=15
SALARY_WEIGHT=15
```

They must total 100.






# API

## Create candidate

`POST /candidates`

```json
{
  "name": "Ravi",
  "skills": ["JavaScript", "Node.js", "PostgreSQL"],
  "yearsOfExperience": 3,
  "location": "Delhi",
  "expectedSalary": 1200000
}
```

## Create job

`POST /jobs`

```json
{
  "title": "Backend Engineer",
  "requiredSkills": [
    { "name": "Node.js", "type": "must-have" },
    { "name": "PostgreSQL", "type": "must-have" },
    { "name": "Redis", "type": "nice-to-have" }
  ],
  "minYearsExperience": 3,
  "location": "Delhi",
  "salaryRange": {
    "min": 1000000,
    "max": 1500000
  },
  "remoteAllowed": false
}
```

## Recommendations

`GET /candidates/:id/recommendations?limit=5`

Example response:

```json
{
  "candidateId": 1,
  "weights": {
    "skills": 50,
    "experience": 20,
    "location": 15,
    "salary": 15
  },
  "recommendations": [
    {
      "id": 7,
      "title": "Backend Engineer",
      "score": 92.5,
      "breakdown": {
        "skills": { "score": 42.5, "max": 50 },
        "experience": { "score": 20, "max": 20 },
        "location": {
          "score": 15,
          "max": 15,
          "reason": "exact-match"
        },
        "salary": {
          "score": 15,
          "max": 15,
          "reason": "meets-expectation"
        }
      }
    }
  ]
}
```

`limit` defaults to 10 and accepts values from 1 to 100.

## Reverse view — bonus

`GET /jobs/:id/recommendations?limit=5`

This ranks candidates against a specific job using the same transparent scorer and the same must-have gate.

---

# Database design

I intentionally did not store skills as a JSON array.

Instead:

```text
candidates
    |
    +--- candidate_skills

jobs
    |
    +--- job_skills
```

This makes skill matching queryable and indexable in PostgreSQL.


The recommendation query uses a `NOT EXISTS` anti-join to enforce the must-have gate in the database.

All application SQL uses PostgreSQL parameter placeholders (`$1`, `$2`, ...) to avoid SQL injection.

---

# Assumptions

1. Skill matching is case-insensitive and whitespace-trimmed.
2. Skills are treated as exact names. `Node.js` and `Node` are different skills.
3. Salary is assumed to be in one common currency and represented as an annual numeric value.
4. Candidate expected salary is treated as a minimum acceptable salary.
5. Exact location means case-insensitive string equality.
6. There is no authentication because it is explicitly out of scope.


---

# What I would improve with more time

- Add pagination  for large recommendation sets.
- Add more granular location matching: city, metro, country and timezone.
- Model salary currency and compensation components.
- Add candidate preferred locations rather than one location

---




