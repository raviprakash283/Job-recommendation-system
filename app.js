

const express =  require("express")
const repository = require("./repository")
const { calculateJobScore, calculateCandidateScore }= require("./scoring") ;
const { weights } = require("./config")

const app = express();
app.use(express.json())

app.use((err, req, res, next) => {

    console.error(err);
    res.status(500).json({ error: "Internal server error" })
})


function positiveInteger(value, fallback) {

  if (value === undefined) return fallback;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) return null

  return parsed
}

 function validateCandidate(body) {

  const  { name, skills, yearsOfExperience, location, expectedSalary } = body

  if (!name || !Array.isArray(skills) || skills.length === 0 ||
       !Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 ||
        !location || !Number.isFinite(expectedSalary) || expectedSalary < 0) {
    return "name, non-empty skills, non-negative yearsOfExperience, location and non-negative expectedSalary are required";
  }

  return  null
}

 function validateJob(body) {

  const { title, requiredSkills, minYearsExperience, location, salaryRange, remoteAllowed } = body

  if (!title || !Array.isArray(requiredSkills) ||
       !Number.isFinite(minYearsExperience) || minYearsExperience < 0 ||
        !location || typeof remoteAllowed !== "boolean" ||
        !salaryRange || !Number.isFinite(salaryRange.min) ||
       !Number.isFinite(salaryRange.max) || salaryRange.min < 0 ||
      salaryRange.max < salaryRange.min) {

    return "title, requiredSkills, non-negative minYearsExperience, location, salaryRange {min,max}, and remoteAllowed are required";
  }

  const validTypes =  new Set(["must-have", "nice-to-have"])

  if (requiredSkills.some((s) => !s || !s.name || !validTypes.has(s.type))) {
     return "each requiredSkills item must contain name and type ('must-have' or 'nice-to-have')";
  }

  return null
}

app.get("/health", async (req, res, next) => {

    try {
        await repository.getCandidate(-1);
        res.json({ status: "ok" });
    } catch (error) {
        next(error);
    }
});

app.post("/candidates", async (req, res, next) => {

    const error = validateCandidate(req.body)

    if (error) return res.status(400).json({ error })
    try {

        res.status(201).json(await repository.createCandidate(req.body));
    } catch (err) {
        next(err);
    }
});

  app.post("/jobs",  async (req, res, next) => {

    const error = validateJob(req.body)

    if (error) return res.status(400).json({ error })

    try {
        res.status(201).json(await repository.createJob(req.body));
    } catch (err) {
        next(err);
    }
});

app.get("/candidates/:id/recommendations", async (req, res, next) => {

  const limit = positiveInteger(req.query.limit, 10)

   if (!limit || limit > 100) return res.status(400).json({ error: "limit must be an integer from 1 to 100" })

  try {

    const candidate = await repository.getCandidate(req.params.id)
      if (!candidate) return res.status(404).json({ error: "Candidate not found" })

    const jobs = await repository.getJobsForCandidate(candidate.id)

    const recommendations =jobs
      .map((job) => {
        const result =  calculateJobScore(candidate, job, weights)
        if (!result) return null;

            return {
            id: job.id,
            title: job.title,
            score: result.score,
            breakdown: result.breakdown
            }
         })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.id - b.id)
        .slice(0, limit);

    res.json({
      candidateId: candidate.id,
      weights,
      recommendations
    })

  } catch (err) {
    next(err);
  }
});

app.get("/jobs/:id/recommendations", async (req, res, next) => {

  const limit = positiveInteger(req.query.limit, 10)
  if (!limit || limit > 100) return res.status(400).json({ error: "limit must be an integer from 1 to 100" })

   try {

    const job = await repository.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" })

    const candidates = await repository.getCandidatesForJob(job.id)

        const recommendations = candidates
        .map((candidate) => {

            const result = calculateCandidateScore(candidate, job, weights);
            return {
            id: candidate.id,
            name: candidate.name,
            score: result.score,
            breakdown: result.breakdown
            }
        })
      .sort((a, b) => b.score - a.score || a.id - b.id)
      .slice(0, limit);

        res.json({
        jobId: job.id,
        weights,
        recommendations
        })

  } catch (err) {
    next(err);
  }
});



module.exports = app;
