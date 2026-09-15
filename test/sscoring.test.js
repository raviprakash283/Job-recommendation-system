
 const test = require("node:test");
 const assert = require("node:assert/strict")

    const {
    hasAllMustHaveSkills, scoreExperience, scoreLocation,   scoreSalary,  calculateJobScore
    } = require("../scoring")

const weights = { skills: 50, experience: 20, location: 15, salary: 15 };

    const baseCandidate = {
        skills: ["JavaScript", "Node.js"],
        yearsOfExperience: 3,
        location: "Delhi",
        expectedSalary: 1200000
    }

 const baseJob = {

  title: "Backend Engineer",
   requiredSkills: [
    { name: "JavaScript", type: "must-have" },
    { name: "Node.js", type: "must-have" },
    { name: "PostgreSQL", type: "nice-to-have" }
  ],
    minYearsExperience: 3,
    location: "Delhi",
    salaryRange: { min: 1000000, max: 1500000 },
    remoteAllowed: false
}

test("missing a must-have skill returns no score", () => {

    const candidate = { ...baseCandidate, skills: ["JavaScript"] }
    assert.equal(calculateJobScore(candidate, baseJob, weights), null)
    assert.equal(hasAllMustHaveSkills(candidate.skills, baseJob.requiredSkills), false)
 } )

 
  test("nice-to-have skills boost the score but do not gate the candidate", () => {

    const withoutNice = calculateJobScore(baseCandidate, baseJob, weights);
    const withNice = calculateJobScore(
        { ...baseCandidate, skills: [...baseCandidate.skills, "PostgreSQL"] },
        baseJob,
        weights
    )

    assert.ok(withoutNice)
    assert.ok(withNice)
    assert.ok(withNice.score > withoutNice.score)

  })

test("experience below minimum is penalized instead of excluded", () => {

    const result = scoreExperience(1, 4, 20);
    assert.equal(result.score, 5)
    assert.equal(result.max, 20)

})

test("exact location scores higher than remote", () => {

    assert.equal(scoreLocation("Delhi", "Delhi", false, 15).score, 15)
    assert.equal(scoreLocation("Mumbai", "Delhi", true, 15).score, 10.05);
    assert.equal(scoreLocation("Mumbai", "Delhi", false, 15).score, 0)

})

test("salary inside or above the job max gets full salary points", () => {

    assert.equal(scoreSalary(1200000, 1000000, 1500000, 15).score, 15)
      assert.equal(scoreSalary(900000, 1000000, 1500000, 15).score, 15)

  })

test("salary range entirely below expectation gets partial/near-zero credit", () => {

    assert.equal(scoreSalary(1200000, 500000, 600000, 15).score, 7.5)

    assert.equal(scoreSalary(1200000, 0, 0, 15).score, 0);

})

test("score stays within 0-100", () => {

  const result = calculateJobScore(baseCandidate, baseJob, weights)

   assert.ok(result.score >= 0 && result.score <= 100);

});
