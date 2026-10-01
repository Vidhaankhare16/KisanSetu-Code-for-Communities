/**
 * Central government farmer schemes with deterministic eligibility rules.
 * Rules run in code (never by an LLM) so every channel gives the same, auditable answer
 * with a reason. Amounts are as notified; farmers are always told to verify at enrolment.
 */
import type { EligibilityProfile } from "@/contracts/api";

export interface SchemeResult {
  eligible: boolean;
  reason: string;
}

export interface Scheme {
  id: string;
  name: string;
  ministry: string;
  benefit: string;
  details: string[];
  howToApply: string;
  url: string;
  /** Supports regenerative practices (water saving, soil health, natural farming). */
  regenerative: boolean;
  check: (p: EligibilityProfile) => SchemeResult;
}

const ok = (reason: string): SchemeResult => ({ eligible: true, reason });
const no = (reason: string): SchemeResult => ({ eligible: false, reason });
const HECTARE_IN_ACRES = 2.471;

export const SCHEMES: readonly Scheme[] = [
  {
    id: "pm-kisan",
    name: "PM-KISAN Samman Nidhi",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹6,000 a year as income support, paid in three instalments of ₹2,000.",
    details: [
      "Paid directly to the Aadhaar-seeded bank account.",
      "For landholding farmer families (husband, wife and minor children).",
      "Excluded: income-tax payers, institutional landholders, serving/retired government employees.",
    ],
    howToApply: "Register at pmkisan.gov.in or a Common Service Centre with Aadhaar, bank passbook and land records; complete e-KYC.",
    url: "https://pmkisan.gov.in",
    regenerative: false,
    check: (p) => {
      if (!p.ownsLand) return no("Needs cultivable land recorded in the family's name.");
      if (p.isIncomeTaxPayer) return no("Income-tax payers are excluded.");
      return ok("Landholding farmer family.");
    },
  },
  {
    id: "pmfby",
    name: "Pradhan Mantri Fasal Bima Yojana",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Crop insurance for drought, flood, pests and disease at 2% (kharif) / 1.5% (rabi) premium.",
    details: [
      "Farmer pays 2% of sum insured in kharif, 1.5% in rabi and 5% for commercial/horticultural crops.",
      "Covers prevented sowing, standing-crop loss and post-harvest loss from cyclones and unseasonal rain.",
      "Open to owners, tenants and sharecroppers.",
    ],
    howToApply: "Enrol through your bank, a CSC or pmfby.gov.in before the seasonal cut-off date.",
    url: "https://pmfby.gov.in",
    regenerative: false,
    check: (p) =>
      p.hasKcc
        ? ok("Your KCC bank enrols the notified crop automatically each season (you may opt out).")
        : ok("Open to all farmers including tenants — enrol voluntarily before the cut-off."),
  },
  {
    id: "kcc",
    name: "Kisan Credit Card",
    ministry: "Department of Financial Services / NABARD",
    benefit: "Crop loans up to ₹3 lakh at about 4% effective interest on prompt repayment.",
    details: [
      "Interest subvention brings the effective rate to ~4% when repaid on time.",
      "Collateral-free up to ₹2 lakh.",
      "Also covers dairy, fisheries and animal husbandry.",
    ],
    howToApply: "Apply at any bank branch with land or tenancy records and Aadhaar.",
    url: "https://www.myscheme.gov.in/schemes/kcc",
    regenerative: false,
    check: (p) => {
      if (p.hasKcc) return ok("You already hold a KCC — renew it and use it for this season's inputs.");
      if (!p.ownsLand && !p.isTenant) return no("Needs owned or documented leased/tenanted land.");
      return ok("Cultivating farmer — eligible for a collateral-free crop loan.");
    },
  },
  {
    id: "soil-health-card",
    name: "Soil Health Card",
    ministry: "Department of Agriculture & Farmers Welfare",
    benefit: "Free soil test with crop-wise fertiliser recommendations.",
    details: [
      "Reports N, P, K, pH, EC, organic carbon and micronutrients.",
      "Cuts fertiliser cost by applying only what the soil needs — and makes this app's advice precise.",
    ],
    howToApply: "Ask the nearest Krishi Vigyan Kendra or agriculture office for sampling; results on soilhealth.dac.gov.in.",
    url: "https://soilhealth.dac.gov.in",
    regenerative: true,
    check: () => ok("Available free to every farmer."),
  },
  {
    id: "pmksy-pdmc",
    name: "PMKSY — Per Drop More Crop (drip & sprinkler)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "55% subsidy on drip/sprinkler systems for small & marginal farmers, 45% for others.",
    details: ["Drip cuts irrigation water by 30-50% and usually raises yield.", "Many states top up the central subsidy."],
    howToApply: "Apply on your state's micro-irrigation portal with land papers and a supplier quotation.",
    url: "https://pmksy.gov.in",
    regenerative: true,
    check: (p) => {
      if (!p.ownsLand) return no("The system is installed on owned land (long-lease land in some states).");
      const small = p.landAcres <= 2 * HECTARE_IN_ACRES;
      return ok(`Eligible at the ${small ? "55%" : "45%"} rate as a ${small ? "small/marginal" : "larger"} farmer.`);
    },
  },
  {
    id: "pm-kusum",
    name: "PM-KUSUM (solar pumps)",
    ministry: "Ministry of New & Renewable Energy",
    benefit: "Central (30%) plus state subsidy on standalone solar irrigation pumps.",
    details: [
      "Replaces diesel pumping and cuts irrigation cost to near zero.",
      "The farmer's upfront share is often around 10%, with a bank loan for the rest.",
    ],
    howToApply: "Apply on your state renewable-energy agency or DISCOM portal.",
    url: "https://pmkusum.mnre.gov.in",
    regenerative: true,
    check: (p) => (p.ownsLand ? ok("Farmer with land for the pump.") : no("Needs owned farmland where the pump will be installed.")),
  },
  {
    id: "pkvy",
    name: "Paramparagat Krishi Vikas Yojana (organic clusters)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Support for organic farming in clusters, including direct assistance for organic inputs over 3 years.",
    details: [
      "Farmers organise into clusters and get training, certification (PGS-India) and marketing support.",
      "Part of the per-hectare assistance is paid directly to farmers for organic inputs.",
    ],
    howToApply: "Join a PKVY cluster through your block agriculture office or FPO.",
    url: "https://pgsindia-ncof.gov.in/pkvy/index.aspx",
    regenerative: true,
    check: (p) =>
      p.isFpoMember
        ? ok("As an FPO member you can join or form a PKVY cluster.")
        : ok("Open to farmers who join a cluster — ask the block agriculture office."),
  },
  {
    id: "nmnf",
    name: "National Mission on Natural Farming",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Training by Krishi Sakhis, bio-input resource centres and incentives for natural farming in clusters.",
    details: ["Chemical-free farming with on-farm inputs (jeevamrit, beejamrit, mulching).", "Delivered through clusters with community resource persons."],
    howToApply: "Contact the block agriculture office or KVK to join a natural-farming cluster.",
    url: "https://naturalfarming.dac.gov.in",
    regenerative: true,
    check: () => ok("Open to farmers in notified clusters — willingness to adopt natural farming is the main requirement."),
  },
  {
    id: "nmeo-oilseeds",
    name: "National Mission on Edible Oils — Oilseeds",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Quality seed, training and an assured buyer through oilseed value-chain clusters.",
    details: [
      "Runs 2024-25 to 2030-31 for mustard, groundnut, soybean, sunflower and sesame.",
      "Clusters are managed by FPOs or cooperatives with processor linkage.",
    ],
    howToApply: "Enrol through the FPO or cooperative that manages your area's oilseed cluster.",
    url: "https://nmeo.dac.gov.in",
    regenerative: false,
    check: (p) => {
      if (!p.inOilseedCluster) return no("Your farm is not inside a notified oilseed value-chain cluster.");
      if (!p.isFpoMember) return no("Join the FPO or cooperative that manages the cluster.");
      return ok("FPO member inside an oilseed cluster.");
    },
  },
  {
    id: "trfa",
    name: "Targeting Rice Fallow Areas",
    ministry: "Department of Agriculture — NFSM",
    benefit: "Free/subsidised pulse and oilseed seed minikits for land left fallow after paddy.",
    details: ["Turns post-kharif fallow land into a paying rabi crop using residual moisture."],
    howToApply: "Contact the block agriculture office or your FPO when rabi minikits are announced.",
    url: "https://nfsm.gov.in",
    regenerative: true,
    check: (p) => (p.hasRiceFallow ? ok("You have rice-fallow land.") : no("Only for land left fallow after the kharif paddy harvest.")),
  },
  {
    id: "pm-kmy",
    name: "PM Kisan Maan-Dhan Yojana (pension)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹3,000 a month pension after age 60 for a small monthly contribution (₹55-200).",
    details: ["For small and marginal farmers aged 18-40 at entry; the government matches the contribution."],
    howToApply: "Enrol at a Common Service Centre with Aadhaar and a savings account.",
    url: "https://maandhan.in",
    regenerative: false,
    check: (p) => {
      if (p.landAcres > 2 * HECTARE_IN_ACRES) return no("Only for farmers with up to 2 hectares (≈ 5 acres).");
      if (p.age !== undefined && (p.age < 18 || p.age > 40)) return no("Entry age must be between 18 and 40.");
      return ok(p.age !== undefined ? "Small/marginal farmer within the entry age." : "Small/marginal farmer — eligible if aged 18-40.");
    },
  },
  {
    id: "aif",
    name: "Agriculture Infrastructure Fund",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "3% interest subvention on loans up to ₹2 crore for storage and post-harvest infrastructure.",
    details: ["Funds godowns, cold storage, grading units and primary processing; credit guarantee included."],
    howToApply: "Apply on agriinfra.dac.gov.in with a project report; any scheduled bank can sanction.",
    url: "https://agriinfra.dac.gov.in",
    regenerative: false,
    check: (p) =>
      p.isFpoMember || p.ownsLand
        ? ok(p.isFpoMember ? "FPOs are the strongest applicants." : "Individual farmers can apply with a bankable project.")
        : no("Apply through an FPO or with a farm project to finance."),
  },
];

export interface SchemeMatch {
  scheme: Omit<Scheme, "check">;
  result: SchemeResult;
}

export function evaluateSchemes(profile: EligibilityProfile): SchemeMatch[] {
  return SCHEMES.map(({ check, ...scheme }) => ({ scheme, result: check(profile) })).sort((a, b) => Number(b.result.eligible) - Number(a.result.eligible));
}
