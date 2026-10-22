import { demoDoctors, demoHospitals } from "../data/directory.js";

function normalizeFilter(value, maxLength = 80) {
  if (value === undefined) return "";
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

export function searchHospitals(req, res) {
  const city = normalizeFilter(req.query.city);
  const name = normalizeFilter(req.query.name);

  if (city === null || name === null) {
    return res.status(400).json({ message: "Invalid hospital search filters." });
  }

  const cityQuery = city.toLocaleLowerCase();
  const nameQuery = name.toLocaleLowerCase();
  const hospitals = demoHospitals.filter((hospital) => {
    const matchesCity =
      !cityQuery || hospital.city.toLocaleLowerCase().includes(cityQuery);
    const matchesName =
      !nameQuery || hospital.name.toLocaleLowerCase().includes(nameQuery);
    return matchesCity && matchesName;
  });

  return res.status(200).json({
    hospitals,
    count: hospitals.length,
    source: "synthetic-demo-directory",
  });
}

export function getDoctors(req, res) {
  const name = normalizeFilter(req.query.name, 100);
  const specialty = normalizeFilter(req.query.specialty, 100);

  if (name === null || specialty === null) {
    return res.status(400).json({ message: "Invalid doctor search filters." });
  }

  const nameQuery = name.toLocaleLowerCase();
  const specialtyQuery = specialty.toLocaleLowerCase();
  const doctors = demoDoctors.filter((doctor) => {
    const matchesName =
      !nameQuery || doctor.name.toLocaleLowerCase().includes(nameQuery);
    const matchesSpecialty =
      !specialtyQuery ||
      doctor.specialty.toLocaleLowerCase().includes(specialtyQuery);
    return matchesName && matchesSpecialty;
  });

  return res.status(200).json({
    doctors,
    count: doctors.length,
    source: "synthetic-demo-directory",
  });
}
