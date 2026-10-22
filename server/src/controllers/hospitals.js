import { demoHospitals } from "../data/directory.js";
import { normalizeFilter } from "../utils/directoryFilters.js";

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
