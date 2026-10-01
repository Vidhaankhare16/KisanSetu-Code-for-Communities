# The KisanSetu crop model

The crop model is the part of KisanSetu that makes the numbers: season length, water use, stress,
yield and money. It is deterministic, dependency-free TypeScript in [`src/domain`](../src/domain), so
it can be audited line by line, unit-tested, and reused by any state system through the API.
Gemini never computes these numbers; it explains them.

## 1. Inputs

| Input                            | Source                                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daily weather for the season     | Open-Meteo 16-day forecast, then NASA POWER daily data for the same calendar days of each of the last 10 complete years (one ensemble member per year)                     |
| Reference evapotranspiration ET0 | Open-Meteo FAO ET0 for forecast days; FAO-56 Penman-Monteith from NASA POWER Tmax, Tmin, RH, wind and CERES radiation for historical days (Hargreaves when any is missing) |
| Soil texture and hydraulics      | Farmer's choice → ISRIC SoilGrids 250 m (sand/clay → USDA class) → state dominant texture; field capacity and wilting point from FAO-56 Table 19                           |
| Soil chemistry                   | Soil Health Card (pH, EC, OC, N, P, K, S, Zn, B), typed or read from a photo                                                                                               |
| Soil moisture at sowing          | Observed root-zone moisture (Open-Meteo) when sowing falls in the forecast window; otherwise each ensemble year's NASA POWER root-zone wetness on the sowing date          |
| Crop parameters                  | 21-crop library ([`catalog.ts`](../src/domain/crops/catalog.ts)) from FAO-56, FAO-33, ICAR guides and MSP notifications                                                    |

## 2. Daily loop ([`engine.ts`](../src/domain/agro/engine.ts))

**Phenology.** Thermal time accrues as `max(0, min(Tmean, Topt_high) − Tbase)`. The crop matures at
`duration × (Tref − Tbase)` °C·days, where `Tref` sits 45% into the optimal band. This was
back-calculated from typical sowing→harvest dates (wheat in Lucknow, mustard in Jaipur, kharif rice in
eastern UP). Progress maps onto the four FAO-56 stages via each crop's stage fractions.

**Water balance (FAO-56 chapter 8).**

- Crop coefficient `Kc` follows the FAO-56 curve (ini → dev ramp → mid → late decline); `ETc = Kc·ET0`.
- Roots deepen from 0.15 m to the crop maximum through the initial and development stages; newly
  explored soil joins at the initial moisture state.
- `TAW = 1000(θFC − θWP)·Zr`, `RAW = p·TAW` with `p` adjusted for demand: `p + 0.04(5 − ETc)`.
- `Ks = (TAW − Dr) / ((1 − p)·TAW)` once depletion `Dr` exceeds RAW; `ETa = Ks·ETc`.
- Effective rain discounts drizzle (< 2 mm, half lost to interception) and storm runoff (> 50 mm).

**Irrigation policy** — what the farmer can actually do:

| Water access | Behaviour                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Rainfed      | Never irrigated                                                                                             |
| Limited      | Pre-sowing irrigation if the seedbed is dry, then at most 3 irrigations, only in development and mid stages |
| Assured      | Refill to field capacity whenever depletion reaches RAW                                                     |

Irrigation is skipped near maturity and on days with ≥ 10 mm rain. Gross water =
`max(net / efficiency, minimum application)` with efficiencies 0.60 / 0.75 / 0.90 and minimum depths
of 50 / 25 / 0 mm for flood / sprinkler / drip. The minimum depth matters: without it,
shallow-rooted crops such as potato look water-efficient under flood irrigation, which they are not.

**Stress.** Heat degree-days above the crop's threshold during flowering (and grain filling for
cereals), and cold degree-days below its frost threshold during development and flowering.

## 3. Yield

`Y = Ypot × Fwater × Ftemperature × Fheat × Fcold × Fsoil × Fmaturity`

- `Fwater = 1 − Ky · Σ w_stage (1 − ETa/ETc)` with stage weights 0.10 / 0.25 / 0.45 / 0.20 (FAO-33).
- `Ftemperature` — trapezoid on the mean temperature of the development and mid stages; this is what
  makes an out-of-season crop fail (wheat in the monsoon, rice in a north-Indian winter).
