 
 
  function normalizeSkill(skill) {

     return String(skill).trim().toLowerCase();
}

  function scoreSkills(candidateSkills, requiredSkills, weight) {
     const candidateSet = new Set(candidateSkills.map(normalizeSkill));
    const mustHave =  requiredSkills.filter((s) => s.type === "must-have");
     const niceToHave =  requiredSkills.filter((s) => s.type === "nice-to-have");

  
  
    const mustPoints = mustHave.length  === 0 ? 0 : weight * 0.70;
    const niceWeight = weight - mustPoints 
   const niceRatio = niceToHave.length === 0
    ? 1
    : niceToHave.filter((s) => candidateSet.has(normalizeSkill(s.name))).length / niceToHave.length;

   const score =mustHave.length === 0 && niceToHave.length === 0
    ? weight
    : Math.round((mustPoints + niceRatio * niceWeight) * 100) / 100 

   return {

    score,
    max: weight,
    matchedMustHave: mustHave.filter((s) => candidateSet.has(normalizeSkill(s.name))).map((s) => s.name),
    matchedNiceToHave: niceToHave.filter((s) => candidateSet.has(normalizeSkill(s.name))).map((s) => s.name)

    }
}

function scoreExperience(candidateYears, minYears, weight) {

   if (minYears <= 0) return { score: weight, max: weight };

   const ratio = Math.min(candidateYears / minYears, 1);
  return {

    score: Math.round(weight * ratio * 100) / 100,
    max: weight
  }
}



  function scoreLocation(candidateLocation, jobLocation, remoteAllowed, weight) {
    const candidate = normalizeSkill(candidateLocation);
    const job = normalizeSkill(jobLocation);

   if (candidate === job) return { score: weight, max: weight, reason: "exact-match" }

  if (remoteAllowed) return { score: Math.round(weight * 0.67 * 100) / 100, max: weight, reason: "remote" };

    return { score: 0, max: weight, reason: "mismatch" };
}

function scoreSalary(expectedSalary, minSalary, maxSalary, weight) {


  if (expectedSalary <= maxSalary) {

    return { score: weight, max: weight, reason: "meets-expectation" };
  }

  
  const ratio = Math.max(0, Math.min(maxSalary / expectedSalary, 1))

  return {

     score: Math.round(weight * ratio * 100) / 100,
    max: weight,
    reason: ratio === 0 ? "no-overlap" : "below-expectation"
  }
}



function hasAllMustHaveSkills(candidateSkills, requiredSkills) {

  const candidateSet = new Set(candidateSkills.map(normalizeSkill))

  return requiredSkills
    .filter((s) => s.type === "must-have")
    .every((s) => candidateSet.has(normalizeSkill(s.name)))

}



  function calculateJobScore(candidate, job, weights) {

  if (!hasAllMustHaveSkills(candidate.skills, job.requiredSkills)) {
    return null
  }


const skills = scoreSkills(candidate.skills, job.requiredSkills, weights.skills)
 const experience = scoreExperience(candidate.yearsOfExperience, job.minYearsExperience, weights.experience)
  const location = scoreLocation(candidate.location, job.location, job.remoteAllowed, weights.location)
  const salary = scoreSalary(candidate.expectedSalary, job.salaryRange.min, job.salaryRange.max, weights.salary)

  const total = Math.round( 

     (skills.score + experience.score + location.score + salary.score) * 100
  ) / 100;

  return {

        score: total,
        breakdown: {
        skills: { score: skills.score, max: skills.max },
        experience: { score: experience.score, max: experience.max },
        location: { score: location.score, max: location.max, reason: location.reason },
        salary: { score: salary.score, max: salary.max, reason: salary.reason }
    }
  }
}


function calculateCandidateScore(candidate, job, weights) {

      return calculateJobScore(candidate, job, weights)
}

module.exports = {
  normalizeSkill,
  hasAllMustHaveSkills,
  scoreSkills,
  scoreExperience,
  scoreLocation,
  scoreSalary,
  calculateJobScore,
  calculateCandidateScore
}
