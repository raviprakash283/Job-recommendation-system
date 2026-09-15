const weights = {
  skills: Number(process.env.SKILLS_WEIGHT ?? 50),
  experience: Number(process.env.EXPERIENCE_WEIGHT ?? 20),
  location: Number(process.env.LOCATION_WEIGHT ?? 15),
  salary: Number(process.env.SALARY_WEIGHT ?? 15)
};

const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

if (Object.values(weights).some((value) => !Number.isFinite(value) || value < 0) || total !== 100) {
  throw new Error("SKILLS_WEIGHT + EXPERIENCE_WEIGHT + LOCATION_WEIGHT + SALARY_WEIGHT must be valid non-negative numbers totaling 100.");
}

module.exports = { weights }