- `Fheat = 1 − min(0.6, 0.015 × heat degree-days)`; `Fcold = 1 − min(0.5, 0.03 × cold degree-days)`.
- `Fsoil` — pH outside the crop's range (−12% per unit) and EC above its salinity tolerance (−15% per dS/m).
- `Fmaturity` — `progress²` if the crop cannot mature within 1.4× its nominal duration.

## 4. Money and risk ([`economics.ts`](../src/domain/agro/economics.ts), [`ensemble.ts`](../src/domain/agro/ensemble.ts))

- Revenue = yield (q/acre) × price + straw/stover value scaled by yield. Prices are the MSP for KMS
  2026-27 and RMS 2027-28 where notified; vegetables use an indicative mandi price.
- Cost = indicative A2+FL cost of cultivation + pumping cost of the simulated gross irrigation
  (₹4/m³) + fertiliser corrections when the Soil Health Card rates N, P or S as low.
- **Uncertainty.** Each weather year is combined with three price scenarios (P10, P50 and P90 of a
  distribution with the crop's realised-price volatility: 0.08 for MSP-procured wheat and rice, 0.15
  for other MSP crops, 0.45–0.55 for vegetables). Profit percentiles and the probability of loss come
  from these samples.
- **Risk score (0–100)** = 40 × P(loss) + 30 × min(1, yield CV / 0.4) + 15 × P(dry spell ≥ 14 days)
  - 15 × P(heat or cold damage) + 40 × P(not maturing).
- **Verdict.** _Recommended_ only if the crop matures, profits in a typical year, breaks even in a bad
  year (P10 ≥ 0) and has risk < 45. Otherwise _caution_, or _not advised_ when it loses money in a
  typical year, cannot mature, or reaches < 35% of potential.
- The trace shown to farmers is the median-yield ensemble member, so the animation and the headline
  numbers always agree.

## 5. Regenerative score ([`regenerative.ts`](../src/domain/agro/regenerative.ts))

A transparent 100-point score: water stewardship (30, falls to 0 at 600 mm pumped), soil nitrogen
(20 for legumes), rotation against the previous crop (20), residue management (10, penalising crops
whose residue is commonly burnt) and climate resilience (20, highest for millets and pulses). Each
factor ships with a sentence explaining its points.

## 6. Ranking ([`recommend.ts`](../src/domain/agro/recommend.ts))

Candidates are crops whose sowing window is within 15 days of the date (vegetables only when the farmer
can sell them nearby, because they are market-limited). Each is scored on normalised typical profit,
bad-year profit, irrigation, regenerative score and stability, with weights set by the farmer's priority
(balanced, profit, least risk, save water, soil health). Crops that are not advised are down-weighted
so they never outrank a viable one.

## 7. Validation in the test suite

- FAO-56 Example 8 (extraterrestrial radiation, 32.2 MJ m⁻² day⁻¹) and Example 18 (Penman-Monteith
  ET0, 3.9 mm day⁻¹) are reproduced ([`et0.test.ts`](../src/domain/agro/et0.test.ts)).
- Behavioural tests: warm seasons shorten the crop; rainfed crops show dry spells and lower yield;
  drip needs less gross water than flood for the same net water; terminal heat cuts wheat yield;
  out-of-season crops fail; limited water caps irrigations; daily values stay inside the contract.
- Every crop in the catalogue is validated against the published model schema (stage fractions sum
  to 1, cardinal temperatures ordered, sensible ranges).
- The national outlook ([`data/outlook/rabi.json`](../data/outlook/rabi.json)) acts as a regional sanity
  check: mustard, chickpea and lentil lead in the north and centre, rabi sunflower and chickpea in the
  Deccan, barley in the Himalayan district.

## 8. Limitations and next steps

- **Calibration.** Parameters are national defaults. District calibration of potential yields and
  durations against KVK and ICAR-AICRP trial data is the intended use of the model registry.
- **Paddy.** Ponded-water hydrology (puddling, percolation) is approximated by a low depletion fraction.
- **Nutrients.** Soil nutrients adjust costs and advice, not a nutrient-limited yield.
- **Pests and diseases.** Weather-favourability windows, not population dynamics.
- **Prices.** MSP is not the realised price everywhere; live Agmarknet prices would sharpen the economics.
