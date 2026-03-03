"""BESS investment model (CZ 2026) with CAPEX, OPEX, FCR, and arbitrage."""

from __future__ import annotations

import numpy as np
import pandas as pd
import numpy_financial as npf


# =========================
# Editable input parameters
# =========================

# Technical parameters
battery_capacity_mwh = 2.0
power_mw = 2.0
roundtrip_efficiency = 0.88
annual_degradation = 0.02
project_lifetime_years = 10

# CAPEX
battery_cost_per_mwh = 6_000_000
pcs_cost_per_mw = 2_000_000
grid_connection_cost = 4_000_000
ems_cost = 1_500_000
engineering_cost = 1_500_000
construction_cost = 2_000_000
fire_safety_cost = 1_000_000

# OPEX
opex_percent_of_capex = 0.025

# FCR parameters
fcr_price_per_mw_per_month = 150_000
fcr_reserved_mw = 1.0
aggregator_fee_percent = 0.20

# Arbitrage parameters
cycles_per_year = 280
avg_spread_czk_per_mwh = 500

# Discount rate
discount_rate = 0.08

# Optional: annual FCR price decline (e.g., 0.03 = -3%/year)
fcr_price_decline_rate = 0.0


# =========================
# Model functions
# =========================

def compute_capex() -> float:
    """Compute total CAPEX from cost structure."""
    battery_modules = battery_capacity_mwh * battery_cost_per_mwh
    pcs = power_mw * pcs_cost_per_mw
    fixed_costs = (
        grid_connection_cost
        + ems_cost
        + engineering_cost
        + construction_cost
        + fire_safety_cost
    )
    return float(battery_modules + pcs + fixed_costs)


def annual_fcr_revenue(year_index: int, price_per_mw_per_month: float) -> tuple[float, float]:
    """Return gross and net FCR revenue for a given year index."""
    price = price_per_mw_per_month * ((1 - fcr_price_decline_rate) ** year_index)
    gross = fcr_reserved_mw * 12 * price
    net = gross * (1 - aggregator_fee_percent)
    return float(gross), float(net)


def annual_arbitrage_revenue(year_index: int) -> float:
    """Return arbitrage revenue, reduced by degradation and efficiency."""
    effective_capacity = battery_capacity_mwh * ((1 - annual_degradation) ** year_index)
    energy_throughput_mwh = effective_capacity * cycles_per_year
    revenue = energy_throughput_mwh * avg_spread_czk_per_mwh * roundtrip_efficiency
    return float(revenue)


def build_cashflows(
    capex: float,
    fcr_price: float,
    spread: float,
    capex_multiplier: float = 1.0,
) -> dict:
    """Build yearly cashflows and metrics for a scenario."""
    total_capex = capex * capex_multiplier
    annual_opex = total_capex * opex_percent_of_capex

    years = np.arange(1, project_lifetime_years + 1)
    cashflows = []
    gross_fcr_list = []
    net_fcr_list = []
    arbitrage_list = []
    opex_list = []

    for year_idx in range(project_lifetime_years):
        gross_fcr, net_fcr = annual_fcr_revenue(year_idx, fcr_price)
        arb = annual_arbitrage_revenue(year_idx)
        opex = annual_opex
        net_cf = net_fcr + arb - opex

        gross_fcr_list.append(gross_fcr)
        net_fcr_list.append(net_fcr)
        arbitrage_list.append(arb)
        opex_list.append(opex)
        cashflows.append(net_cf)

    cashflows = np.array(cashflows, dtype=float)

    # Simple payback: CAPEX / year-1 net cashflow
    year1_cf = cashflows[0]
    simple_payback = total_capex / year1_cf if year1_cf > 0 else np.inf

    # NPV and IRR
    npv = npf.npv(discount_rate, [-total_capex, *cashflows])
    irr = npf.irr([-total_capex, *cashflows]) * 100

    table = pd.DataFrame({
        "Year": years,
        "Gross FCR (CZK)": gross_fcr_list,
        "Net FCR (CZK)": net_fcr_list,
        "Arbitrage (CZK)": arbitrage_list,
        "OPEX (CZK)": opex_list,
        "Net Cashflow (CZK)": cashflows,
    })

    return {
        "total_capex": total_capex,
        "annual_opex": annual_opex,
        "cashflows": cashflows,
        "simple_payback": simple_payback,
        "npv": npv,
        "irr": irr,
        "table": table,
    }


def run_sensitivity(base_capex: float, base_fcr_price: float, base_spread: float) -> pd.DataFrame:
    """Run a simple IRR sensitivity for CAPEX, FCR price, and spread ±20%."""
    scenarios = []

    for label, multiplier in [("-20%", 0.8), ("Base", 1.0), ("+20%", 1.2)]:
        result = build_cashflows(base_capex, base_fcr_price, base_spread, capex_multiplier=multiplier)
        scenarios.append({"Scenario": f"CAPEX {label}", "IRR (%)": result["irr"]})

    for label, multiplier in [("-20%", 0.8), ("Base", 1.0), ("+20%", 1.2)]:
        result = build_cashflows(base_capex, base_fcr_price * multiplier, base_spread)
        scenarios.append({"Scenario": f"FCR price {label}", "IRR (%)": result["irr"]})

    for label, multiplier in [("-20%", 0.8), ("Base", 1.0), ("+20%", 1.2)]:
        result = build_cashflows(base_capex, base_fcr_price, base_spread * multiplier)
        scenarios.append({"Scenario": f"Spread {label}", "IRR (%)": result["irr"]})

    return pd.DataFrame(scenarios)


# =========================
# Main execution
# =========================

if __name__ == "__main__":
    base_capex = compute_capex()
    result = build_cashflows(base_capex, fcr_price_per_mw_per_month, avg_spread_czk_per_mwh)

    print("=== BESS Investment Model (CZ 2026) ===")
    print(f"Total CAPEX: {result['total_capex']:,.0f} CZK")
    print(f"Year 1 net cashflow: {result['cashflows'][0]:,.0f} CZK")
    print(f"Simple payback: {result['simple_payback']:.2f} years")
    print(f"IRR: {result['irr']:.2f} %")
    print(f"NPV: {result['npv']:,.0f} CZK")
    print("\n--- Cashflow table ---")
    print(result["table"].to_string(index=False))

    print("\n--- Sensitivity (IRR) ---")
    sensitivity = run_sensitivity(base_capex, fcr_price_per_mw_per_month, avg_spread_czk_per_mwh)
    print(sensitivity.to_string(index=False))
